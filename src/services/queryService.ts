import { getSession } from "../config/neo4j";
import { generateCypher } from "./llmService";

//  Guardrails: restrict domain
function isValidQuestion(question: string): boolean {
  const allowedKeywords = [
    "order",
    "delivery",
    "invoice",
    "payment",
    "customer",
    "sales",
  ];

  return allowedKeywords.some((word) =>
    question.toLowerCase().includes(word)
  );
}

//  Generate human-readable answer
function generateAnswer(question: string, data: any[]) {
  const q = question.toLowerCase();

  if (data.length === 0) {
    return "No matching records found in the dataset.";
  }

  if (q.includes("not delivered")) {
    return `Found ${data.length} sales orders that have not been delivered yet, indicating pending fulfillment in the order-to-cash process.`;
  }

  if (q.includes("delivery")) {
    return `Retrieved ${data.length} delivery-related records.`;
  }

  if (q.includes("invoice")) {
    return `Found ${data.length} invoice records associated with the query.`;
  }

  if (q.includes("payment")) {
    return `Retrieved ${data.length} payment records.`;
  }

  return `Query executed successfully. Found ${data.length} results.`;
}

//  Validate generated Cypher (basic safety)
function validateCypher(query: string) {
  const forbiddenPatterns = ["exists(", "```", "DROP", "DELETE"];

  for (const pattern of forbiddenPatterns) {
    if (query.toLowerCase().includes(pattern.toLowerCase())) {
      throw new Error("Unsafe or invalid Cypher query generated");
    }
  }
}

export async function runQuery(question: string) {
  
  if (!isValidQuestion(question)) {
    return {
      error:
        "This system is designed to answer questions related to the provided business dataset only.",
    };
  }

  //  Generate Cypher
  const cypher = await generateCypher(question);

  console.log("\n Generated Cypher:\n", cypher);

  //  Validate query
  validateCypher(cypher);

  const session = getSession();

  try {
    const result = await session.run(cypher);

    //  Clean Neo4j output
    const cleaned = result.records.map((record) => {
      const obj = record.toObject();
      const cleanedObj: any = {};

      for (const key in obj) {
        if (obj[key]?.properties) {
          cleanedObj[key] = obj[key].properties;
        } else {
          cleanedObj[key] = obj[key];
        }
      }

      return cleanedObj;
    });

    //  Human answer
    const answer = generateAnswer(question, cleaned);

    return {
      question,
      answer,
      cypher, // keep for debugging/demo
      results: cleaned,
    };
  } catch (error) {
    console.error(" Query Execution Error:", error);

    return {
      question,
      cypher,
      error: "Failed to execute query",
    };
  } finally {
    await session.close();
  }
}