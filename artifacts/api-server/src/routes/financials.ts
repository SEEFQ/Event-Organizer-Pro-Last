import { Router, type IRouter } from "express";
import { eq, sum, sql } from "drizzle-orm";
import { db, eventFinancialsTable, eventsTable, registrationsTable } from "@workspace/db";

const router: IRouter = Router();

function computeNetRevenue(f: {
  totalCollected: number; referralDiscounts: number; manualDiscounts: number; promoDiscounts: number;
}) {
  return f.totalCollected - f.referralDiscounts - f.manualDiscounts - f.promoDiscounts;
}

router.get("/events/:id/financials", async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  let [financials] = await db
    .select()
    .from(eventFinancialsTable)
    .where(eq(eventFinancialsTable.eventId, eventId));

  if (!financials) {
    [financials] = await db
      .insert(eventFinancialsTable)
      .values({ eventId, pricePerPerson: 0, totalCollected: 0, referralDiscounts: 0, manualDiscounts: 0, promoDiscounts: 0 })
      .returning();
  }

  res.json({
    ...financials,
    netRevenue: computeNetRevenue(financials),
  });
});

router.patch("/events/:id/financials", async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { pricePerPerson, totalCollected, referralDiscounts, manualDiscounts, promoDiscounts, notes } = req.body as {
    pricePerPerson?: number; totalCollected?: number; referralDiscounts?: number;
    manualDiscounts?: number; promoDiscounts?: number; notes?: string;
  };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (pricePerPerson !== undefined) updates.pricePerPerson = pricePerPerson;
  if (totalCollected !== undefined) updates.totalCollected = totalCollected;
  if (referralDiscounts !== undefined) updates.referralDiscounts = referralDiscounts;
  if (manualDiscounts !== undefined) updates.manualDiscounts = manualDiscounts;
  if (promoDiscounts !== undefined) updates.promoDiscounts = promoDiscounts;
  if (notes !== undefined) updates.notes = notes;

  let [financials] = await db
    .update(eventFinancialsTable)
    .set(updates)
    .where(eq(eventFinancialsTable.eventId, eventId))
    .returning();

  if (!financials) {
    [financials] = await db
      .insert(eventFinancialsTable)
      .values({
        eventId,
        pricePerPerson: pricePerPerson ?? 0,
        totalCollected: totalCollected ?? 0,
        referralDiscounts: referralDiscounts ?? 0,
        manualDiscounts: manualDiscounts ?? 0,
        promoDiscounts: promoDiscounts ?? 0,
        notes: notes ?? null,
      })
      .returning();
  }

  res.json({
    ...financials,
    netRevenue: computeNetRevenue(financials),
  });
});

router.get("/events/:id/financials/export", async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const [financials] = await db
    .select()
    .from(eventFinancialsTable)
    .where(eq(eventFinancialsTable.eventId, eventId));

  const f = financials ?? { pricePerPerson: 0, totalCollected: 0, referralDiscounts: 0, manualDiscounts: 0, promoDiscounts: 0, notes: null };
  const netRevenue = computeNetRevenue(f as Parameters<typeof computeNetRevenue>[0]);

  const header = ["Event ID", "Event Title", "Price Per Person", "Total Collected", "Referral Discounts", "Manual Discounts", "Promo Discounts", "Net Revenue", "Notes"].join(",");
  const row = [
    eventId,
    `"${event.title.replace(/"/g, '""')}"`,
    f.pricePerPerson,
    f.totalCollected,
    f.referralDiscounts,
    f.manualDiscounts,
    f.promoDiscounts,
    netRevenue,
    `"${(f.notes ?? "").replace(/"/g, '""')}"`,
  ].join(",");

  const csv = [header, row].join("\n");
  const filename = `event-${eventId}-financials.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.get("/financials/summary", async (req, res): Promise<void> => {
  const allFinancials = await db.select().from(eventFinancialsTable);
  const totalCollected = allFinancials.reduce((s, f) => s + f.totalCollected, 0);
  const totalDiscounts = allFinancials.reduce(
    (s, f) => s + f.referralDiscounts + f.manualDiscounts + f.promoDiscounts, 0
  );
  const netRevenue = totalCollected - totalDiscounts;
  const eventCount = allFinancials.length;

  res.json({ totalCollected, totalDiscounts, netRevenue, eventCount });
});

export default router;
