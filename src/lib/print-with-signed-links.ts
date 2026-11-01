/**
 * "Cetak" for reports: before opening the print dialog, the page's document links (/api/files?path=…)
 * are swapped for signed public links (api/files/sign), so a PDF saved from the dialog opens its
 * documents without a login. If signing fails the page still prints, with the plain links.
 */
export async function printWithSignedLinks(): Promise<void> {
  const anchors = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/api/files?"]')];
  const hrefs = [...new Set(anchors.map((a) => a.getAttribute("href")).filter((h): h is string => Boolean(h)))];
  if (hrefs.length > 0) {
    try {
      const response = await fetch("/api/files/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hrefs }),
      });
      if (response.ok) {
        const { data } = (await response.json()) as { data: Record<string, string> };
        for (const a of anchors) {
          const signed = data[a.getAttribute("href") ?? ""];
          if (signed) a.setAttribute("href", signed);
        }
      }
    } catch {
      // network error: print with the plain links
    }
  }
  window.print();
}
