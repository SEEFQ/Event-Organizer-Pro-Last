import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, sponsorsTable, eventSponsorsTable, sponsorImpressionsTable, eventsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const sponsorStatsSelect = {
  id: sponsorsTable.id,
  name: sponsorsTable.name,
  type: sponsorsTable.type,
  website: sponsorsTable.website,
  instagram: sponsorsTable.instagram,
  facebook: sponsorsTable.facebook,
  logoUrl: sponsorsTable.logoUrl,
  description: sponsorsTable.description,
  discountCode: sponsorsTable.discountCode,
  scanToken: sponsorsTable.scanToken,
  createdAt: sponsorsTable.createdAt,
  pageViews: sql<number>`(
    SELECT COUNT(*) FROM sponsor_impressions si
    WHERE si.sponsor_id = sponsors.id
    AND si.page_type = 'registration'
  )::int`,
  registrationsFromPage: sql<number>`(
    SELECT COUNT(*) FROM sponsor_impressions si
    WHERE si.sponsor_id = sponsors.id
    AND si.page_type = 'registration_submitted'
  )::int`,
  approvedRegistrations: sql<number>`(
    SELECT COUNT(*) FROM sponsor_impressions si
    WHERE si.sponsor_id = sponsors.id
    AND si.page_type = 'registration_approved'
  )::int`,
  photoImpressions: sql<number>`(
    SELECT COUNT(*) FROM sponsor_impressions si
    WHERE si.sponsor_id = sponsors.id
    AND si.page_type = 'photo'
  )::int`,
  eventsCount: sql<number>`(
    SELECT COUNT(*) FROM event_sponsors es
    WHERE es.sponsor_id = sponsors.id
  )::int`,
};

function computeConversionRate(pageViews: number, approved: number): number {
  if (!pageViews) return 0;
  return Math.round((approved / pageViews) * 1000) / 10;
}

router.get("/sponsors", async (req, res): Promise<void> => {
  const rows = await db.select(sponsorStatsSelect).from(sponsorsTable);
  const sponsors = rows.map((s) => ({
    ...s,
    conversionRate: computeConversionRate(s.pageViews, s.approvedRegistrations),
  }));
  res.json(sponsors);
});

router.post("/sponsors", async (req, res): Promise<void> => {
  const { name, type, website, instagram, facebook, logoUrl, description, discountCode } = req.body;
  if (!name || !type) { res.status(400).json({ error: "name and type are required" }); return; }

  const [sponsor] = await db
    .insert(sponsorsTable)
    .values({ name, type, website: website ?? null, instagram: instagram ?? null, facebook: facebook ?? null, logoUrl: logoUrl ?? null, description: description ?? null, discountCode: discountCode ?? null, scanToken: randomUUID() })
    .returning();

  res.status(201).json(sponsor);
});

router.get("/sponsors/analytics", async (req, res): Promise<void> => {
  const sponsors = await db.select({ id: sponsorsTable.id, name: sponsorsTable.name, type: sponsorsTable.type }).from(sponsorsTable);

  const analytics = await Promise.all(
    sponsors.map(async (sp) => {
      const events = await db
        .select({ eventId: eventSponsorsTable.eventId, eventTitle: eventsTable.title })
        .from(eventSponsorsTable)
        .innerJoin(eventsTable, eq(eventSponsorsTable.eventId, eventsTable.id))
        .where(eq(eventSponsorsTable.sponsorId, sp.id));

      const byEvent = await Promise.all(
        events.map(async (ev) => {
          const [counts] = await db
            .select({
              pageViews: sql<number>`SUM(CASE WHEN page_type = 'registration' THEN 1 ELSE 0 END)::int`,
              registrationsFromPage: sql<number>`SUM(CASE WHEN page_type = 'registration_submitted' THEN 1 ELSE 0 END)::int`,
              approvedRegistrations: sql<number>`SUM(CASE WHEN page_type = 'registration_approved' THEN 1 ELSE 0 END)::int`,
            })
            .from(sponsorImpressionsTable)
            .where(
              sql`${sponsorImpressionsTable.sponsorId} = ${sp.id} AND ${sponsorImpressionsTable.eventId} = ${ev.eventId}`
            );
          const pv = counts?.pageViews ?? 0;
          const ar = counts?.approvedRegistrations ?? 0;
          return {
            eventId: ev.eventId,
            eventTitle: ev.eventTitle,
            pageViews: pv,
            registrationsFromPage: counts?.registrationsFromPage ?? 0,
            approvedRegistrations: ar,
            conversionRate: computeConversionRate(pv, ar),
          };
        })
      );

      const totalPageViews = byEvent.reduce((s, e) => s + e.pageViews, 0);
      const totalApproved = byEvent.reduce((s, e) => s + e.approvedRegistrations, 0);
      const totalFromPage = byEvent.reduce((s, e) => s + e.registrationsFromPage, 0);

      return {
        sponsorId: sp.id,
        sponsorName: sp.name,
        sponsorType: sp.type,
        pageViews: totalPageViews,
        registrationsFromPage: totalFromPage,
        approvedRegistrations: totalApproved,
        conversionRate: computeConversionRate(totalPageViews, totalApproved),
        byEvent,
      };
    })
  );

  res.json(analytics);
});

