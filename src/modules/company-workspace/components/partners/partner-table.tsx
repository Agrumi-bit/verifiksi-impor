"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PARTNER_TYPE_LABELS, PARTNER_STATUS_LABELS, type PartnerType, type PartnerStatus } from "@/modules/partner/schema";

type PartnerListItem = {
  id: string;
  type: PartnerType;
  status: PartnerStatus;
  contractNumber: string;
  contractEndDate: string;
  company: { companyName: string; apiType: string | null };
  /** True when this company registered the partner itself; false when admin related this
   * company to a partner it created — those show up here but can only be removed by admin. */
  isOwner: boolean;
};

export function CompanyPartnerTable() {
  const queryClient = useQueryClient();
  const queryKey = ["company-workspace", "partners"];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch("/api/company-workspace/partners");
      if (!response.ok) throw new Error("Gagal memuat data partner");
      const json = (await response.json()) as { data: PartnerListItem[] };
      return json.data;
    },
  });

  async function handleDelete(id: string, companyName: string) {
    if (!window.confirm(`Hapus partner "${companyName}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const response = await fetch(`/api/company-workspace/partners/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Gagal menghapus partner");
      return;
    }
    toast.success("Partner dihapus.");
    queryClient.invalidateQueries({ queryKey });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Partner Companies</h1>
          <p className="text-sm text-muted-foreground">
            Kelola mitra industri dan non industri milik perusahaan Anda.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/company-workspace/supporting/partners/new" />}>
          + Tambah Partner
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Perusahaan</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Nomor Kontrak</TableHead>
              <TableHead>Berakhir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">
                  Gagal memuat data partner.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada partner terdaftar. Klik &quot;+ Tambah Partner&quot; untuk menambahkan.
                </TableCell>
              </TableRow>
            )}
            {data?.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">
                  <Link href={`/company-workspace/supporting/partners/${partner.id}`} className="hover:underline">
                    {partner.company.companyName}
                  </Link>
                </TableCell>
                <TableCell>{PARTNER_TYPE_LABELS[partner.type]}</TableCell>
                <TableCell>{partner.contractNumber}</TableCell>
                <TableCell>{new Date(partner.contractEndDate).toLocaleDateString("id-ID")}</TableCell>
                <TableCell>
                  <Badge variant={partner.status === "ACTIVE" ? "default" : "secondary"}>
                    {PARTNER_STATUS_LABELS[partner.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {partner.isOwner ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(partner.id, partner.company.companyName)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Hapus partner"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground" title="Didaftarkan oleh admin">
                      Dari Admin
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
