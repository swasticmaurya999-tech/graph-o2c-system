import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function extractSalesOrderId(question: string): string | null {
  // Examples: "trace sales order 740584", "so 740584"
  const m = question.match(/(?:order|so|sales\s+order)\s+(\d+)/i);
  return m?.[1] || null;
}

function extractCustomerId(question: string): string | null {
  // Examples: "customer 310000108", "customer id 310000108", "for customer 310000108"
  const m =
    question.match(
      /(?:customer\s*id|customer|for\s+customer|of\s+customer)\s*(?:id\s*)?(\d+)/i
    ) || null;
  return m?.[1] || null;
}

function extractInvoiceId(question: string): string | null {
  // Examples:
  // - "Trace the full flow of billing document 90504248"
  // - "invoice 90504248"
  // - "bill 90504248"
  const m =
    question.match(
      /(?:billing\s*document|billing|invoice|bill)\s*(?:id\s*)?(\d+)/i
    ) || question.match(/(?:doc)\s+(\d+)/i);
  return m?.[1] || null;
}

function isFlowTraceQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return q.includes("trace") || q.includes("flow") || q.includes("path");
}

function isBillingDocumentTraceQuestion(question: string): boolean {
  const q = question.toLowerCase();
  const isTrace = q.includes("trace") || q.includes("flow") || q.includes("path");
  const mentionsBilling = q.includes("billing") || q.includes("invoice") || q.includes("bill");
  return isTrace && mentionsBilling;
}

function buildFlowTraceCypher(salesOrderId: string): string {
  // Use only validated template edges for the Order-to-Cash flow.
  return `
MATCH (o:SalesOrder {id: "${salesOrderId}"})
OPTIONAL MATCH (o)-[:FULFILLED_BY]->(d:Delivery)
OPTIONAL MATCH (o)-[:INVOICED]->(i:Invoice)
OPTIONAL MATCH (i)-[:RECORDED_AS]->(j:JournalEntry)
RETURN o,d,i,j LIMIT 20
`.trim();
}

function buildBillingDocumentFlowTraceCypher(invoiceId: string): string {
  // Trace flow starting from Invoice (Billing document):
  // SalesOrder -> Delivery -> Billing(Invoice) -> JournalEntry
  // Valid edges in this graph:
  // - SalesOrder-[:INVOICED]->Invoice
  // - SalesOrder-[:FULFILLED_BY]->Delivery
  // - Invoice-[:RECORDED_AS]->JournalEntry
  return `
MATCH (i:Invoice {id: "${invoiceId}"})
MATCH (o:SalesOrder)-[:INVOICED]->(i)
OPTIONAL MATCH (o)-[:FULFILLED_BY]->(d:Delivery)
OPTIONAL MATCH (i)-[:RECORDED_AS]->(j:JournalEntry)
RETURN o,d,i,j LIMIT 20
`.trim();
}

function buildDeliveredNotBilledCypher(): string {
  // Broken flow: delivered (has deliveries) but not billed (no invoice).
  return `
MATCH (o:SalesOrder)
WHERE (o)-[:FULFILLED_BY]->()
  AND NOT (o)-[:INVOICED]->()
OPTIONAL MATCH (o)-[:FULFILLED_BY]->(d:Delivery)
RETURN o.id as orderId, collect(DISTINCT d.id) as deliveryIds
LIMIT 50
`.trim();
}

function buildNotDeliveredCypher(): string {
  // Broken flow: no deliveries, but there may be invoices.
  return `
MATCH (o:SalesOrder)
WHERE NOT (o)-[:FULFILLED_BY]->()
OPTIONAL MATCH (o)-[:INVOICED]->(i:Invoice)
RETURN o.id as orderId, collect(DISTINCT i.id) as invoiceIds
LIMIT 50
`.trim();
}

function buildBilledWithoutDeliveryCypher(): string {
  // Broken flow: billed (has invoices) but not delivered (no delivery edges).
  return `
MATCH (o:SalesOrder)
WHERE (o)-[:INVOICED]->()
  AND NOT (o)-[:FULFILLED_BY]->()
OPTIONAL MATCH (o)-[:INVOICED]->(i:Invoice)
RETURN o.id as orderId, collect(DISTINCT i.id) as invoiceIds
LIMIT 50
`.trim();
}