router.get("/sponsors/:id/report/export", async (req, res): Promise<void> => {
  const sponsorId = parseInt(req.params.id);
  if (isNaN(sponsorId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [sponsor] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.id, sponsorId));
  if (!sponsor) { res.status(404).json({ error: "Sponsor not found" }); return; }

  const impressions = await db
    .select({
      eventId: sponsorImpressionsTable.eventId,
      eventTitle: eventsTable.title,
      pageType: sponsorImpressionsTable.pageType,
      viewedAt: sponsorImpressionsTable.viewedAt,
    })
    .from(sponsorImpressionsTable)
    .leftJoin(eventsTable, eq(sponsorImpressionsTable.eventId, eventsTable.id))
    .where(eq(sponsorImpressionsTable.sponsorId, sponsorId))
    .orderBy(sponsorImpressionsTable.viewedAt);

  const header = ["Event ID", "Event Title", "Page Type", "Viewed At"].join(",");
  const rows = impressions.map((i) => [
    i.eventId,
    `"${(i.eventTitle ?? "").replace(/"/g, '""')}"`,
    i.pageType,
    i.viewedAt.toISOString(),
  ].join(","));

  const csv = [header, ...rows].join("\n");
  const filename = `sponsor-${sponsorId}-analytics.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.get("/sponsors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select(sponsorStatsSelect).from(sponsorsTable).where(eq(sponsorsTable.id, id));
  if (!row) { res.status(404).json({ error: "Sponsor not found" }); return; }

  res.json({ ...row, conversionRate: computeConversionRate(row.pageViews, row.approvedRegistrations) });
});

router.patch("/sponsors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, type, website, instagram, facebook, logoUrl, description, discountCode } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (website !== undefined) updates.website = website;
  if (instagram !== undefined) updates.instagram = instagram;
  if (facebook !== undefined) updates.facebook = facebook;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl;
  if (description !== undefined) updates.description = description;
  if (discountCode !== undefined) updates.discountCode = discountCode;

  const [sponsor] = await db.update(sponsorsTable).set(updates).where(eq(sponsorsTable.id, id)).returning();
  if (!sponsor) { res.status(404).json({ error: "Sponsor not found" }); return; }
  res.json(sponsor);
});

router.delete("/sponsors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(sponsorsTable).where(eq(sponsorsTable.id, id));
  res.sendStatus(204);
});

router.get("/events/:id/sponsors", async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select({ sponsor: sponsorsTable })
    .from(eventSponsorsTable)
    .innerJoin(sponsorsTable, eq(eventSponsorsTable.sponsorId, sponsorsTable.id))
    .where(eq(eventSponsorsTable.eventId, eventId));

  res.json(rows.map((r) => r.sponsor));
});

router.post("/events/:id/sponsors", async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const sponsorId = parseInt(req.body.sponsorId);
  if (isNaN(sponsorId)) { res.status(400).json({ error: "sponsorId is required" }); return; }

  await db.insert(eventSponsorsTable).values({ eventId, sponsorId }).onConflictDoNothing();
  res.sendStatus(201);
});

router.delete("/events/:id/sponsors/:sponsorId", async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id);
  const sponsorId = parseInt(req.params.sponsorId);
  if (isNaN(eventId) || isNaN(sponsorId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .delete(eventSponsorsTable)
    .where(
      sql`${eventSponsorsTable.eventId} = ${eventId} AND ${eventSponsorsTable.sponsorId} = ${sponsorId}`
    );
  res.sendStatus(204);
});

export default router;
