import { Router, type IRouter } from "express";
import { eq, or, ilike, and, desc, sql } from "drizzle-orm";
import {
  db, participantsTable, registrationsTable, eventsTable,
  activityLogTable, sponsorImpressionsTable, eventSponsorsTable,
  sponsorsTable,
} from "@workspace/db";

const router: IRouter = Router();

// ─── Admin participant management ────────────────────────────────────────────

router.get("/admin/participants", async (req, res): Promise<void> => {
  const { search, page, limit } = req.query as {
    search?: string; page?: string; limit?: string;
  };

  const pageNum = Math.max(1, parseInt(page ?? "1") || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "50") || 50));
  const offset = (pageNum - 1) * limitNum;

  const buildWhere = (pattern: string) =>
    or(
      ilike(participantsTable.name, pattern),
      ilike(participantsTable.email, pattern),
      ilike(participantsTable.phone, pattern),
    );

  let participants;
  let total;

  if (search) {
    const pattern = `%${search}%`;
    const where = buildWhere(pattern);
    participants = await db
      .select()
      .from(participantsTable)
      .where(where)
      .orderBy(desc(participantsTable.joinedAt))
      .limit(limitNum)
      .offset(offset);

    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(participantsTable)
      .where(where);
    total = countRow?.count ?? 0;
  } else {
    participants = await db
      .select()
      .from(participantsTable)
      .orderBy(desc(participantsTable.joinedAt))
      .limit(limitNum)
      .offset(offset);

    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(participantsTable);
    total = countRow?.count ?? 0;
  }

  res.json({ participants, total, page: pageNum, limit: limitNum });
});

// Static paths MUST come before /:phone to avoid being swallowed by the param route.

router.get("/admin/participants/search", async (req, res): Promise<void> => {
  const { q } = req.query as { q?: string };
  if (!q || !q.trim()) { res.json([]); return; }

  const pattern = `%${q.trim()}%`;
  const participants = await db
    .select()
    .from(participantsTable)
    .where(
      or(
        ilike(participantsTable.name, pattern),
        ilike(participantsTable.email, pattern),
        ilike(participantsTable.phone, pattern),
      )
    )
    .orderBy(desc(participantsTable.joinedAt))
    .limit(20);

  res.json(participants);
});