function buildProductAnalysisCypher(): string {
  // Example: "highest number of billing documents" per product.
  return `
MATCH (i:Invoice)-[:CONTAINS]->(ii:InvoiceItem)-[:FOR_PRODUCT]->(p:Product)
RETURN p.id as productId, count(DISTINCT i.id) as billingDocuments
ORDER BY billingDocuments DESC
LIMIT 10
`.trim();
}

function buildSalesOrderLookupCypher(salesOrderId: string): string {
  // Deterministic "show sales order <id>" style lookup, includes product+flow info.
  return `
MATCH (o:SalesOrder {id: "${salesOrderId}"})
OPTIONAL MATCH (o)-[:FULFILLED_BY]->(d:Delivery)
OPTIONAL MATCH (o)-[:INVOICED]->(i:Invoice)
OPTIONAL MATCH (i)-[:RECORDED_AS]->(j:JournalEntry)
OPTIONAL MATCH (o)-[:CONTAINS]->(oi:OrderItem)
OPTIONAL MATCH (oi)-[:FOR_PRODUCT]->(p:Product)
RETURN o,d,i,j,oi,p LIMIT 20
`.trim();
}

function buildAllCustomersCypher(): string {
  return `
MATCH (c:Customer)
RETURN c LIMIT 50
`.trim();
}

function buildCustomerOrdersCypher(customerId: string): string {
  // Customer -> SalesOrder plus the optional flow to help analytics answers.
  return `
MATCH (c:Customer {id: "${customerId}"})-[:PLACED]->(o:SalesOrder)
OPTIONAL MATCH (o)-[:FULFILLED_BY]->(d:Delivery)
OPTIONAL MATCH (o)-[:INVOICED]->(i:Invoice)
OPTIONAL MATCH (i)-[:RECORDED_AS]->(j:JournalEntry)
OPTIONAL MATCH (o)-[:CONTAINS]->(oi:OrderItem)
OPTIONAL MATCH (oi)-[:FOR_PRODUCT]->(p:Product)
RETURN c,o,d,i,j,oi,p LIMIT 100
`.trim();
}

/**
 * 🎯 STEP 1: INTENT CLASSIFICATION (LLM)
 */
async function classifyIntent(question: string): Promise<string> {
  const prompt = `
Classify the user query into ONE of these labels:

LOOKUP_ORDER
FLOW_TRACE
DELIVERED_NOT_BILLED
NOT_DELIVERED
PRODUCT_ANALYSIS

Return ONLY the label.

Query:
${question}
`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return res.choices[0]?.message?.content?.trim() || "LOOKUP_ORDER";
}

/**
 * 🎯 STEP 2: SAFE CYPHER GENERATION (NO HALLUCINATION)
 */
