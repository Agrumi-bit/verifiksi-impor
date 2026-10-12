import "server-only";

import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/*
 * Prints a page of this app to PDF with headless Chromium, driven over the DevTools protocol
 * (Node's built-in WebSocket, no extra npm dependency). Used by "Unduh PDF" so the report
 * downloads directly instead of going through the browser's print dialog.
 *
 * The page is loaded from the app itself (http://127.0.0.1:$PORT) with the requesting user's
 * Cookie header, so it renders exactly what that user sees, with the print stylesheet applied.
 */

const CHROMIUM = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const TIMEOUT_MS = 120_000;

type Cdp = {
  send: <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>, sessionId?: string) => Promise<T>;
  close: () => void;
};

function connect(url: string): Promise<Cdp> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as { id?: number; result?: unknown; error?: { message: string } };
      if (msg.id === undefined) return;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    });
    ws.addEventListener("error", () => reject(new Error("DevTools connection failed")));
    ws.addEventListener("close", () => pending.forEach((p) => p.reject(new Error("DevTools connection closed"))));
    ws.addEventListener("open", () =>
      resolve({
        send: (method, params = {}, sessionId) =>
          new Promise((res, rej) => {
            const msgId = ++id;
            pending.set(msgId, { resolve: res as (v: unknown) => void, reject: rej });
            ws.send(JSON.stringify({ id: msgId, method, params, ...(sessionId ? { sessionId } : {}) }));
          }),
        close: () => ws.close(),
      }),
    );
  });
}

/** Starts Chromium and resolves with its browser DevTools WebSocket URL. */
function launch(userDataDir: string): Promise<{ proc: ChildProcess; wsUrl: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      CHROMIUM,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--no-first-run",
        "--hide-scrollbars",
        "--remote-debugging-port=0",
        `--user-data-dir=${userDataDir}`,
        "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, HOME: userDataDir } },
    );
    let log = "";
    const timer = setTimeout(() => reject(new Error(`Chromium did not start: ${log.slice(-500)}`)), 20_000);
    proc.stderr?.on("data", (chunk: Buffer) => {
      log += chunk.toString();
      const m = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ proc, wsUrl: m[1] });
      }
    });
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chromium exited (${code}): ${log.slice(-500)}`));
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One render at a time: each Chromium run takes a few hundred MB of memory on the VPS.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Loads `pagePath` of this app (with the given Cookie header), waits until `readySelector` exists,
 * fonts and images are loaded and the network is quiet, and returns the printed PDF.
 * Throws if `errorSelector` appears or the page is not ready in time.
 */
export function renderAppPageToPdf(pagePath: string, opts: { cookie: string; readySelector: string; errorText?: string }): Promise<Buffer> {
  const run = queue.then(() => render(pagePath, opts));
  queue = run.catch(() => undefined);
  return run;
}

async function render(pagePath: string, { cookie, readySelector, errorText }: { cookie: string; readySelector: string; errorText?: string }): Promise<Buffer> {
  const port = process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}${pagePath}`;
  const userDataDir = await mkdtemp(path.join(tmpdir(), "pdf-chromium-"));
  let proc: ChildProcess | undefined;
  let cdp: Cdp | undefined;
  try {
    const started = await launch(userDataDir);
    proc = started.proc;
    cdp = await connect(started.wsUrl);
    const { targetId } = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
    const send = <T = Record<string, unknown>>(m: string, p?: Record<string, unknown>) => cdp!.send<T>(m, p, sessionId);

    await send("Network.enable");
    await send("Network.setExtraHTTPHeaders", { headers: { Cookie: cookie } });
    await send("Page.enable");
    await send("Page.navigate", { url });

    const deadline = Date.now() + TIMEOUT_MS;
    const check = `(() => {
      if (${JSON.stringify(errorText ?? "")} && document.body && document.body.innerText.includes(${JSON.stringify(errorText ?? "")})) return "error";
      if (!document.querySelector(${JSON.stringify(readySelector)})) return "wait";
      if (document.fonts.status !== "loaded") return "wait";
      if ([...document.images].some((i) => !i.complete)) return "wait";
      return "ready";
    })()`;
    for (;;) {
      if (Date.now() > deadline) throw new Error("Laporan tidak selesai dimuat");
      const { result } = await send<{ result: { value?: string } }>("Runtime.evaluate", { expression: check, returnByValue: true });
      if (result.value === "error") throw new Error("Laporan gagal dimuat");
      if (result.value === "ready") break;
      await sleep(500);
    }
    await sleep(800); // charts settle (layout effects, late images)

    const { data } = await send<{ data: string }>("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      transferMode: "ReturnAsBase64",
    });
    return Buffer.from(data, "base64");
  } finally {
    try {
      cdp?.close();
    } catch {
      /* ignore */
    }
    proc?.kill("SIGKILL");
    await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
