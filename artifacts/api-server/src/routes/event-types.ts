import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, eventTypesTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_TYPES = [
  { name: "Hiking", icon: "🥾" },
  { name: "Cycling", icon: "🚴" },
  { name: "Camping", icon: "⛺" },
  { name: "Kayaking", icon: "🛶" },
  { name: "Running", icon: "🏃" },
  { name: "Climbing", icon: "🧗" },
  { name: "Cultural", icon: "🏛️" },
  { name: "Walking", icon: "🚶" },
  { name: "Other", icon: "🎯" },
];

export async function seedEventTypes() {
  const existing = await db.select().from(eventTypesTable);
  if (existing.length === 0) {
    await db.insert(eventTypesTable).values(DEFAULT_TYPES);
  }
}

router.get("/event-types", async (req, res): Promise<void> => {
  const types = await db
    .select()
    .from(eventTypesTable)
    .orderBy(eventTypesTable.name);
  res.json(types);
});

router.post("/event-types", async (req, res): Promise<void> => {
  const { name, description, icon } = req.body as { name?: string; description?: string; icon?: string };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [type] = await db
    .insert(eventTypesTable)
    .values({ name, description: description ?? null, icon: icon ?? null })
    .returning();

  res.status(201).json(type);
});

router.get("/event-types/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [type] = await db.select().from(eventTypesTable).where(eq(eventTypesTable.id, id));
  if (!type) { res.status(404).json({ error: "Event type not found" }); return; }

  res.json(type);
});

router.patch("/event-types/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, description, icon, isArchived } = req.body as {
    name?: string; description?: string; icon?: string; isArchived?: boolean;
  };
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (icon !== undefined) updates.icon = icon;
  if (isArchived !== undefined) updates.isArchived = isArchived;

  const [type] = await db
    .update(eventTypesTable)
    .set(updates)
    .where(eq(eventTypesTable.id, id))
    .returning();

  if (!type) { res.status(404).json({ error: "Event type not found" }); return; }
  res.json(type);
});

router.delete("/event-types/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(eventTypesTable).where(eq(eventTypesTable.id, id));
  res.sendStatus(204);
});

export default router;
