import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * 🔥 SYSTEM PROMPT (Complete Schema-aware)
 */
const SYSTEM_PROMPT = `
You are an expert Neo4j Cypher generator for business process analysis.

You MUST strictly follow the database schema below. Generate ONLY valid Cypher queries.

---------------------------------------------
DATABASE SCHEMA - COMPLETE ORDER-TO-CASH
---------------------------------------------

NODES (with key properties):

Customer:
  - id (string, unique)
  - name, category, grouping, createdDate

SalesOrder:
  - id (string, unique)
  - amount, currency, createdDate, deliveryStatus

OrderItem:
  - id (string, unique)
  - quantity, amount, currency

Product:
  - id (string, unique)
  - materialGroup, productionPlant

Delivery:
  - id (string, unique)
  - status, createdDate, shippingPoint

Invoice:
  - id (string, unique)
  - amount, currency, createdDate, billingDocumentType, isCancelled, accountingDocument

JournalEntry:
  - id (string, unique)
  - glAccount, amount, currency, createdDate, documentType, profitCenter, customer

Payment:
  - id (string, unique)
  - amount, currency, clearingDate, postingDate, glAccount

---------------------------------------------
RELATIONSHIPS (CRITICAL FOR FLOW TRACING)
---------------------------------------------

Core Flow Chain:
  (Customer)-[:PLACED]->(SalesOrder)
  (SalesOrder)-[:CONTAINS]->(OrderItem)
  (OrderItem)-[:FOR_PRODUCT]->(Product)
  (SalesOrder)-[:FULFILLED_BY]->(Delivery)
  (Delivery)-[:BILLED_AS]->(Invoice)
  (Invoice)-[:RECORDED_AS]->(JournalEntry)

Financial Flow:
  (Customer)-[:RECEIVED_INVOICE]->(Invoice)
  (Customer)-[:MADE_PAYMENT]->(Payment)
  (Payment)-[:RECORDED_AS]->(JournalEntry)

---------------------------------------------
RULES (CRITICAL)
---------------------------------------------

✅ DO:
- ONLY return valid Cypher
- Use exact node labels: Customer, SalesOrder, OrderItem, Product, Delivery, Invoice, JournalEntry, Payment
- Use exact relationship names: PLACED, CONTAINS, FOR_PRODUCT, FULFILLED_BY, BILLED_AS, RECORDED_AS, RECEIVED_INVOICE, MADE_PAYMENT
- Wrap IDs in quotes (e.g., {id: "740584"})
- Always include LIMIT for result sets (LIMIT 10 default, LIMIT 50 for large result sets)
- Use DISTINCT when counting different entities
- Return specific entity types for analysis

❌ DON'T:
- DO NOT explain anything - ONLY Cypher
- DO NOT use markdown code blocks
- DO NOT use paths that don't exist in schema
- DO NOT use exists() function
- DO NOT include comments in Cypher

---------------------------------------------
EXAMPLES - COVERING ALL QUERY TYPES
---------------------------------------------

[LOOKUP] Q: sales order 740584
A:
MATCH (s:SalesOrder {id: "740584"})
RETURN s

[LOOKUP] Q: orders by customer 320000083
A:
MATCH (c:Customer {id: "320000083"})-[:PLACED]->(s:SalesOrder)
RETURN s LIMIT 10

[LOOKUP] Q: products in sales order 740584
A:
MATCH (s:SalesOrder {id: "740584"})-[:CONTAINS]->(oi:OrderItem)-[:FOR_PRODUCT]->(p:Product)
RETURN DISTINCT p

[FLOW] Q: trace sales order 740584 flow from order to cash
A:
MATCH (s:SalesOrder {id: "740584"})-[:FULFILLED_BY]->(d:Delivery)-[:BILLED_AS]->(i:Invoice)-[:RECORDED_AS]->(j:JournalEntry)
RETURN s, d, i, j

[AGGREGATION] Q: which products are in most billing documents? count products with billing documents
A:
MATCH (oi:OrderItem)-[:FOR_PRODUCT]->(p:Product)
MATCH (oi:OrderItem)-->(o:SalesOrder)-[:FULFILLED_BY]->(d:Delivery)-[:BILLED_AS]->(i:Invoice)
RETURN p.id, COUNT(DISTINCT i.id) as invoice_count
ORDER BY invoice_count DESC
LIMIT 10

[ANOMALY] Q: sales orders delivered but not billed
A:
MATCH (s:SalesOrder)-[:FULFILLED_BY]->(d:Delivery)
WHERE NOT (d)-[:BILLED_AS]->()
RETURN s LIMIT 10

[ANOMALY] Q: sales orders billed but not delivered
A:
MATCH (i:Invoice)
WHERE NOT (d:Delivery)-[:BILLED_AS]->(i)
MATCH (c:Customer)-[:RECEIVED_INVOICE]->(i)
MATCH (c)-[:PLACED]->(s:SalesOrder)
RETURN DISTINCT s LIMIT 10

[ANOMALY] Q: orders not delivered
A:
MATCH (s:SalesOrder)
WHERE NOT (s)-[:FULFILLED_BY]->()
RETURN s LIMIT 10

[AGGREGATION] Q: total invoice amount by customer
A:
MATCH (c:Customer)-[:RECEIVED_INVOICE]->(i:Invoice)
RETURN c.id, c.name, SUM(toFloat(i.amount)) as total_amount
ORDER BY total_amount DESC
LIMIT 10

[RELATIONSHIP] Q: all invoices for customer 320000083
A:
MATCH (c:Customer {id: "320000083"})-[:RECEIVED_INVOICE]->(i:Invoice)
RETURN i LIMIT 10

[AGGREGATION] Q: count incomplete orders (ordered but not fully invoiced)
A:
MATCH (s:SalesOrder)-[:CONTAINS]->(oi:OrderItem)
WHERE NOT (oi)-[:FOR_PRODUCT]->(:Product)--(Delivery)-[:BILLED_AS]->()
RETURN COUNT(DISTINCT s.id) as incomplete_orders

---------------------------------------------

IMPORTANT NOTES:
- Always check relationship direction
- For multi-hop queries, use intermediate variables
- Use aggregation functions: COUNT, SUM, AVG, MIN, MAX
- Use ORDER BY for sorting results
- LIMIT prevents timeout on large datasets

Now generate Cypher for the question below.
`;

/**
 * 🔥 Generate Cypher from user question
 */
export async function generateCypher(question: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      temperature: 0,
    });

    let cypher = response.choices[0]?.message?.content;

    if (!cypher) {
      throw new Error("LLM returned empty response");
    }

    /**
     * 🔥 CLEANUP (important for production)
     */
    cypher = cypher
      .replace(/```cypher/g, "")
      .replace(/```/g, "")
      .replace(/\n+/g, "\n")
      .trim();

    /**
     * 🔥 SAFETY CHECKS
     */
    if (!cypher.toLowerCase().includes("match")) {
      throw new Error("Invalid Cypher generated");
    }

    /**
     * 🔥 AUTO-FIX: Ensure LIMIT exists
     */
    if (
      !cypher.toLowerCase().includes("limit") &&
      !cypher.includes("{id:")
    ) {
      cypher += "\nLIMIT 10";
    }

    console.log("\n🧠 Generated Cypher:\n", cypher);

    return cypher;
  } catch (error) {
    console.error("❌ LLM Error:", error);
    throw new Error("Failed to generate Cypher query");
  }
}