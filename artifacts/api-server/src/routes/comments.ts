import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, eventsTable, commentsTable, activityLogTable } from "@workspace/db";
import {
  ListEventCommentsParams,
  CreateCommentParams,
  CreateCommentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events/:id/comments", async (req, res): Promise<void> => {
  const params = ListEventCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const comments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.eventId, params.data.id))
    .orderBy(desc(commentsTable.createdAt));

  res.json(comments);
});

router.post("/events/:id/comments", async (req, res): Promise<void> => {
  const params = CreateCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, params.data.id));

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({
      eventId: params.data.id,
      authorName: parsed.data.authorName,
      content: parsed.data.content,
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "comment",
    description: `${parsed.data.authorName} commented on "${event.title}"`,
    eventTitle: event.title,
    eventId: event.id,
  });

  res.status(201).json(comment);
});

export default router;
