import express, { Request, Response } from "express";
import { getSession } from "./config/neo4j";

const app = express();

app.get("/test", async (req: Request, res: Response) => {
  const session = getSession();

  try {
    const result = await session.run(
      "RETURN 'Neo4j connected successfully 🚀' AS message"
    );

    res.json({
      message: result.records[0].get("message"),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Connection failed" });
  } finally {
    await session.close();
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});