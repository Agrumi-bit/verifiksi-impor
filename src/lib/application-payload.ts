import { db } from "@/lib/db";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

/**
 * Every workspace's mutation routes read `Application.payload` (one JSON blob covering
 * products/machines/rawMaterials/etc.), apply an in-memory change, and write the whole payload
 * back. Two concurrent requests against the same application — e.g. saving two different
 * machines' data within milliseconds of each other, or a drag-reorder racing a field edit —
 * each read their own snapshot before either write commits: the second write to finish silently
 * discards whatever the first one changed, since it overwrites the full payload from its own
 * stale read. This is the "sometimes my save just isn't there, have to re-enter it" bug class.
 *
 * `SELECT ... FOR UPDATE` inside a transaction serializes concurrent writers on the same
 * application row: the second transaction blocks on the lock until the first commits, then
 * re-reads the already-updated payload before applying its own change on top of it — no writes
 * are lost, no matter how close together the requests land.
 */
export async function updateApplicationPayload<T>(
  applicationId: string,
  mutate: (payload: ApplicationWizardValues) => { payload: ApplicationWizardValues; result: T },
): Promise<T> {
  return db.$transaction(async (tx) => {
    // Lock the row and read its payload in one round-trip (was a separate `SELECT ... FOR
    // UPDATE` + `findUniqueOrThrow` before — same guarantee, one fewer query per save).
    const rows = await tx.$queryRaw<{ payload: ApplicationWizardValues }[]>`
      SELECT payload FROM application WHERE id = ${applicationId} FOR UPDATE
    `;
    if (rows.length === 0) {
      throw new Error(`Application ${applicationId} not found`);
    }
    const { payload, result } = mutate(rows[0].payload);
    await tx.application.update({ where: { id: applicationId }, data: { payload } });
    return result;
  });
}
