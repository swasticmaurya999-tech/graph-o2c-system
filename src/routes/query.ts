import express from "express";
import { runQuery } from "../services/queryService";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { question } = req.body;

    console.log("📥 Incoming:", question);

    if (!question) {
      return res.status(400).json({
        error: "Question is required",
      });
    }

    const result = await runQuery(question);

    console.log("📤 Response sent");

    res.json(result);
  } catch (err) {
    console.error("❌ Route Error:", err);

    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

export default router;