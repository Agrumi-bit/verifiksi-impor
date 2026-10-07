import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { requireAdminSession } from "@/lib/require-admin-session";

function uniqueConstraintMessage(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "data");
  return `Data dengan ${fields} yang sama sudah terdaftar.`;
}

/**
 * Every master data entity (Unit of Measurement, Commodity Group/Sub Group,
 * KBLI, HS Code) is a flat CRUD resource with the same list/create/update
 * shape. Prisma's per-model delegates aren't structurally interchangeable in
 * TypeScript, so this factory narrows to the minimal shared surface instead
 * of chasing full type safety across five distinct model types.
 */
type MasterDataDelegate = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany: (args: { orderBy: { createdAt: "desc" } } & any) => Promise<unknown[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (args: { data: any }) => Promise<unknown>;
  update: (args: {
    where: { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  }) => Promise<unknown>;
  delete?: (args: { where: { id: string } }) => Promise<unknown>;
};

export function createMasterDataListRoute(
  delegate: MasterDataDelegate,
  createSchema: z.ZodObject<z.ZodRawShape>,
  listArgs?: Record<string, unknown>,
) {
  async function GET() {
    const rows = await delegate.findMany({
      orderBy: { createdAt: "desc" },
      ...listArgs,
    });
    return NextResponse.json({ data: rows });
  }

  async function POST(request: Request) {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    try {
      const row = await delegate.create({ data: parsed.data });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const message = uniqueConstraintMessage(error);
      if (message) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw error;
    }
  }

  return { GET, POST };
}

type DetailRouteOptions = {
  /** Enables DELETE. Returns a user-facing reason when the row is still referenced (so it is
   * refused with 409 instead of orphaning/erroring), or null when it is safe to delete. */
  dependents?: (id: string) => Promise<string | null>;
};

export function createMasterDataDetailRoute(
  delegate: MasterDataDelegate,
  updateSchema: z.ZodObject<z.ZodRawShape>,
  options?: DetailRouteOptions,
) {
  async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    try {
      const row = await delegate.update({ where: { id }, data: parsed.data });
      return NextResponse.json({ data: row });
    } catch (error) {
      const message = uniqueConstraintMessage(error);
      if (message) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw error;
    }
  }

  async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    if (!options?.dependents || !delegate.delete) {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }
    const { error: authError } = await requireAdminSession();
    if (authError) return authError;
    const { id } = await params;
    const blockedReason = await options.dependents(id);
    if (blockedReason) {
      return NextResponse.json({ error: blockedReason }, { status: 409 });
    }
    try {
      await delegate.delete({ where: { id } });
      return NextResponse.json({ data: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        if (error.code === "P2003") {
          return NextResponse.json(
            { error: "Data masih dipakai data lain dan tidak dapat dihapus. Nonaktifkan saja." },
            { status: 409 },
          );
        }
      }
      throw error;
    }
  }

  return { PATCH, DELETE };
}
