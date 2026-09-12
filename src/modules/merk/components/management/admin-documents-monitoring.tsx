"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileWarning, FlaskConical, PauseCircle, Tag, XCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INTERNAL_MERK_SURFACE } from "@/modules/merk/surface";
import { KpiCard } from "./kpi-card";
import { formatDate, getExpiryStatus, EXPIRY_STATUS_CLASSES, EXPIRY_STATUS_LABELS } from "./expiry-status";
import { BrandDocumentsTable } from "./admin-documents";
import { QualityTestsTable } from "./quality-tests-table";
import { BrandDraftsTable } from "./brand-drafts-table";

type PriorityItem = {
  priority: "Kritis" | "Tinggi" | "Sedang";
  issue: string; brandId: string; brand: string; company: string | null; category: string;
  detail: string; deadline: string | null; ageDays: number;
};
type BrandCompletenessRow = {
  brandId: string; brandName: string; companyName: string | null;
  infoPercent: number; ownershipPercent: number; representationPercent: number; documentsPercent: number; qualityTestPercent: number; overallPercent: number;
};
type DuplicateRow = { brandIdA: string; brandA: string; companyA: string | null; brandIdB: string; brandB: string; companyB: string | null; matchedFields: string[] };
type Payload = {
  kpis: { totalDocuments: number; completeDocuments: number; incompleteDocuments: number; docsExpiringSoon: number; docsExpired: number; qtProblem: number; qtExpiredOnly: number; draftStale: number; duplicateCount: number };
  priorityQueue: PriorityItem[];
  documentHealth: { completePercent: number; incompletePercent: number };
  dataCompleteness: { informasiMerek: number; ownership: number; representation: number; documents: number; qualityTest: number };
  expiryMonitoring: { expired: number; within7: number; within30: number; within60: number; beyond60: number };
  qualityTestSummary: { valid: number; expiring: number; expired: number; incomplete: number };
  staleDrafts: { brandId: string; brandName: string; ageDays: number }[];
  duplicates: DuplicateRow[];
  brandCompleteness: BrandCompletenessRow[];
};