export async function generateCypher(question: string): Promise<string> {
  // Deterministic templates for common question types.
  // This prevents the LLM from producing subtly wrong relationship paths
  // (e.g. using Delivery-[:BILLED_AS]->Invoice instead of SalesOrder-[:INVOICED]->Invoice).
  const lower = question.toLowerCase();
  const salesOrderId = extractSalesOrderId(question);
  const invoiceId = extractInvoiceId(question);
  const customerId = extractCustomerId(question);

  // Prefer billing-document trace when the question mentions billing/invoice.
  if (isBillingDocumentTraceQuestion(question) && invoiceId) {
    const cypher = buildBillingDocumentFlowTraceCypher(invoiceId);
    console.log("🛡️ Deterministic BILLING_DOCUMENT_FLOW_TRACE Cypher:\n", cypher);
    return cypher;
  }

  // Order-to-cash trace when question explicitly traces a sales order id.
  if (isFlowTraceQuestion(question) && salesOrderId && !isBillingDocumentTraceQuestion(question)) {
    const cypher = buildFlowTraceCypher(salesOrderId);
    console.log("🛡️ Deterministic FLOW_TRACE Cypher:\n", cypher);
    return cypher;
  }

  if (
    lower.includes("delivered") &&
    (lower.includes("not billed") ||
      (lower.includes("without") &&
        (lower.includes("billed") || lower.includes("invoice") || lower.includes("billing"))))
  ) {
    const cypher = buildDeliveredNotBilledCypher();
    console.log("🛡️ Deterministic DELIVERED_NOT_BILLED Cypher:\n", cypher);
    return cypher;
  }

  if (
    (lower.includes("billed") || lower.includes("invoiced") || lower.includes("invoice") || lower.includes("billing")) &&
    lower.includes("without") &&
    lower.includes("delivery") &&
    customerId == null // no-op, just keeps this block distinct
  ) {
    const cypher = buildBilledWithoutDeliveryCypher();
    console.log("🛡️ Deterministic BILLED_WITHOUT_DELIVERY Cypher:\n", cypher);
    return cypher;
  }

  if (
    lower.includes("not delivered") ||
    lower.includes("undelivered") ||
    (lower.includes("without") && lower.includes("delivery"))
  ) {
    const cypher = buildNotDeliveredCypher();
    console.log("🛡️ Deterministic NOT_DELIVERED Cypher:\n", cypher);
    return cypher;
  }

  if (
    (lower.includes("highest") || lower.includes("most") || lower.includes("top")) &&
    lower.includes("billing") &&
    lower.includes("product")
  ) {
    const cypher = buildProductAnalysisCypher();
    console.log("🛡️ Deterministic PRODUCT_ANALYSIS Cypher:\n", cypher);
    return cypher;
  }

  // "Show me sales order <id>" (lookup + optional flow + products)
  if (
    salesOrderId &&
    (lower.includes("show") ||
      lower.includes("detail") ||
      lower.includes("describe") ||
      lower.includes("information") ||
      lower.includes("sales order"))
  ) {
    const cypher = buildSalesOrderLookupCypher(salesOrderId);
    console.log("🛡️ Deterministic SALES_ORDER_LOOKUP Cypher:\n", cypher);
    return cypher;
  }

  // Customer list
  if (lower.includes("all customers") || (lower.includes("list") && lower.includes("customers"))) {
    const cypher = buildAllCustomersCypher();
    console.log("🛡️ Deterministic ALL_CUSTOMERS Cypher:\n", cypher);
    return cypher;
  }

  // Orders made by a given customer id
  if (
    customerId &&
    (lower.includes("orders made") ||
      (lower.includes("all") && lower.includes("orders")) ||
      (lower.includes("orders") && lower.includes("customer")) ||
      lower.includes("placed"))
  ) {
    const cypher = buildCustomerOrdersCypher(customerId);
    console.log("🛡️ Deterministic CUSTOMER_ORDERS Cypher:\n", cypher);
    return cypher;
  }

  const prompt = `
You are a Neo4j Cypher generator.

---

REAL GRAPH (STRICT — DO NOT BREAK):

(Customer)-[:PLACED]->(SalesOrder)

(SalesOrder)-[:FULFILLED_BY]->(Delivery)

(SalesOrder)-[:INVOICED]->(Invoice)   ⭐ ONLY VALID WAY TO GET INVOICE

(Invoice)-[:RECORDED_AS]->(JournalEntry)

(SalesOrder)-[:CONTAINS]->(OrderItem)
(OrderItem)-[:FOR_PRODUCT]->(Product)

---

🚨 CRITICAL RULES (VERY IMPORTANT)

1. NEVER use Delivery → Invoice
   ❌ (Delivery)-[:BILLED_AS]->(Invoice)
   THIS IS INVALID FOR QUERYING

2. ALWAYS use:
   ✅ (SalesOrder)-[:INVOICED]->(Invoice)

3. ALWAYS start from SalesOrder

4. ALWAYS use OPTIONAL MATCH for flows

5. IDs are strings → {id: "740584"}

6. NEVER create loops

---

✅ CORRECT PATTERN:

MATCH (o:SalesOrder {id: "740584"})
OPTIONAL MATCH (o)-[:FULFILLED_BY]->(d:Delivery)
OPTIONAL MATCH (o)-[:INVOICED]->(i:Invoice)
OPTIONAL MATCH (i)-[:RECORDED_AS]->(j:JournalEntry)
RETURN o,d,i,j LIMIT 20

---

User Question:
${question}

---

Return ONLY Cypher.
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You generate ONLY valid Cypher queries using given templates.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
  });

  let cypher = response.choices[0]?.message?.content || "";

  cypher = cypher
    .replace(/```cypher/g, "")
    .replace(/```/g, "")
    .trim();

  console.log("🧠 FINAL CYPHER:\n", cypher);

  return cypher;
}
/**
 * 🎯 STEP 3: ANSWER GENERATION
 */
export async function generateAnswer(
  question: string,
  data: any[]
): Promise<string> {
  if (!data || data.length === 0) {
    return "No exact match found. Try a different query or check IDs.";
  }

  const prompt = `
You are a business analyst.

Question:
${question}

Data:
${JSON.stringify(data).slice(0, 2000)}

Give a short, clear answer.
`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return res.choices[0]?.message?.content || "No answer found.";
}