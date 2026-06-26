import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db, registrationsTable, participantsTable, eventsTable,
  eventSponsorsTable, sponsorImpressionsTable,
} from "@workspace/db";
import {
  ListEventRegistrationsParams,
  CancelRegistrationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

async function upsertParticipantPoints(args: {
  phone?: string | null;
  email: string;
  name: string;
  pts: number;
}) {
  const { phone, email, name, pts } = args;

  let participant;
  if (phone) {
    [participant] = await db.select().from(participantsTable).where(eq(participantsTable.phone, phone));
  }
  if (!participant) {
    [participant] = await db.select().from(participantsTable).where(eq(participantsTable.email, email));
  }

  if (participant) {
    await db
      .update(participantsTable)
      .set({
        totalPoints: sql`${participantsTable.totalPoints} + ${pts}`,
        totalEvents: sql`${participantsTable.totalEvents} + 1`,
      })
      .where(eq(participantsTable.id, participant.id));
    return participant.id;
  } else {
    const [created] = await db
      .insert(participantsTable)
      .values({ phone: phone ?? null, email, name, totalPoints: pts, totalEvents: 1 })
      .returning({ id: participantsTable.id });
    return created!.id;
  }
}

router.get("/events/:id/registrations", async (req, res): Promise<void> => {
  const params = ListEventRegistrationsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const registrations = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.eventId, params.data.id));

  res.json(registrations);
});

router.delete("/registrations/:id", async (req, res): Promise<void> => {
  const params = CancelRegistrationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [registration] = await db
    .update(registrationsTable)
    .set({ status: "cancelled" })
    .where(eq(registrationsTable.id, params.data.id))
    .returning();

  if (!registration) { res.status(404).json({ error: "Registration not found" }); return; }
  res.sendStatus(204);
});

router.patch("/registrations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid registration id" }); return; }

  const { status } = req.body as { status: string };
  if (!["pending", "confirmed", "waitlist", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [before] = await db.select().from(registrationsTable).where(eq(registrationsTable.id, id));
  if (!before) { res.status(404).json({ error: "Registration not found" }); return; }

  const [updated] = await db
    .update(registrationsTable)
    .set({ status: status as "pending" | "confirmed" | "waitlist" | "cancelled" })
    .where(eq(registrationsTable.id, id))
    .returning();

  // Award points when transitioning to confirmed (only if not previously confirmed)
  if (status === "confirmed" && before.status !== "confirmed") {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, before.eventId));

    if (event) {
      const pts = event.pointsValue ?? 1;

      const participantId = await upsertParticipantPoints({
        phone: before.phone,
        email: before.email,
        name: before.name,
        pts,
      });

      // Bonus points if they were referred
      if (before.referredByRegistrationId) {
        await db
          .update(participantsTable)
          .set({ totalPoints: sql`${participantsTable.totalPoints} + 1` })
          .where(eq(participantsTable.id, participantId));

        const [referrerReg] = await db
          .select()
          .from(registrationsTable)
          .where(eq(registrationsTable.id, before.referredByRegistrationId));

        if (referrerReg) {
          await db
            .update(registrationsTable)
            .set({ referralCount: sql`${registrationsTable.referralCount} + 1` })
            .where(eq(registrationsTable.id, referrerReg.id));

          let referrerParticipant;
          if (referrerReg.phone) {
            [referrerParticipant] = await db.select().from(participantsTable).where(eq(participantsTable.phone, referrerReg.phone));
          }
          if (!referrerParticipant) {
            [referrerParticipant] = await db.select().from(participantsTable).where(eq(participantsTable.email, referrerReg.email));
          }

          if (referrerParticipant) {
            await db
              .update(participantsTable)
              .set({
                totalPoints: sql`${participantsTable.totalPoints} + 1`,
                referralCount: sql`${participantsTable.referralCount} + 1`,
              })
              .where(eq(participantsTable.id, referrerParticipant.id));
          } else {
            await db.insert(participantsTable).values({
              phone: referrerReg.phone ?? null,
              email: referrerReg.email,
              name: referrerReg.name,
              totalPoints: 1,
              totalEvents: 0,
              referralCount: 1,
            });
          }
        }
      }
    }

    // Track registration_approved impressions
    trackImpressions(before.eventId, "registration_approved").catch(() => {});
  }

  res.json(updated);
});

export default router;
