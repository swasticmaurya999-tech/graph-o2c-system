import { getSession } from "../config/neo4j";
import { generateCypher, generateAnswer } from "./llmService";
import {
  isValidDomainQuestion,
  generateRejectionMessage,
  validateCypherSyntax,
} from "./queryValidator";

function normalizeNeo4jValue(value: any): any {
  if (value == null) return value;

  // neo4j-driver Integer objects have a toNumber() method.
  if (typeof value === "object" && typeof value.toNumber === "function") {
    try {
      return value.toNumber();
    } catch {
      // If conversion fails (very large numbers), fall back to raw.
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map(normalizeNeo4jValue);
  }

  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeNeo4jValue(v);
    }
    return out;
  }

  return value;
}

function extractIdsFromRow(row: any): string[] {
  const ids: string[] = [];

  const addIfIdLike = (k: string, v: any) => {
    if (v == null) return;
    const key = k.toLowerCase();
    if (!key.endsWith("id") && !key.includes("id")) return;
    if (typeof v === "string") ids.push(v);
    else if (typeof v === "number") ids.push(String(v));
  };

  // 1) Existing behavior: Neo4j nodes returned by the driver.
  Object.values(row).forEach((val: any) => {
    if (val?.properties?.id) {
      ids.push(String(val.properties.id));
    }
  });

  // 2) Primitive/aggregated fields (e.g. orderId, productId).
  for (const [k, v] of Object.entries(row || {})) {
    if (Array.isArray(v)) {
      v.forEach((item) => addIfIdLike(k, item));
    } else {
      addIfIdLike(k, v);
    }
  }

  return Array.from(new Set(ids));
}

export async function runQuery(question: string) {
  const session = getSession();

  try {
    console.log("📥 Question:", question);

    // ✅ Guardrails
    if (!isValidDomainQuestion(question)) {
      return {
        answer: generateRejectionMessage(question),
        data: [],
        cypher: "",
        ids: [],
      };
    }

    // ✅ Generate Cypher
    const lower = question.toLowerCase();
    const isBillingTrace =
      (lower.includes("trace") || lower.includes("flow") || lower.includes("path")) &&
      (lower.includes("billing") || lower.includes("invoice") || lower.includes("bill"));
    if (isBillingTrace) {
      const hasInvoiceId = !!question.match(
        /(?:billing\s*document|billing|invoice|bill)\s*(?:id\s*)?(\d+)/i
      );
      if (!hasInvoiceId) {
        return {
          answer:
            "To trace a billing document flow, please include the billing document/invoice id (digits). Example: 'trace billing document 90504248'.",
          data: [],
          cypher: "",
          ids: [],
        };
      }
    }

    const cypher = await generateCypher(question);
    console.log("🚀 Cypher:\n", cypher);

    // ✅ Basic Cypher safety checks (prevents silent failures)
    const validation = validateCypherSyntax(cypher);
    if (!validation.valid) {
      console.warn("🛑 Cypher rejected:", validation.errors);
      return {
        answer:
          "I couldn't generate a valid database query for that question. Please try rephrasing (or ask for a specific Sales Order id).",
        data: [],
        cypher,
        ids: [],
      };
    }

    // The graph model is intentionally designed so FLOW_TRACE must use INVOICED.
    // If the Cypher contains Delivery-[:BILLED_AS]->Invoice, it will not follow the correct flow.
    if (
      /trace|flow|path/i.test(question) &&
      /:\s*BILLED_AS\b/i.test(cypher)
    ) {
      console.warn("🛑 Disallowed relationship for flow trace detected in Cypher.");
      return {
        answer:
          "I couldn't safely trace that flow with the current graph model. Please ask for a Sales Order id (e.g. 'trace sales order 740584').",
        data: [],
        cypher,
        ids: [],
      };
    }

    // ✅ Execute
    const result = await session.run(cypher);
    const data = result.records.map((r) => r.toObject());
    const normalizedData = data.map((row) => normalizeNeo4jValue(row));

    console.log("📊 Records:", normalizedData.length);

    // ✅ Extract IDs
    const ids = Array.from(
      new Set(normalizedData.flatMap((row: any) => extractIdsFromRow(row)))
    );

    // ✅ Generate Answer
    const answer = await generateAnswer(question, normalizedData);

    return {
      answer,
      data: normalizedData,
      cypher,
      ids,
    };
  } catch (error) {
    console.error("❌ ERROR:", error);

    return {
      answer: "Error processing query",
      data: [],
      cypher: "",
      ids: [],
    };
  } finally {
    await session.close();
  }
}