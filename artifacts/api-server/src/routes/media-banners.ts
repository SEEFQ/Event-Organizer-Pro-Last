import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, mediaBannersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/media-banners", async (req, res): Promise<void> => {
  const { activeOnly } = req.query;

  if (activeOnly === "true") {
    const banners = await db
      .select()
      .from(mediaBannersTable)
      .where(eq(mediaBannersTable.isActive, true))
      .orderBy(asc(mediaBannersTable.displayOrder), asc(mediaBannersTable.createdAt));
    res.json(banners);
    return;
  }

  const banners = await db
    .select()
    .from(mediaBannersTable)
    .orderBy(asc(mediaBannersTable.displayOrder), asc(mediaBannersTable.createdAt));
  res.json(banners);
});

router.post("/media-banners", async (req, res): Promise<void> => {
  const { type, url, thumbnailUrl, title, displayOrder, isActive } = req.body as {
    type?: string; url?: string; thumbnailUrl?: string; title?: string;
    displayOrder?: number; isActive?: boolean;
  };

  if (!url) { res.status(400).json({ error: "url is required" }); return; }
  if (type && !["image", "video"].includes(type)) {
    res.status(400).json({ error: "type must be image or video" }); return;
  }

  const [banner] = await db
    .insert(mediaBannersTable)
    .values({
      type: (type ?? "image") as "image" | "video",
      url,
      thumbnailUrl: thumbnailUrl ?? null,
      title: title ?? null,
      displayOrder: displayOrder ?? 0,
      isActive: isActive !== false,
    })
    .returning();

  res.status(201).json(banner);
});

router.get("/media-banners/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [banner] = await db
    .select()
    .from(mediaBannersTable)
    .where(eq(mediaBannersTable.id, id));

  if (!banner) { res.status(404).json({ error: "Banner not found" }); return; }
  res.json(banner);
});

router.patch("/media-banners/reorder", async (req, res): Promise<void> => {
  const items = req.body as { id: number; displayOrder: number }[];
  if (!Array.isArray(items)) { res.status(400).json({ error: "Body must be an array" }); return; }

  await Promise.all(
    items.map(({ id, displayOrder }) =>
      db.update(mediaBannersTable).set({ displayOrder }).where(eq(mediaBannersTable.id, id))
    )
  );
  res.sendStatus(204);
});

router.patch("/media-banners/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { type, url, thumbnailUrl, title, displayOrder, isActive } = req.body as {
    type?: string; url?: string; thumbnailUrl?: string; title?: string;
    displayOrder?: number; isActive?: boolean;
  };
  const updates: Record<string, unknown> = {};
  if (type !== undefined) updates.type = type;
  if (url !== undefined) updates.url = url;
  if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
  if (title !== undefined) updates.title = title;
  if (displayOrder !== undefined) updates.displayOrder = displayOrder;
  if (isActive !== undefined) updates.isActive = isActive;

  const [banner] = await db
    .update(mediaBannersTable)
    .set(updates)
    .where(eq(mediaBannersTable.id, id))
    .returning();

  if (!banner) { res.status(404).json({ error: "Banner not found" }); return; }
  res.json(banner);
});

router.delete("/media-banners/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(mediaBannersTable).where(eq(mediaBannersTable.id, id));
  res.sendStatus(204);
});

export default router;
