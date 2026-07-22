import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationStatusValue } from "@/modules/company-workspace/status";
import { APPLICATION_STATUSES } from "@/modules/company-workspace/status";

export async function GET(request: Request) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;

  if (!companyId) {
    return NextResponse.json({ data: [], total: 0, page: 1, pageSize: 10 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const statusParam = searchParams.get("status");
  const status =
    statusParam && APPLICATION_STATUSES.includes(statusParam as ApplicationStatusValue)
      ? (statusParam as ApplicationStatusValue)
      : null;
  const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

  const applications = await db.application.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: sort },
  });

  const filtered = q
    ? applications.filter((application) => {
        const payload = application.payload as { companyName?: string } | null;
        return (
          application.applicationNumber.toLowerCase().includes(q) ||
          application.verificationType.toLowerCase().includes(q) ||
          (payload?.companyName ?? "").toLowerCase().includes(q)
        );
      })
    : applications;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const data = paged.map((application) => {
    const payload = application.payload as { companyName?: string } | null;
    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      verificationType: application.verificationType,
      applicationCategory: application.applicationCategory,
      companyName: payload?.companyName ?? "—",
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  });

  return NextResponse.json({ data, total, page, pageSize });
}
