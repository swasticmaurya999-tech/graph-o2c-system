import express from "express";
import cors from "cors";
import queryRoute from "./routes/query";
import graphRoute from "./routes/graph";
import { getSession } from "./config/neo4j";
import { ingestGraph } from "./ingestion/loadData";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ GLOBAL LOGGER
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.url}`);
  next();
});

// ✅ ROUTES
app.use("/query", queryRoute);
app.use("/graph", graphRoute);

app.get("/test", (req, res) => {
  res.json({ message: "Server working 🚀" });
});

async function ensureGraphLoaded() {
  // Optional safety: for fresh deployments, load the graph if Neo4j is empty.
  // Enable with AUTO_INGEST=true.
  if (process.env.AUTO_INGEST !== "true") return;

  const session = getSession();
  try {
    const nodeCountRes = await session.run("MATCH (n) RETURN count(n) as count");
    const countVal = nodeCountRes.records[0]?.get("count");
    const count =
      typeof countVal?.toNumber === "function" ? countVal.toNumber() : Number(countVal);

    if (!count || count === 0) {
      console.log("AUTO_INGEST enabled and graph is empty. Running ingestion...");
      await ingestGraph();
    } else {
      console.log("AUTO_INGEST enabled but graph already has nodes:", count);
    }
  } finally {
    await session.close();
  }
}

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
ensureGraphLoaded()
  .catch((e) => console.error("AUTO_INGEST failed:", e))
  .finally(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port} 🚀`);
    });
  });