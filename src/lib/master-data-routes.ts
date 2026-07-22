import { NextResponse } from "next/server";
import { z } from "zod";

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
    const row = await delegate.create({ data: parsed.data });
    return NextResponse.json({ data: row }, { status: 201 });
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
    const row = await delegate.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ data: row });
  }

  return { PATCH };
}
