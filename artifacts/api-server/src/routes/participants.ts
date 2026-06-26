import { Router, type IRouter } from "express";
import { desc, eq, or, ilike } from "drizzle-orm";
import { db, participantsTable, registrationsTable, eventsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/participants", async (req, res): Promise<void> => {
  const { search } = req.query as { search?: string };

  if (search) {
    const pattern = `%${search}%`;
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
      .orderBy(desc(participantsTable.totalPoints));
    res.json(participants);
    return;
  }

  const participants = await db
    .select()
    .from(participantsTable)
    .orderBy(desc(participantsTable.totalPoints));

  res.json(participants);
});

router.get("/participants/:phone/events", async (req, res): Promise<void> => {
  const phone = decodeURIComponent(req.params.phone);

  const rows = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      category: eventsTable.category,
      date: eventsTable.date,
      location: eventsTable.location,
      status: eventsTable.status,
      pointsValue: eventsTable.pointsValue,
      registrationStatus: registrationsTable.status,
      registeredAt: registrationsTable.registeredAt,
      referralToken: registrationsTable.referralToken,
      registrationToken: eventsTable.registrationToken,
    })
    .from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(eq(registrationsTable.phone, phone))
    .orderBy(desc(eventsTable.date));

  res.json(rows);
});

router.get("/participants/:phone", async (req, res): Promise<void> => {
  const phone = decodeURIComponent(req.params.phone);

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.phone, phone));

  if (!participant) { res.status(404).json({ error: "Participant not found" }); return; }
  res.json(participant);
});

router.patch("/participants/:phone", async (req, res): Promise<void> => {
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

router.patch("/participants/:phone/phone", async (req, res): Promise<void> => {
  const oldPhone = decodeURIComponent(req.params.phone);
  const { newPhone } = req.body as { newPhone?: string };

  if (!newPhone) { res.status(400).json({ error: "newPhone is required" }); return; }

  const [existing] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.phone, newPhone));
  if (existing) { res.status(409).json({ error: "Phone number already in use" }); return; }

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

export default router;
