"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download, Eye, PenLine, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  statusBadgeVariant,
  type ApplicationStatusValue,
} from "../status";

type ApplicationListItem = {
  id: string;
  applicationNumber: string;
  verificationType: string;
  applicationCategory: string;
  companyName: string;
  status: ApplicationStatusValue;
  createdAt: string;
};

const PAGE_SIZE = 10;

export function CompanyApplicationTable() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ApplicationStatusValue | "ALL">("ALL");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "applications", { q, status, sort, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "ALL") params.set("status", status);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const response = await fetch(`/api/company-workspace/applications?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data permohonan");
      return (await response.json()) as {
        data: ApplicationListItem[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/company-workspace/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menarik permohonan");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Permohonan berhasil ditarik.");
      queryClient.invalidateQueries({ queryKey: ["company-workspace", "applications"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menarik permohonan");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/company-workspace/applications/${id}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menduplikasi permohonan");
      }
      return response.json() as Promise<{ id: string; applicationNumber: string }>;
    },
    onSuccess: (result) => {
      toast.success(`Draft baru dibuat: ${result.applicationNumber}`);
      queryClient.invalidateQueries({ queryKey: ["company-workspace", "applications"] });
      router.push(`/company-workspace/applications/${result.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menduplikasi permohonan");
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Application List</h1>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh permohonan verifikasi perusahaan Anda.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/company-workspace/applications/new" />}>
          + New Application
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari nomor aplikasi, tipe, atau nama perusahaan..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus((value as ApplicationStatusValue | "ALL") ?? "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue>
              {(value: string | null) =>
                value && value !== "ALL"
                  ? STATUS_LABELS[value as ApplicationStatusValue]
                  : "Semua Status"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            {APPLICATION_STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                {STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => setSort((value as "newest" | "oldest") ?? "newest")}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string | null) => (value === "oldest" ? "Terlama" : "Terbaru")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Terbaru</SelectItem>
            <SelectItem value="oldest">Terlama</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Aplikasi</TableHead>
              <TableHead>Perusahaan</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-destructive">
                  Gagal memuat data permohonan.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Belum ada permohonan yang sesuai.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((application) => {
              const isTerminal = TERMINAL_STATUSES.includes(application.status);
              const isDraft = application.status === "DRAFT";
              return (
                <TableRow key={application.id}>
                  <TableCell className="font-mono text-xs">
                    {application.applicationNumber}
                  </TableCell>
                  <TableCell className="font-medium">{application.companyName}</TableCell>
                  <TableCell>{application.verificationType}</TableCell>
                  <TableCell>{application.applicationCategory}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(application.status)}>
                      {STATUS_LABELS[application.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(application.createdAt).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={isDraft ? "Continue Draft" : "View"}
                        nativeButton={false}
                        render={<Link href={`/company-workspace/applications/${application.id}`} />}
                      >
                        {isDraft ? <PenLine className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Duplicate"
                        disabled={duplicateMutation.isPending}
                        onClick={() => duplicateMutation.mutate(application.id)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Withdraw"
                        disabled={isTerminal || withdrawMutation.isPending}
                        onClick={() => {
                          if (confirm(`Tarik permohonan ${application.applicationNumber}?`)) {
                            withdrawMutation.mutate(application.id);
                          }
                        }}
                      >
                        <Undo2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Download Report — Segera hadir"
                        onClick={() => toast.info("Download Report akan tersedia di iterasi berikutnya.")}
                      >
                        <Download className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page} dari {totalPages} ({total} permohonan)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
