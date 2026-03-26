# Graph-Based Order-to-Cash Analytics (Graph + LLM Query)

This project converts a multi-table Order-to-Cash dataset into a **Neo4j context graph** and provides an **LLM-powered query interface** with guardrails.

It includes:

- **Backend**: Node + Express API that queries Neo4j and returns data-backed answers
- **Graph ingestion**: JSONL → Neo4j nodes/relationships
- **Frontend**: React (Vite) UI with a graph explorer + chat panel (supports node inspection and query-based highlights)

---

## Live Demo

- **Frontend (UI)**: `<ADD YOUR VERCEL LINK>`
- **Backend (API)**: `<ADD YOUR RENDER LINK>`

> The UI is deployed separately from the API. The UI calls the API via `VITE_API_BASE_URL`.

---

## Repository Structure

Backend (repo root):

- `src/index.ts`: Express app, route wiring (`/query`, `/graph`), optional auto-ingestion
- `src/config/neo4j.ts`: Neo4j driver/session + schema introspection helper
- `src/routes/query.ts`: `POST /query`
- `src/routes/graph.ts`: `GET /graph` and `GET /graph/stats`
- `src/services/queryService.ts`: guardrails → Cypher generation → Neo4j execution → response shaping
- `src/services/llmService.ts`: intent-aware Cypher generation + answer generation
- `src/services/queryValidator.ts`: domain guardrails + Cypher syntax checks
- `src/ingestion/readJSONL.ts`: JSONL reader
- `src/ingestion/loadData.ts`: ingestion pipeline (creates nodes + edges)

Frontend (`graph-ui/`):

- `graph-ui/src/App.tsx`: layout and draggable resizer between graph and chat
- `graph-ui/src/components/GraphView.tsx`: graph visualization, node inspection, expand/neighborhood view
- `graph-ui/src/components/ChatPanel.tsx`: chat UI and query calls

---

## Graph Model (Neo4j)

### Node Labels

- `Customer`
- `SalesOrder`
- `OrderItem`
- `Delivery`, `DeliveryItem`
- `Invoice`, `InvoiceItem`  (billing documents)
- `JournalEntry`
- `Payment`
- `Product`

All entities use a normalized `id` property (strings in the dataset).

### Core Relationships (used by “trace” queries)

- `(Customer)-[:PLACED]->(SalesOrder)`
- `(SalesOrder)-[:FULFILLED_BY]->(Delivery)`
- `(SalesOrder)-[:INVOICED]->(Invoice)`
- `(Invoice)-[:RECORDED_AS]->(JournalEntry)`
- `(SalesOrder)-[:CONTAINS]->(OrderItem)`
- `(OrderItem)-[:FOR_PRODUCT]->(Product)`

Item-level relationships:

- `(Delivery)-[:CONTAINS]->(DeliveryItem)`
- `(DeliveryItem)-[:FOR_PRODUCT]->(Product)`
- `(Invoice)-[:CONTAINS]->(InvoiceItem)`
- `(InvoiceItem)-[:FOR_PRODUCT]->(Product)`
- `(OrderItem)-[:DELIVERED_BY]->(DeliveryItem)`
- `(OrderItem)-[:BILLED_BY]->(InvoiceItem)`

Finance linking:

- `(Invoice)-[:RECORDED_AS]->(JournalEntry)`
- `(Payment)-[:RECORDED_AS]->(JournalEntry)`

> Note: ingestion also creates `(Delivery)-[:BILLED_AS]->(Invoice)` for exploration, but **flow tracing and analytics intentionally use `SalesOrder-[:INVOICED]->Invoice`** as the canonical billing link. This avoids incorrect joins and makes guardrails enforce a single “source of truth” for tracing.

---

## Backend API

### `GET /graph`

Returns a UI-friendly graph snapshot:

- `nodes`: `{ id, label, ...properties }`
- `links`: `{ source, target, type }`

Implementation: `src/routes/graph.ts`

### `GET /graph/stats`

Returns counts by label and total relationships.

### `POST /query`

Request:

```json
{ "question": "trace sales order 740584" }
```

Response:

- `cypher`: Cypher executed
- `data`: Neo4j records (normalized so Neo4j integers become JS numbers)
- `answer`: short natural-language answer grounded in `data`
- `ids`: extracted ids for frontend highlighting

Implementation: `src/routes/query.ts` → `src/services/queryService.ts`

---

## LLM Integration + Guardrails

### Goals

- Translate natural language into **safe Cypher** for *this dataset only*
- Avoid hallucinated relationships or “general knowledge” replies not grounded in data

### Guardrails (out-of-domain)

`src/services/queryValidator.ts` blocks:

- creative writing, jokes
- general knowledge questions
- unrelated topics (weather/news/politics/food, etc.)
- system prompts unrelated to dataset

If blocked, backend returns a dataset-scoped rejection message.

### Cypher validation (syntax safety)

`validateCypherSyntax()` checks:

- query starts with `MATCH`
- contains `RETURN`
- balanced parentheses/brackets
- no obviously malformed patterns

### Deterministic templates (reduce LLM drift)

The system uses deterministic Cypher for the most important intents, based on regex extraction of IDs:

