import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, completedEventsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/completed-events", async (req, res): Promise<void> => {
  const { visibleOnly } = req.query;
  let query = db.select().from(completedEventsTable).orderBy(asc(completedEventsTable.displayOrder), asc(completedEventsTable.createdAt));

  if (visibleOnly === "true") {
    const items = await db
      .select()
      .from(completedEventsTable)
      .where(eq(completedEventsTable.isVisible, true))
      .orderBy(asc(completedEventsTable.displayOrder), asc(completedEventsTable.createdAt));
    res.json(items);
    return;
  }

  const items = await query;
  res.json(items);
});

router.post("/completed-events", async (req, res): Promise<void> => {
  const { title, eventType, shortDescription, coverImageUrl, eventDate, displayOrder, isVisible } = req.body as {
    title?: string; eventType?: string; shortDescription?: string; coverImageUrl?: string;
    eventDate?: string; displayOrder?: number; isVisible?: boolean;
  };

  if (!title || !eventType || !shortDescription) {
    res.status(400).json({ error: "title, eventType, and shortDescription are required" });
    return;
  }

  const [item] = await db
    .insert(completedEventsTable)
    .values({
      title,
      eventType,
      shortDescription,
      coverImageUrl: coverImageUrl ?? null,
      eventDate: eventDate ?? null,
      displayOrder: displayOrder ?? 0,
      isVisible: isVisible !== false,
    })
    .returning();

  res.status(201).json(item);
});

router.get("/completed-events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [item] = await db.select().from(completedEventsTable).where(eq(completedEventsTable.id, id));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }

  res.json(item);
});

router.patch("/completed-events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, eventType, shortDescription, coverImageUrl, eventDate, displayOrder, isVisible } = req.body as {
    title?: string; eventType?: string; shortDescription?: string; coverImageUrl?: string;
    eventDate?: string; displayOrder?: number; isVisible?: boolean;
  };
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (eventType !== undefined) updates.eventType = eventType;
  if (shortDescription !== undefined) updates.shortDescription = shortDescription;
  if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
  if (eventDate !== undefined) updates.eventDate = eventDate;
  if (displayOrder !== undefined) updates.displayOrder = displayOrder;
  if (isVisible !== undefined) updates.isVisible = isVisible;

  const [item] = await db
    .update(completedEventsTable)
    .set(updates)
    .where(eq(completedEventsTable.id, id))
    .returning();

  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

router.delete("/completed-events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(completedEventsTable).where(eq(completedEventsTable.id, id));
  res.sendStatus(204);
});

export default router;
