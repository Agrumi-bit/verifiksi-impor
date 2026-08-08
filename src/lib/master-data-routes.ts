import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";

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

export function createMasterDataDetailRoute(
  delegate: MasterDataDelegate,
  updateSchema: z.ZodObject<z.ZodRawShape>,
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

  return { PATCH };
}
