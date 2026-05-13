import { Router, type IRouter } from "express";
import { db, reviewsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import {
  ListReviewsResponse,
  CreateReviewBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const reviews = await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  const mapped = reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  res.json(ListReviewsResponse.parse(mapped));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.rating < 1 || parsed.data.rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }
  const [review] = await db.insert(reviewsTable).values(parsed.data).returning();
  res.status(201).json({ ...review, createdAt: review.createdAt.toISOString() });
});

export default router;