- Sales order trace: `trace sales order <id>`
- Billing document trace: `trace billing document <id>` / `invoice <id>`
- Broken flows:
  - delivered but not billed
  - billed but not delivered
  - not delivered
- Product billing analysis:
  - “highest/most billing documents per product”
- Customer lookups:
  - list customers
  - orders for a customer

Why templates?

- Ensures “trace” follows the **correct graph model**
- Prevents the LLM from generating invalid edges (e.g. Delivery→Invoice) for canonical tracing

Fallback:

- For less common requests, `llmService.ts` still calls Groq (`groq-sdk`) to generate Cypher, but the guardrails/syntax checks remain in place.

### Answer generation

The answer is generated from the returned `data` (truncated to avoid huge prompts). If `data` is empty, the system returns a “No exact match found…” style response.

---

## Data Ingestion Pipeline

Implementation: `src/ingestion/loadData.ts`

Source format: JSONL files under `data/` (downloaded dataset).

High-level steps:

1. Create `Customer` nodes from `data/business_partners`
2. Create `Product` nodes from `data/sales_order_items` materials
3. Create `SalesOrder` nodes and link to customers (`PLACED`)
4. Create `OrderItem` nodes and link to orders/products (`CONTAINS`, `FOR_PRODUCT`)
5. Create `Delivery` + `DeliveryItem` nodes and link to products
6. Link orders to deliveries (`FULFILLED_BY`)
7. Link order items to delivery items (`DELIVERED_BY`)
8. Create `Invoice` + `InvoiceItem` nodes and link to products
9. Link order items to invoice items (`BILLED_BY`)
10. Link orders to invoices (`INVOICED`)
11. Create `JournalEntry` and `Payment` nodes
12. Link invoices/payments to journal entries (`RECORDED_AS`)

### Auto-ingestion for fresh deployments

`src/index.ts` supports:

- `AUTO_INGEST=true`: on startup, if Neo4j is empty, ingestion runs automatically.

This makes first-time deployments easier (especially on free-tier services).

---

## Frontend (graph-ui)

Tech: React 19 + Vite + `react-force-graph-2d`

Key features:

- Graph visualization + pan/zoom
- Node click → node details card (top-center)
- “Hide Granular Overlay” toggles neighborhood view around the selected/highlighted node
- Chat panel:
  - suggestion chips
  - sends questions to `/query`
  - highlights returned `ids` on the graph
- Draggable divider between graph and chat panel

### Frontend configuration

The frontend reads:

- `VITE_API_BASE_URL` (defaults to `http://localhost:3000` in dev)

Used by:

- `graph-ui/src/components/GraphView.tsx`
- `graph-ui/src/components/ChatPanel.tsx`

---

## Environment Variables

### Backend

- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `GROQ_API_KEY`
- `PORT` (optional; Render sets this automatically)
- `AUTO_INGEST` (optional; set to `true` for fresh deployments)

### Frontend (build-time)

- `VITE_API_BASE_URL=https://<your-backend-domain>`

---

## Local Development

### Backend

```powershell
cd d:\code\graph-system
npm install
npm run dev
```

Backend: `http://localhost:3000`

Useful URLs:

- `GET /test`
- `GET /graph`
- `GET /graph/stats`

### Frontend

```powershell
cd d:\code\graph-system\graph-ui
npm install
npm run dev
```

Frontend: `http://localhost:5173`

---

## Deployment (Render backend + Vercel frontend)

### Backend on Render

Service type: **Web Service**

- Build: `npm install && npm run build`
- Start: `npm run start`
- Env vars: `NEO4J_*`, `GROQ_API_KEY`, optionally `AUTO_INGEST=true`

After deploy, verify:

- `https://<render-backend>/test`
- `https://<render-backend>/graph`

### Frontend on Vercel

Project root: `graph-ui`

- Install: `npm install`
- Build: `npm run build`
- Output: `dist`
- Env var: `VITE_API_BASE_URL=https://<render-backend>`

After deploy, the **Vercel URL is your demo link** (UI).

---

## Example Queries (evaluation)

Try in the chat:

- `Show me sales order 740584`
- `Trace sales order 740584`
- `Trace billing document 90504248`
- `Which products are associated with the highest number of billing documents?`
- `Which orders were delivered but not billed?`
- `Which orders were billed but not delivered?`
- `List all customers`
- `Orders made by customer 310000108`

---

## Troubleshooting

### Graph is blank / “Loading graph data…”

Check:

- Frontend `VITE_API_BASE_URL` points to the backend
- Backend has data:
  - `GET /graph` should return non-empty `nodes` and `links`
- If Neo4j is empty on first deploy:
  - set `AUTO_INGEST=true` on backend and redeploy once

### Vercel build fails

Ensure `graph-ui/package.json` contains frontend dependencies (`axios`, etc.) and that the Vercel project root is set to `graph-ui`.

---

## Submission Checklist

- [ ] Public GitHub repository
- [ ] Backend deployed (Render URL)
- [ ] Frontend deployed (Vercel URL) — **demo link**
- [ ] This README updated with architecture + prompt strategy + guardrails
- [ ] AI coding session logs/transcripts (Cursor export)
- [ ] Submission form filled with demo + repo links

