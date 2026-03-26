import express from "express";
import cors from "cors";
import queryRoute from "./routes/query";
import graphRoute from "./routes/graph";

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

app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});