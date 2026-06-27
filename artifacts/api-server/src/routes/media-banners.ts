import { Router, type IRouter } from "express";
import { eq, asc, ne } from "drizzle-orm";
import { db, mediaBannersTable } from "@workspace/db";
import { promises as fsPromises } from "fs";
import path from "path";
import { randomUUID } from "crypto";

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

// Upload a file from the browser and return its public URL
router.post("/media-banners/upload", async (req, res): Promise<void> => {
  const { data, filename } = req.body as { data?: string; filename?: string };
  if (!data || !filename) { res.status(400).json({ error: "data and filename are required" }); return; }

  const base64Data = data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const ext = path.extname(filename).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".webm"];
  if (!allowed.includes(ext)) {
    res.status(400).json({ error: `Extension ${ext} is not allowed` }); return;
  }

  const safeName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "uploads", "banners");
  await fsPromises.mkdir(uploadDir, { recursive: true });
  await fsPromises.writeFile(path.join(uploadDir, safeName), buffer);

  res.json({ url: `/uploads/banners/${safeName}` });
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

  // Enforce single active banner: deactivate all others when this one becomes active
  if (isActive === true) {
    await db.update(mediaBannersTable).set({ isActive: false }).where(ne(mediaBannersTable.id, id));
  }

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
