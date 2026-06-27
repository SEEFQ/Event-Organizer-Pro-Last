import { Router, type IRouter } from "express";
import { eq, ne, and, sql, desc } from "drizzle-orm";
import {
  db, eventsTable, registrationsTable, activityLogTable, photosTable,
  participantsTable, eventSponsorsTable, sponsorsTable, sponsorImpressionsTable,
  participantEmailsTable, venueCheckinsTable,
} from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();

async function getEventByToken(column: "registrationToken" | "photoToken", value: string) {
  const col = column === "registrationToken" ? eventsTable.registrationToken : eventsTable.photoToken;
  const [result] = await db
    .select({
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
      createdAt: eventsTable.createdAt,
      registrationCount: sql<number>`(
        SELECT COUNT(*) FROM registrations r
        WHERE r.event_id = events.id
        AND r.status::text = 'confirmed'
      )::int`,
    })
    .from(eventsTable)
    .where(eq(col, value));
  return result ?? null;
}

async function getSponsorsForEvent(eventId: number) {
  const rows = await db
    .select({ sponsor: sponsorsTable })
    .from(eventSponsorsTable)
    .innerJoin(sponsorsTable, eq(eventSponsorsTable.sponsorId, sponsorsTable.id))
    .where(eq(eventSponsorsTable.eventId, eventId));
  return rows.map((r) => r.sponsor);
}

async function trackImpressions(eventId: number, pageType: string) {
  const links = await db
    .select({ sponsorId: eventSponsorsTable.sponsorId })
    .from(eventSponsorsTable)
    .where(eq(eventSponsorsTable.eventId, eventId));

  if (links.length > 0) {
    await db.insert(sponsorImpressionsTable).values(
      links.map((l) => ({ sponsorId: l.sponsorId, eventId, pageType }))
    );
  }
}

async function upsertParticipant(args: {
  phone?: string | null;
  email: string;
  name: string;
}) {
  const { phone, email, name } = args;

  if (phone) {
    const [byPhone] = await db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.phone, phone));

    if (byPhone) {
      await db
        .update(participantsTable)
        .set({ name, email })
        .where(eq(participantsTable.id, byPhone.id));
      await db
        .insert(participantEmailsTable)
        .values({ participantId: byPhone.id, email, isPrimary: false })
        .onConflictDoNothing();
      return byPhone.id;
    }
  }

  const [byEmail] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.email, email));

  if (byEmail) {
    await db
      .update(participantsTable)
      .set({ name, ...(phone ? { phone } : {}) })
      .where(eq(participantsTable.id, byEmail.id));
    return byEmail.id;
  }

  const [created] = await db
    .insert(participantsTable)
    .values({ phone: phone ?? null, email, name, totalPoints: 0, totalEvents: 0 })
    .returning({ id: participantsTable.id });

  const participantId = created!.id;
  await db
    .insert(participantEmailsTable)
    .values({ participantId, email, isPrimary: true })
    .onConflictDoNothing();

  return participantId;
}

router.get("/public/register/:token", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const event = await getEventByToken("registrationToken", raw);

  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const sponsors = await getSponsorsForEvent(event.id);

  res.json({ event, sponsors });
});

// Session-guarded view tracking — called once per session by the frontend
router.post("/public/register/:token/track-view", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const event = await getEventByToken("registrationToken", raw);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  trackImpressions(event.id, "registration").catch(() => {});
  res.sendStatus(204);
});

router.post("/public/register/:token", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.registrationToken, raw));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  if (event.status === "cancelled" || event.status === "completed") {
    res.status(400).json({ error: "This event is no longer accepting registrations" });
    return;
  }

  const {
    name, email, phone, refToken,
    fullNameAr, nationality, nationalityOther, phoneCountryCode,
    hasMedicalConditions, medicalDetails, emergencyContactName,
    emergencyContactPhone, waiverAcceptedAt,
  } = req.body as {
    name?: string; email?: string; phone?: string; refToken?: string;
    fullNameAr?: string; nationality?: string; nationalityOther?: string;
    phoneCountryCode?: string; hasMedicalConditions?: boolean;
    medicalDetails?: string; emergencyContactName?: string;
    emergencyContactPhone?: string; waiverAcceptedAt?: string;
  };

  if (!name || !email) {
    res.status(400).json({ error: "Name and email are required" });
    return;
  }

  // Duplicate check — by phone or email for this event
  const checkConditions = phone
    ? and(eq(registrationsTable.eventId, event.id), eq(registrationsTable.phone, phone), ne(registrationsTable.status, "cancelled"))
    : and(eq(registrationsTable.eventId, event.id), eq(registrationsTable.email, email), ne(registrationsTable.status, "cancelled"));

  const existing = await db.select().from(registrationsTable).where(checkConditions);
  if (existing.length > 0) {
    res.status(400).json({ error: "You are already registered for this event" });
    return;
  }

  // Resolve referral
  let referredByRegistrationId: number | null = null;
  if (refToken && typeof refToken === "string") {
    const [referrer] = await db
      .select()
      .from(registrationsTable)
      .where(and(eq(registrationsTable.referralToken, refToken), eq(registrationsTable.eventId, event.id)));
    if (referrer) referredByRegistrationId = referrer.id;
  }

  const newReferralToken = randomUUID();

  const [registration] = await db
    .insert(registrationsTable)
    .values({
      eventId: event.id,
      name,
      email,
      phone: phone ?? null,
      phoneCountryCode: phoneCountryCode ?? "+962",
      fullNameAr: fullNameAr ?? null,
      nationality: nationality ?? null,
      nationalityOther: nationalityOther ?? null,
      hasMedicalConditions: hasMedicalConditions ?? false,
      medicalDetails: medicalDetails ?? null,
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
      waiverAcceptedAt: waiverAcceptedAt ? new Date(waiverAcceptedAt) : null,
      status: "pending",
      referralToken: newReferralToken,
      referredByRegistrationId,
    })
    .returning();

  // Upsert participant (phone-first lookup)
  await upsertParticipant({ phone: phone ?? null, email, name });

  // Track registration_submitted impressions (not the page view — that comes via POST /track-view)
  trackImpressions(event.id, "registration_submitted").catch(() => {});

  await db.insert(activityLogTable).values({
    type: "registration",
    description: `${name} submitted a registration request for "${event.title}"${referredByRegistrationId ? " via referral" : ""}`,
    eventTitle: event.title,
    eventId: event.id,
    actorType: "public",
  });

  res.status(201).json(registration);
});

