import Groq from "groq-sdk";
import { getSchema } from "../config/neo4j";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ✅ Define schema type
type SchemaType = {
  nodes: string[];
  relationships: string[];
};

// ✅ Fallback constants
const DEFAULT_NODES = [
  "Customer",
  "SalesOrder",
  "Delivery",
  "Invoice",
  "Payment",
  "JournalEntry",
  "OrderItem",
  "Product",
];

const DEFAULT_RELATIONSHIPS = [
  "(Customer)-[:PLACED]->(SalesOrder)",
  "(SalesOrder)-[:FULFILLED_BY]->(Delivery)",
  "(Delivery)-[:BILLED_AS]->(Invoice)",
  "(Invoice)-[:RECORDED_AS]->(JournalEntry)",
  "(Customer)-[:MADE_PAYMENT]->(Payment)",
  "(Payment)-[:RECORDED_AS]->(JournalEntry)",
  "(SalesOrder)-[:CONTAINS]->(OrderItem)",
  "(OrderItem)-[:FOR_PRODUCT]->(Product)",
];

/**
 * 🔹 Generate Cypher Query
 */
export async function generateCypher(question: string): Promise<string> {
  let schema: SchemaType;

  try {
    schema = await getSchema();
  } catch (err) {
    console.error("❌ Schema fetch failed:", err);

    // ✅ fallback schema (TYPE SAFE)
    schema = {
      nodes: DEFAULT_NODES,
      relationships: DEFAULT_RELATIONSHIPS,
    };
  }

  // ✅ SAFE ACCESS (no red lines now)
  const nodes =
    schema.nodes && schema.nodes.length > 0
      ? schema.nodes.join(", ")
      : DEFAULT_NODES.join(", ");

  const relationships =
    schema.relationships && schema.relationships.length > 0
      ? schema.relationships.join("\n")
      : DEFAULT_RELATIONSHIPS.join("\n");

  const prompt = `
You are an expert Neo4j Cypher generator.

STRICTLY follow the schema below.

GRAPH SCHEMA:
Nodes:
${nodes}

Relationships:
${relationships}

IMPORTANT RULES:
- Use ONLY labels and relationships from schema
- DO NOT invent labels like Order, LineItem, etc.

- Use EXACT labels:
  SalesOrder, Delivery, Invoice, Payment, JournalEntry, OrderItem, Product, Customer

- Allowed relationships:
  PLACED, FULFILLED_BY, CONTAINS, BILLED_BY, DELIVERED_BY, INVOICED, PAID_BY, RECORDED_AS, FOR_PRODUCT

- IDs are ALWAYS strings:
  Example: {id: "740584"}

- NEVER use:
  exists()
  size()

- Missing relationship:
  WHERE NOT (n)-[:REL]->()

- LIMIT 10
- RETURN ONLY CYPHER

---

Examples:

Q: sales order 740584
MATCH (o:SalesOrder {id: "740584"})
RETURN o LIMIT 10

Q: orders by customer 320000083
MATCH (c:Customer {id: "320000083"})-[:PLACED]->(o:SalesOrder)
RETURN o LIMIT 10

Q: orders not delivered
MATCH (o:SalesOrder)
WHERE NOT (o)-[:FULFILLED_BY]->()
RETURN o LIMIT 10

---

Question:
${question}
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  let cypher = response.choices[0]?.message?.content || "";

  // ✅ CLEAN RESPONSE
  cypher = cypher
    .replace(/```cypher/g, "")
    .replace(/```/g, "")
    .replace(/Here.*?:/gi, "")
    .trim();

  // ✅ STRONG VALIDATION
  const isValid =
    cypher.toLowerCase().includes("match") &&
    cypher.toLowerCase().includes("return");

  if (!isValid) {
    console.warn("⚠️ Invalid Cypher → fallback");

    cypher = `MATCH (o:SalesOrder) RETURN o LIMIT 10`;
  }

  console.log("\n🧠 Generated Cypher:\n", cypher);

  return cypher;
}

/**
 * 🔹 Generate Answer
 */
export async function generateAnswer(
  question: string,
  data: any[]
): Promise<string> {
  if (!data || data.length === 0) {
    return "No matching records found in the dataset.";
  }

  const prompt = `
You are a business analyst.

Question:
${question}

Data:
${JSON.stringify(data).slice(0, 1500)}

Give a short insight.
`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return res.choices[0]?.message?.content || "No answer found.";
}