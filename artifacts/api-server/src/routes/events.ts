import { Router, type IRouter } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db, eventsTable, registrationsTable, activityLogTable } from "@workspace/db";
import { randomUUID } from "crypto";
import {
  ListEventsQueryParams,
  CreateEventBody,
  GetEventParams,
  UpdateEventParams,
  UpdateEventBody,
  DeleteEventParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const eventCountSelect = {
  id: eventsTable.id,
  title: eventsTable.title,
  description: eventsTable.description,
  category: eventsTable.category,
  date: eventsTable.date,
  location: eventsTable.location,
  capacity: eventsTable.capacity,
  status: eventsTable.status,
  difficulty: eventsTable.difficulty,
  distance: eventsTable.distance,
  imageUrl: eventsTable.imageUrl,
  meetingPoint: eventsTable.meetingPoint,
  guidelines: eventsTable.guidelines,
  pointsValue: eventsTable.pointsValue,
  registrationToken: eventsTable.registrationToken,
  photoToken: eventsTable.photoToken,
  photoUrl: eventsTable.photoUrl,
  eventTypeId: eventsTable.eventTypeId,
  createdAt: eventsTable.createdAt,
  registrationCount: sql<number>`(
    SELECT COUNT(*) FROM registrations r
    WHERE r.event_id = events.id
    AND r.status::text = 'confirmed'
  )::int`,
};

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.category) {
    conditions.push(eq(eventsTable.category, query.data.category as "cycling" | "hiking" | "summer-night" | "walking"));
  }
  if (query.data.upcoming) {
    conditions.push(gte(eventsTable.date, new Date()));
  }

  const events = await db
    .select(eventCountSelect)
    .from(eventsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(eventsTable.date));

  res.json(events);
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      ...parsed.data,
      date: new Date(parsed.data.date),
      registrationToken: randomUUID(),
      photoToken: randomUUID(),
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "event_created",
    description: `New event "${event.title}" was created`,
    eventTitle: event.title,
    eventId: event.id,
  });

  res.status(201).json({ ...event, registrationCount: 0 });
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db
    .select(eventCountSelect)
    .from(eventsTable)
    .where(eq(eventsTable.id, params.data.id));

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(event);
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.date) {
    updateData.date = new Date(parsed.data.date);
  }

  const [event] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [regCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(registrationsTable)
    .where(and(eq(registrationsTable.eventId, event.id), eq(registrationsTable.status, "confirmed")));

  res.json({ ...event, registrationCount: regCount?.count ?? 0 });
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db
    .delete(eventsTable)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/events/:id/export", async (req, res): Promise<void> => {
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

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="event-${eventId}-registrations.csv"`);
  res.send(csv);
});

export default router;