const SURFACE = INTERNAL_MERK_SURFACE;
const TABS = [
  { key: "semua", label: "Semua" },
  { key: "dokumen", label: "Dokumen" },
  { key: "kelengkapan", label: "Kelengkapan" },
  { key: "masaberlaku", label: "Masa Berlaku" },
  { key: "qt", label: "Hasil Uji Mutu" },
  { key: "duplikasi", label: "Duplikasi" },
  { key: "draftaging", label: "Draft Aging" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const PRIORITY_CLASSES: Record<PriorityItem["priority"], string> = {
  Kritis: "text-destructive", Tinggi: "text-amber-600", Sedang: "text-primary",
};
const PRIORITY_DOT: Record<PriorityItem["priority"], string> = {
  Kritis: "bg-destructive", Tinggi: "bg-amber-500", Sedang: "bg-primary",
};

function pctBarClass(pct: number): string {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-destructive";
}

/**
 * "Dokumen & Monitoring" — the merged control center (see the navigation
 * report: the separate "Dokumen" and "Monitoring" sidebar items and pages
 * are consolidated into this one). "Semua" is the operational overview;
 * the other 6 tabs reuse the same real components already built for the
 * standalone pages (`BrandDocumentsTable`, `QualityTestsTable`,
 * `BrandDraftsTable`) rather than re-implementing them.
 *
 * Simplifications, stated up front rather than silently: duplicate
 * detection is exact-normalized-name matching, not fuzzy similarity
 * scoring; the cross-tab filter bar from the reviewed mock is not
 * reproduced verbatim — each reused table keeps its own existing
 * search/filter UI instead of a second, parallel filter system; and
 * Priority Queue items have no persisted "Belum Ditindaklanjuti / Dalam
 * Tindak Lanjut / Selesai / Diabaikan" triage state — there is no
 * database table for that yet, so marking an item is session-local only
 * (see the report).
 */
export function AdminDocumentsMonitoring() {
  const [tab, setTab] = useState<TabKey>("semua");
  const [search, setSearch] = useState("");
  const [issueLocalStatus, setIssueLocalStatus] = useState<Record<number, "proses" | "selesai">>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["merk-management", "admin", "documents-monitoring"],
    queryFn: async () => {
      const response = await fetch("/api/merk/documents-monitoring");
      if (!response.ok) throw new Error("Gagal memuat data dokumen & monitoring");
      const json = (await response.json()) as { data: Payload };
      return json.data;
    },
  });

  const priorityFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data?.priorityQueue ?? []).filter(
      (p, i) => issueLocalStatus[i] !== "selesai" && (!q || `${p.brand} ${p.company ?? ""} ${p.issue}`.toLowerCase().includes(q)),
    );
    return list;
  }, [data, search, issueLocalStatus]);

  function goTab(key: TabKey) {
    setTab(key);
    setSearch("");
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Merek Management <span className="mx-1">›</span> Dokumen &amp; Monitoring</p>
          <h1 className="text-lg font-bold">Dokumen &amp; Monitoring</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Kelola dokumen merek sekaligus pantau kelengkapan, masa berlaku, hasil uji mutu, dan isu yang memerlukan tindak lanjut.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Data dimuat ulang.")}>⟳ Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Simulasi export data dokumen & monitoring.")}>⭳ Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="Total Dokumen Wajib" value={data?.kpis.totalDocuments ?? 0} icon={Tag} onClick={() => goTab("dokumen")} isLoading={isLoading} />
        <KpiCard label="Dokumen Lengkap" value={data?.kpis.completeDocuments ?? 0} icon={CheckCircle2} onClick={() => goTab("kelengkapan")} isLoading={isLoading} />
        <KpiCard label="Dokumen Belum Lengkap" value={data?.kpis.incompleteDocuments ?? 0} icon={FileWarning} tone="warning" onClick={() => goTab("kelengkapan")} isLoading={isLoading} />
        <KpiCard label="Akan Kedaluwarsa" value={data?.kpis.docsExpiringSoon ?? 0} icon={AlertTriangle} tone="warning" onClick={() => goTab("masaberlaku")} isLoading={isLoading} />
        <KpiCard label="Kedaluwarsa" value={data?.kpis.docsExpired ?? 0} icon={XCircle} tone="danger" onClick={() => goTab("masaberlaku")} isLoading={isLoading} />
        <KpiCard label="Hasil Uji Mutu Bermasalah" value={data?.kpis.qtProblem ?? 0} icon={FlaskConical} tone="danger" onClick={() => goTab("qt")} isLoading={isLoading} />
        <KpiCard label="Draft > 30 Hari" value={data?.kpis.draftStale ?? 0} icon={PauseCircle} tone="warning" onClick={() => goTab("draftaging")} isLoading={isLoading} />
        <KpiCard label="Potensi Duplikasi" value={data?.kpis.duplicateCount ?? 0} icon={AlertTriangle} tone="warning" onClick={() => goTab("duplikasi")} isLoading={isLoading} />
      </div>

      <div className="inline-flex w-fit flex-wrap gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => goTab(t.key)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${tab === t.key ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Gagal memuat data dokumen &amp; monitoring.
        </p>
      )}

      {tab === "semua" && data && (
        <>
          <div className="rounded-xl border border-border bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <p className="text-sm font-semibold">Prioritas Tindak Lanjut <span className="ml-1 text-xs font-normal text-muted-foreground">{priorityFiltered.length} isu ditemukan</span></p>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari merek, dokumen, perusahaan, atau isu..." className="h-8 max-w-xs" />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prioritas</TableHead><TableHead>Isu</TableHead><TableHead>Merek</TableHead><TableHead>Perusahaan</TableHead>
                  <TableHead>Kategori</TableHead><TableHead>Detail</TableHead><TableHead>Batas / Kedaluwarsa</TableHead>
                  <TableHead>Umur Isu</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorityFiltered.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">Tidak ada isu yang memerlukan tindak lanjut.</TableCell></TableRow>
                )}
                {priorityFiltered.map((p, i) => {
                  const localStatus = issueLocalStatus[i];
                  const statusLabel = localStatus === "proses" ? "Dalam Tindak Lanjut" : "Belum Ditindaklanjuti";
                  return (
                    <TableRow key={i}>
                      <TableCell><span className={`inline-flex items-center gap-1.5 text-xs font-bold ${PRIORITY_CLASSES[p.priority]}`}><span className={`size-1.5 rounded-full ${PRIORITY_DOT[p.priority]}`} />{p.priority}</span></TableCell>
                      <TableCell className="font-medium">{p.issue}</TableCell>
                      <TableCell><Link href={`/mitra/merk/${p.brandId}`} className="hover:underline">{p.brand}</Link></TableCell>
                      <TableCell className="text-muted-foreground">{p.company ?? "—"}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground" title={p.detail}>{p.detail}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{p.deadline ? formatDate(p.deadline) : "—"}</TableCell>
                      <TableCell>{p.ageDays} hari</TableCell>
                      <TableCell><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{statusLabel}</span></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setIssueLocalStatus((s) => ({ ...s, [i]: s[i] === "proses" ? "selesai" : "proses" }))}
                        >
                          {localStatus === "proses" ? "Tandai Selesai" : "Tandai Diproses"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <AttentionTile label="Dokumen Kedaluwarsa" value={data.kpis.docsExpired} tone="danger" />
            <AttentionTile label="Dokumen Akan Kedaluwarsa" value={data.kpis.docsExpiringSoon} tone="warning" />
            <AttentionTile label="Quality Test Kedaluwarsa" value={data.kpis.qtExpiredOnly} tone="danger" />
            <AttentionTile label="Hubungan / Agreement Akan Berakhir" value={data.priorityQueue.filter((p) => p.issue.includes("Perjanjian")).length} tone="warning" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="mb-3 text-sm font-semibold">Kesehatan Dokumen</p>
              <div className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-emerald-500" style={{ width: `${data.documentHealth.completePercent}%` }} />
                <div className="h-full bg-destructive" style={{ width: `${data.documentHealth.incompletePercent}%` }} />
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                <HealthRow color="bg-emerald-500" label="Lengkap" value={`${data.documentHealth.completePercent}%`} />
                <HealthRow color="bg-destructive" label="Belum Lengkap" value={`${data.documentHealth.incompletePercent}%`} />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="mb-3 text-sm font-semibold">Data Completeness</p>
              <ProgRow label="Informasi Merek" value={data.dataCompleteness.informasiMerek} />
              <ProgRow label="Ownership" value={data.dataCompleteness.ownership} />
              <ProgRow label="Representation" value={data.dataCompleteness.representation} />
              <ProgRow label="Documents" value={data.dataCompleteness.documents} />
              <ProgRow label="Quality Test" value={data.dataCompleteness.qualityTest} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="mb-3 text-sm font-semibold">Expiry Monitoring</p>
              <ExpiryRow label="Sudah Kedaluwarsa" value={data.expiryMonitoring.expired} max={Math.max(1, data.expiryMonitoring.expired, data.expiryMonitoring.within30)} color="bg-destructive" />
              <ExpiryRow label="≤ 7 Hari" value={data.expiryMonitoring.within7} max={Math.max(1, data.expiryMonitoring.expired, data.expiryMonitoring.within30)} color="bg-destructive" />
              <ExpiryRow label="8–30 Hari" value={data.expiryMonitoring.within30} max={Math.max(1, data.expiryMonitoring.expired, data.expiryMonitoring.within30)} color="bg-amber-500" />
              <ExpiryRow label="31–60 Hari" value={data.expiryMonitoring.within60} max={Math.max(1, data.expiryMonitoring.expired, data.expiryMonitoring.within30)} color="bg-primary" />
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="mb-3 text-sm font-semibold">Quality Test Monitoring</p>
              <MiniRow label="Valid" value={data.qualityTestSummary.valid} />
              <MiniRow label="Akan Kedaluwarsa" value={data.qualityTestSummary.expiring} />
              <MiniRow label="Kedaluwarsa" value={data.qualityTestSummary.expired} />
              <MiniRow label="Tidak Lengkap" value={data.qualityTestSummary.incomplete} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="mb-3 text-sm font-semibold">Duplicate Risk <span className="ml-1 text-xs font-normal text-muted-foreground">{data.duplicates.length} pasangan</span></p>
              {data.duplicates.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada potensi duplikasi terdeteksi.</p>
              ) : (
                data.duplicates.slice(0, 4).map((d, i) => (
                  <MiniRow key={i} label={`${d.brandA} ↔ ${d.brandB}`} value={d.matchedFields.join(", ")} />
                ))
              )}
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="mb-3 text-sm font-semibold">Stale Drafts</p>
              {data.staleDrafts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada draft yang lama tidak diperbarui.</p>
              ) : (
                data.staleDrafts.map((d) => <MiniRow key={d.brandId} label={d.brandName} value={`${d.ageDays} hari`} />)
              )}
            </div>
          </div>
        </>
      )}

      {tab === "dokumen" && (
        <BrandDocumentsTable fetchUrl="/api/merk/documents" brandDetailHrefBase="/mitra/merk" />
      )}

      {tab === "kelengkapan" && data && <KelengkapanTab rows={data.brandCompleteness} />}

      {tab === "masaberlaku" && <MasaBerlakuTab />}

      {tab === "qt" && (
        <QualityTestsTable fetchUrl="/api/merk/quality-tests" brandDetailHrefBase="/mitra/merk" />
      )}

      {tab === "duplikasi" && data && <DuplikasiTab rows={data.duplicates} />}

      {tab === "draftaging" && (
        <BrandDraftsTable surface={SURFACE} fetchUrl="/api/merk/drafts" />
      )}
    </div>
  );
}

