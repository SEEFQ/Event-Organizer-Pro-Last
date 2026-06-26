import { Router, type IRouter } from "express";
import { eq, gte, ne, desc } from "drizzle-orm";
import { db, eventsTable, registrationsTable, activityLogTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const now = new Date();

  const [totalEventsRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(eventsTable);

  const [upcomingEventsRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(eventsTable)
    .where(gte(eventsTable.date, now));

  const [totalRegistrationsRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(registrationsTable)
    .where(ne(registrationsTable.status, "cancelled"));

  const [confirmedRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(registrationsTable)
    .where(eq(registrationsTable.status, "confirmed"));

  const categoryCounts = await db
    .select({
      category: eventsTable.category,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(eventsTable)
    .groupBy(eventsTable.category);

  const counts = {
    cycling: 0,
    hiking: 0,
    "summer-night": 0,
    walking: 0,
  };
  for (const row of categoryCounts) {
    counts[row.category] = row.count;
  }

  res.json({
    totalEvents: totalEventsRow?.count ?? 0,
    upcomingEvents: upcomingEventsRow?.count ?? 0,
    totalRegistrations: totalRegistrationsRow?.count ?? 0,
    totalParticipants: confirmedRow?.count ?? 0,
    categoryCounts: counts,
  });
});

async function getActivity(_req: unknown, res: import("express").Response): Promise<void> {
  const activity = await db
    .select()
    .from(activityLogTable)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(20);
  res.json(activity);
}

router.get("/stats/activity", getActivity);
router.get("/activity", getActivity);

export default router;