router.get("/admin/participants/export", async (req, res): Promise<void> => {
  const participants = await db
    .select()
    .from(participantsTable)
    .orderBy(desc(participantsTable.totalPoints));

  const header = [
    "ID", "Phone", "Name", "Email", "Total Points", "Total Events",
    "Referral Count", "Emergency Contact", "Emergency Phone", "Joined At",
  ].join(",");

  const rows = participants.map((p) => [
    p.id,
    p.phone ?? "",
    `"${(p.name ?? "").replace(/"/g, '""')}"`,
    `"${(p.email ?? "").replace(/"/g, '""')}"`,
    p.totalPoints,
    p.totalEvents,
    p.referralCount,
    `"${(p.emergencyContactName ?? "").replace(/"/g, '""')}"`,
    p.emergencyContactPhone ?? "",
    p.joinedAt.toISOString(),
  ].join(","));

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="participants.csv"`);
  res.send(csv);
});

router.post("/admin/participants", async (req, res): Promise<void> => {
  const { name, email, phone, emergencyContactName, emergencyContactPhone } = req.body as {
    name?: string; email?: string; phone?: string;
    emergencyContactName?: string; emergencyContactPhone?: string;
  };

  if (!name || !email) { res.status(400).json({ error: "name and email are required" }); return; }

  if (phone) {
    const [existing] = await db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.phone, phone));
    if (existing) { res.status(409).json({ error: "Phone already registered" }); return; }
  }

  const [participant] = await db
    .insert(participantsTable)
    .values({
      name,
      email,
      phone: phone ?? null,
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
    })
    .returning();

  res.status(201).json(participant);
});

router.get("/admin/participants/:phone", async (req, res): Promise<void> => {
  const phone = decodeURIComponent(req.params.phone);

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.phone, phone));

  if (!participant) { res.status(404).json({ error: "Participant not found" }); return; }

  const registrations = await db
    .select({
      id: registrationsTable.id,
      eventId: registrationsTable.eventId,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.date,
      status: registrationsTable.status,
      registeredAt: registrationsTable.registeredAt,
    })
    .from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(eq(registrationsTable.phone, phone))
    .orderBy(desc(eventsTable.date));

  res.json({ participant, registrations });
});

router.patch("/admin/participants/:phone", async (req, res): Promise<void> => {
  const phone = decodeURIComponent(req.params.phone);

  const { name, email, emergencyContactName, emergencyContactPhone, totalPoints } = req.body as {
    name?: string; email?: string; emergencyContactName?: string;
    emergencyContactPhone?: string; totalPoints?: number;
  };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (emergencyContactName !== undefined) updates.emergencyContactName = emergencyContactName;
  if (emergencyContactPhone !== undefined) updates.emergencyContactPhone = emergencyContactPhone;
  if (totalPoints !== undefined) updates.totalPoints = totalPoints;

  const [participant] = await db
    .update(participantsTable)
    .set(updates)
    .where(eq(participantsTable.phone, phone))
    .returning();

  if (!participant) { res.status(404).json({ error: "Participant not found" }); return; }
  res.json(participant);
});

router.patch("/admin/participants/:phone/phone", async (req, res): Promise<void> => {
  const oldPhone = decodeURIComponent(req.params.phone);
  const { newPhone } = req.body as { newPhone?: string };

  if (!newPhone) { res.status(400).json({ error: "newPhone is required" }); return; }

  const [existing] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.phone, newPhone));
  if (existing) { res.status(409).json({ error: "Phone number already in use" }); return; }

  // Cascade phone change to all linked registrations before updating participant
  await db
    .update(registrationsTable)
    .set({ phone: newPhone })
    .where(eq(registrationsTable.phone, oldPhone));

  const [participant] = await db
    .update(participantsTable)
    .set({ phone: newPhone })
    .where(eq(participantsTable.phone, oldPhone))
    .returning();

  if (!participant) { res.status(404).json({ error: "Participant not found" }); return; }
  res.json(participant);
});

// ─── Admin: manually add participant to an event ─────────────────────────────
router.post("/admin/participants/:phone/registrations", async (req, res): Promise<void> => {
  const phone = decodeURIComponent(req.params.phone);
  const { eventId, status } = req.body as { eventId?: number; status?: string };

  if (!eventId) { res.status(400).json({ error: "eventId is required" }); return; }

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.phone, phone));
  if (!participant) { res.status(404).json({ error: "Participant not found" }); return; }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const [registration] = await db
    .insert(registrationsTable)
    .values({
      eventId,
      name: participant.name,
      email: participant.email,
      phone: participant.phone ?? undefined,
      status: (status ?? "confirmed") as "confirmed" | "pending" | "waitlist" | "cancelled",
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "registration",
    description: `Admin added ${participant.name} to "${event.title}"`,
    eventTitle: event.title,
    eventId: event.id,
    actorType: "admin",
  });

  res.status(201).json(registration);
});

// ─── Export: event registrations as CSV ───────────────────────────────────────
// Available at both /events/:id/export (canonical) and /admin/events/:id/export
router.get("/admin/events/:id/export", async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const registrations = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.eventId, eventId))
    .orderBy(registrationsTable.registeredAt);

  const header = [
    "ID", "Name", "Name (Arabic)", "Email", "Phone", "Country Code",
    "Nationality", "Status", "Has Medical Condition", "Medical Details",
    "Emergency Contact", "Emergency Phone", "Waiver Accepted", "Registered At",
  ].join(",");

  const rows = registrations.map((r) => [
    r.id,
    `"${(r.name ?? "").replace(/"/g, '""')}"`,
    `"${(r.fullNameAr ?? "").replace(/"/g, '""')}"`,
    `"${(r.email ?? "").replace(/"/g, '""')}"`,
    r.phone ?? "",
    r.phoneCountryCode ?? "+962",
    r.nationality ?? "",
    r.status,
    r.hasMedicalConditions ? "Yes" : "No",
    `"${(r.medicalDetails ?? "").replace(/"/g, '""')}"`,
    `"${(r.emergencyContactName ?? "").replace(/"/g, '""')}"`,
    r.emergencyContactPhone ?? "",
    r.waiverAcceptedAt ? r.waiverAcceptedAt.toISOString() : "",
    r.registeredAt.toISOString(),
  ].join(","));

  const csv = [header, ...rows].join("\n");
  const filename = `event-${eventId}-registrations.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

// ─── Sponsor analytics report export ─────────────────────────────────────────
router.get("/admin/sponsors/:id/export", async (req, res): Promise<void> => {
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

export default router;