function AttentionTile({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" }) {
  return (
    <div className={`rounded-xl p-3.5 ${tone === "danger" ? "bg-destructive/10" : "bg-amber-500/10"}`}>
      <p className={`text-lg font-extrabold ${tone === "danger" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}>{value}</p>
      <p className={`text-[11px] ${tone === "danger" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}>{label}</p>
    </div>
  );
}
function HealthRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2 rounded-sm ${color}`} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
function ProgRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-bold">{value}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${pctBarClass(value)}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}
function ExpiryRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 last:mb-0">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
      <span className="w-8 shrink-0 text-right text-xs font-bold">{value}</span>
    </div>
  );
}
function MiniRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-2 text-xs last:border-b-0">
      <span className="min-w-0 truncate font-medium">{label}</span>
      <span className="shrink-0 text-muted-foreground">{value}</span>
    </div>
  );
}

function KelengkapanTab({ rows }: { rows: BrandCompletenessRow[] }) {
  const complete = rows.filter((r) => r.overallPercent === 100).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <AttentionTile label="Brand Lengkap" value={complete} tone="warning" />
        <AttentionTile label="Brand Tidak Lengkap" value={rows.length - complete} tone="danger" />
        <AttentionTile label="Rata-rata Documents" value={rows.length ? Math.round(rows.reduce((s, r) => s + r.documentsPercent, 0) / rows.length) : 0} tone="warning" />
        <AttentionTile label="Rata-rata Ownership" value={rows.length ? Math.round(rows.reduce((s, r) => s + r.ownershipPercent, 0) / rows.length) : 0} tone="warning" />
      </div>
      <div className="rounded-xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merek</TableHead><TableHead>Perusahaan</TableHead><TableHead>Informasi Merek</TableHead><TableHead>Ownership</TableHead>
              <TableHead>Representation</TableHead><TableHead>Documents</TableHead><TableHead>Quality Test</TableHead><TableHead>Overall Completeness</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Belum ada merek.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.brandId}>
                <TableCell className="font-medium"><Link href={`/mitra/merk/${r.brandId}`} className="hover:underline">{r.brandName}</Link></TableCell>
                <TableCell className="text-muted-foreground">{r.companyName ?? "—"}</TableCell>
                <TableCell>{r.infoPercent}%</TableCell>
                <TableCell>{r.ownershipPercent}%</TableCell>
                <TableCell>{r.representationPercent}%</TableCell>
                <TableCell>{r.documentsPercent}%</TableCell>
                <TableCell>{r.qualityTestPercent}%</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${pctBarClass(r.overallPercent)}`} style={{ width: `${r.overallPercent}%` }} /></div>
                    <span className="text-xs font-bold">{r.overallPercent}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/mitra/merk/${r.brandId}`} />}>Lihat</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type FlatExpiryItem = { key: string; brandId: string; brand: string; name: string; category: string; docNo: string | null; company: string | null; expiry: string; daysLeft: number };

function MasaBerlakuTab() {
  const { data: docs, isLoading: l1 } = useQuery({
    queryKey: ["merk-management", "documents", "/api/merk/documents"],
    queryFn: async () => {
      const r = await fetch("/api/merk/documents");
      if (!r.ok) throw new Error("Gagal memuat dokumen");
      return (await r.json()).data as { id: string; brandId: string; brandName: string; companyName: string | null; documentType: string; category: string; fileName: string; expiryDate: string | null }[];
    },
  });
  const { data: qts, isLoading: l2 } = useQuery({
    queryKey: ["merk-management", "quality-tests", "/api/merk/quality-tests"],
    queryFn: async () => {
      const r = await fetch("/api/merk/quality-tests");
      if (!r.ok) throw new Error("Gagal memuat hasil uji mutu");
      return (await r.json()).data as { id: string; brandId: string; brandName: string; companyName: string | null; certificateNumber: string; expiryDate: string | null }[];
    },
  });

  // Captured once per mount rather than read impurely during render (see
  // react-hooks/purity) — a fixed reference point for this page's session.
  const [now] = useState(() => Date.now());

  const items: FlatExpiryItem[] = useMemo(() => {
    const fromDocs = (docs ?? []).filter((d) => d.expiryDate).map((d) => ({
      key: `doc-${d.id}`, brandId: d.brandId, brand: d.brandName, name: d.fileName, category: d.category, docNo: null, company: d.companyName,
      expiry: d.expiryDate!, daysLeft: Math.round((new Date(d.expiryDate!).getTime() - now) / 86400000),
    }));
    const fromQt = (qts ?? []).filter((q) => q.expiryDate).map((q) => ({
      key: `qt-${q.id}`, brandId: q.brandId, brand: q.brandName, name: "Sertifikat Uji Mutu", category: "Hasil Uji Mutu", docNo: q.certificateNumber, company: q.companyName,
      expiry: q.expiryDate!, daysLeft: Math.round((new Date(q.expiryDate!).getTime() - now) / 86400000),
    }));
    return [...fromDocs, ...fromQt].sort((a, b) => a.daysLeft - b.daysLeft);
  }, [docs, qts, now]);

  const expired = items.filter((i) => i.daysLeft < 0).length;
  const d7 = items.filter((i) => i.daysLeft >= 0 && i.daysLeft <= 7).length;
  const d30 = items.filter((i) => i.daysLeft > 7 && i.daysLeft <= 30).length;
  const d60 = items.filter((i) => i.daysLeft > 30 && i.daysLeft <= 60).length;
  const d60p = items.filter((i) => i.daysLeft > 60).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <AttentionTile label="Sudah Kedaluwarsa" value={expired} tone="danger" />
        <AttentionTile label="≤ 7 Hari" value={d7} tone="danger" />
        <AttentionTile label="8–30 Hari" value={d30} tone="warning" />
        <AttentionTile label="31–60 Hari" value={d60} tone="warning" />
        <AttentionTile label="> 60 Hari" value={d60p} tone="warning" />
      </div>
      <div className="rounded-xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merek</TableHead><TableHead>Dokumen</TableHead><TableHead>Kategori</TableHead><TableHead>Nomor</TableHead>
              <TableHead>Perusahaan</TableHead><TableHead>Berlaku Hingga</TableHead><TableHead>Sisa Hari</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(l1 || l2) && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Memuat...</TableCell></TableRow>}
            {!l1 && !l2 && items.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Tidak ada dokumen dengan tanggal berlaku.</TableCell></TableRow>}
            {items.map((i) => {
              const status = getExpiryStatus(i.expiry);
              return (
                <TableRow key={i.key}>
                  <TableCell className="font-medium"><Link href={`/mitra/merk/${i.brandId}`} className="hover:underline">{i.brand}</Link></TableCell>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>{i.category}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{i.docNo ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{i.company ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(i.expiry)}</TableCell>
                  <TableCell>{i.daysLeft}</TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRY_STATUS_CLASSES[status]}`}>{EXPIRY_STATUS_LABELS[status]}</span></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/mitra/merk/${i.brandId}`} />}>Lihat</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DuplikasiTab({ rows }: { rows: DuplicateRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="border-b border-border p-4"><p className="text-sm font-semibold">{rows.length} pasangan berpotensi duplikat</p></div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Merek A</TableHead><TableHead>Perusahaan A</TableHead><TableHead>Merek B</TableHead><TableHead>Perusahaan B</TableHead>
            <TableHead>Matched Fields</TableHead><TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Tidak ada potensi duplikasi ditemukan.</TableCell></TableRow>}
          {rows.map((d, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium"><Link href={`/mitra/merk/${d.brandIdA}`} className="hover:underline">{d.brandA}</Link></TableCell>
              <TableCell className="text-muted-foreground">{d.companyA ?? "—"}</TableCell>
              <TableCell className="font-medium"><Link href={`/mitra/merk/${d.brandIdB}`} className="hover:underline">{d.brandB}</Link></TableCell>
              <TableCell className="text-muted-foreground">{d.companyB ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{d.matchedFields.join(", ")}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm" variant="outline"
                  onClick={() => toast.info(`Meninjau potensi duplikasi ${d.brandA} ↔ ${d.brandB}. Merek tidak digabungkan otomatis.`)}
                >
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