router.get("/public/photos/:token", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const event = await getEventByToken("photoToken", raw);

  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const [photos, sponsors] = await Promise.all([
    db.select().from(photosTable).where(eq(photosTable.eventId, event.id)),
    getSponsorsForEvent(event.id),
  ]);

  trackImpressions(event.id, "photo").catch(() => {});
  res.json({ event, photos, sponsors });
});

// ─── Sponsor QR Scan (tracked, abuse-resistant via secret token) ──────────────
router.get("/public/sponsor-scan/:token", async (req, res): Promise<void> => {
  const token = req.params.token;
  const [sponsor] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.scanToken, token));
  if (!sponsor) { res.status(404).json({ error: "Invalid scan link" }); return; }

  // Record the scan (no event context — sponsor-level QR scan)
  await db.insert(sponsorImpressionsTable).values({ sponsorId: sponsor.id, pageType: "qr_scan" });

  // Redirect to website if available, else acknowledge
  if (sponsor.website) {
    res.redirect(302, sponsor.website);
  } else {
    res.json({ name: sponsor.name, message: "Scan recorded. Thank you!" });
  }
});

// ─── Sponsor Venue Check-in (participant → sponsor) ───────────────────────────

router.get("/public/check-in/:scanToken", async (req, res): Promise<void> => {
  const [sponsor] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.scanToken, req.params.scanToken));
  if (!sponsor) { res.status(404).json({ error: "Invalid check-in link" }); return; }
  // Intentionally omit discountCode here — it is only revealed after a successful check-in POST
  res.json({
    id: sponsor.id,
    name: sponsor.name,
    type: sponsor.type,
    logoUrl: sponsor.logoUrl,
    description: sponsor.description,
    hasDiscount: !!sponsor.discountCode,  // tell the page a reward exists, without revealing the code
    website: sponsor.website,
  });
});

router.post("/public/check-in/:scanToken", async (req, res): Promise<void> => {
  const { phone } = req.body as { phone?: string };
  if (!phone?.trim()) { res.status(400).json({ error: "Phone number is required" }); return; }

  const [sponsor] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.scanToken, req.params.scanToken));
  if (!sponsor) { res.status(404).json({ error: "Invalid check-in link" }); return; }

  // Look up participant by phone
  const [participant] = await db.select().from(participantsTable).where(eq(participantsTable.phone, phone.trim()));
  if (!participant) {
    res.status(404).json({ error: "You're not yet registered for any of our events. Please register first." });
    return;
  }

  // Find most recent confirmed/pending registration to link event
  const [latestReg] = await db
    .select({ eventId: registrationsTable.eventId })
    .from(registrationsTable)
    .where(and(eq(registrationsTable.phone, participant.phone!), ne(registrationsTable.status, "cancelled")))
    .orderBy(desc(registrationsTable.registeredAt))
    .limit(1);

  const eventId = latestReg?.eventId ?? null;

  // Insert or detect duplicate (same sponsor + participant + today UTC)
  try {
    const [checkin] = await db
      .insert(venueCheckinsTable)
      .values({ sponsorId: sponsor.id, participantId: participant.id, eventId })
      .returning();
    res.status(201).json({
      participantName: participant.name,
      discountCode: sponsor.discountCode,
      alreadyCheckedIn: false,
      checkedInAt: checkin.checkedInAt,
    });
  } catch (err: unknown) {
    // Unique constraint violation → already checked in today
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.json({
        participantName: participant.name,
        discountCode: sponsor.discountCode,
        alreadyCheckedIn: true,
      });
    } else {
      throw err;
    }
  }
});

router.post("/public/photos/:token", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.photoToken, raw));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const { uploaderName, caption, objectPath } = req.body;
  if (!uploaderName || !objectPath) {
    res.status(400).json({ error: "uploaderName and objectPath are required" });
    return;
  }

  const [photo] = await db
    .insert(photosTable)
    .values({ eventId: event.id, uploaderName, caption: caption ?? null, objectPath })
    .returning();

  res.status(201).json(photo);
});

export default router;
