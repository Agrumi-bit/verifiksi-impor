import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  MITRA_TYPES,
  mitraIndustriSchema,
  mitraNonIndustriSchema,
} from "@/modules/mitra/schema";

const createMitraSchema = z.discriminatedUnion("type", [
  mitraIndustriSchema.extend({ type: z.literal("INDUSTRI") }),
  mitraNonIndustriSchema.extend({ type: z.literal("NON_INDUSTRI") }),
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const mitra = await db.mitra.findMany({
    where: type && MITRA_TYPES.includes(type as (typeof MITRA_TYPES)[number])
      ? { type: type as (typeof MITRA_TYPES)[number] }
      : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: mitra });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createMitraSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;

  const mitra = await db.mitra.create({
    data:
      values.type === "INDUSTRI"
        ? {
            type: values.type,
            name: values.name,
            nibNumber: values.nibNumber,
            nibDocumentPath: values.nibDocumentPath,
            address: values.address,
            city: values.city,
            province: values.province,
            contactName: values.contactName,
            contactPhone: values.contactPhone,
            contactEmail: values.contactEmail,
            lhvkiNumber: values.lhvkiNumber,
            lhvkiIssueDate: new Date(values.lhvkiIssueDate),
            lhvkiDocumentPath: values.lhvkiDocumentPath,
          }
        : {
            type: values.type,
            name: values.name,
            nibNumber: values.nibNumber,
            nibDocumentPath: values.nibDocumentPath,
            address: values.address,
            city: values.city,
            province: values.province,
            contactName: values.contactName,
            contactPhone: values.contactPhone,
            contactEmail: values.contactEmail,
            contractNumber: values.contractNumber,
            contractDate: new Date(values.contractDate),
            contractDocumentPath: values.contractDocumentPath,
          },
  });

  return NextResponse.json({ data: mitra }, { status: 201 });
}
