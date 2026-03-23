import { Router } from "express";
import { runQuery } from "../services/queryService";

const router = Router();

router.post("/", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({
      error: "Question is required",
    });
  }

  try {
    const result = await runQuery(question);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Query failed",
    });
  }
});

export default router;