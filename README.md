# Graph-Based Order-to-Cash Analytics

A graph-based data modeling + natural-language query system for the Order-to-Cash process.
It unifies fragmented business documents (Sales Orders, Deliveries, Billing Documents/Invoices, Journal Entries, Payments, Customers, Products)
into a Neo4j graph and provides:

- A React UI to visualize and explore the graph
- A chat interface to ask questions in natural language
- An LLM-to-Cypher layer (with guardrails) that generates dataset-grounded answers

## Live Demo

Add your deployed URL here before submission.

## Architecture

### Backend (Node + Express)

Endpoints:

- `GET /graph`  
  Returns `{ nodes, links }` for the frontend graph renderer.
- `POST /query`  
  Accepts `{ "question": "..." }` and returns:
  - `cypher`: the generated Cypher query
  - `data`: raw matched records
  - `answer`: short natural-language response grounded in the returned `data`
  - `ids`: extracted entity ids used for graph highlighting

### Graph Modeling (Neo4j)

Nodes (labels):

- `Customer`
- `SalesOrder`
- `OrderItem`
- `Delivery`, `DeliveryItem`
- `Invoice`, `InvoiceItem`
- `JournalEntry`
- `Payment`
- `Product`

Core relationships used for flow tracing:

- `(Customer)-[:PLACED]->(SalesOrder)`
- `(SalesOrder)-[:FULFILLED_BY]->(Delivery)`
- `(SalesOrder)-[:INVOICED]->(Invoice)`
- `(Invoice)-[:RECORDED_AS]->(JournalEntry)`
- `(SalesOrder)-[:CONTAINS]->(OrderItem)`
- `(OrderItem)-[:FOR_PRODUCT]->(Product)`
- `(Invoice)-[:CONTAINS]->(InvoiceItem)`
- `(InvoiceItem)-[:FOR_PRODUCT]->(Product)`

### LLM-to-Cypher with Guardrails

Key components:

- `src/services/llmService.ts`
  - Intent-aware Cypher generation
  - Deterministic Cypher templates for critical intents (flow tracing, delivered/billed gaps, and common analyses)
  - Falls back to LLM Cypher generation for less common questions
- `src/services/queryValidator.ts`
  - Domain keyword guardrails (rejects unrelated prompts)
  - Cypher syntax safety checks
- `src/services/queryService.ts`
  - Executes Cypher against Neo4j
  - Normalizes Neo4j integer values to JS numbers
  - Produces the final response payload

## Data Ingestion

Ingestion is implemented in `src/ingestion/loadData.ts` and reads JSONL files from the `data/` folder.

Optional auto-ingestion:

- Set `AUTO_INGEST=true` in the backend environment
- On startup, if Neo4j is empty, ingestion will run automatically.

## Environment Variables

Backend (`.env`):

- `NEO4J_URI` (example: `bolt://xxxx.databases.neo4j.io:7687`)
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `GROQ_API_KEY` (used by the LLM)
- `AUTO_INGEST=true` (optional; only for fresh deployments)
- `PORT` (optional; defaults to `3000`)

Frontend (`graph-ui`):

- `VITE_API_BASE_URL` (example: `https://<your-backend-domain>/`)
  - The frontend calls `${VITE_API_BASE_URL}/graph` and `${VITE_API_BASE_URL}/query`.

## Local Development

### 1) Start Backend

From repo root:

```powershell
npm install
npm run dev
```

Backend runs on `http://localhost:3000`.

### 2) Start Frontend

```powershell
cd graph-ui
npm install
npm run dev
```

Frontend runs on the Vite dev server (typically `http://localhost:5173`).

## Deployment Guide (Suggested)

Deploy the frontend and backend separately:

1. **Deploy backend** (Render / Railway / Fly.io)
   - Build: `npm run build`
   - Start: `npm run start`
   - Set required env vars (`NEO4J_*`, `GROQ_API_KEY`, and optionally `AUTO_INGEST=true`)
2. **Deploy frontend** (Vercel / Netlify)
   - Build `graph-ui`
   - Set `VITE_API_BASE_URL` to your backend base URL (e.g. `https://backend.onrender.com`)
3. Ensure CORS remains enabled on the backend (`cors()` is already used).

## How to Answer Example Queries

- “Show me sales order 740584”
- “Trace sales order 740584”
- “Trace the full flow of billing document 90504248”
- “Which products are associated with the highest number of billing documents?”
- “Which orders were delivered but not billed?”

Flow trace queries are answered using graph-accurate relationship paths:

- Sales Order trace: `SalesOrder -> Delivery (FULFILLED_BY) -> Invoice (INVOICED) -> JournalEntry (RECORDED_AS)`
- Billing document trace starts from `Invoice` to avoid invalid relationship traversal.

## Submission Checklist

- Working demo link (frontend)
- Public GitHub repository
- This README with architecture decisions + prompting strategy + guardrails
- AI coding session logs/transcripts

