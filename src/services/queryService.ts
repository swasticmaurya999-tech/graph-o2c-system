import { getSession } from "../config/neo4j";
import { generateCypher } from "./llmService";
import {
  isValidDomainQuestion,
  generateRejectionMessage,
  classifyQueryType,
  extractEntityIds,
} from "./queryValidator";
import { extractEntity, formatEntityList, getEntitySummary } from "./entityExtractor";
//  Generate human-readable answer with context-awareness
function generateAnswer(question: string, data: any[], cypher: string = "") {
  const q = question.toLowerCase();
  const queryType = classifyQueryType(question);

  if (data.length === 0) {
    return "No matching records found in the dataset. Try a different query or check the spelling.";
  }

  let summary = "";
  let detailedContent = "";

  // Type-specific answer generation
  switch (queryType) {
    case "FLOW_TRACE": {
      summary = `✅ Complete Order-to-Cash Flow:\n`;
      detailedContent = formatEntityList(data);
      return `${summary}${detailedContent}\n\nThis shows the complete path from order placement through delivery and billing.`;
    }

    case "ANOMALY_DETECTION": {
      const recordCount = data.length;
      if (q.includes("broken") || q.includes("incomplete")) {
        summary = `⚠️ Found ${recordCount} record${recordCount !== 1 ? "s" : ""} with incomplete or broken flow:\n`;
      } else if (q.includes("not delivered") || q.includes("undelivered")) {
        summary = `📦 Found ${recordCount} order${recordCount !== 1 ? "s" : ""} that have NOT been delivered:\n`;
      } else if (q.includes("not billed") || q.includes("unbilled")) {
        summary = `📄 Found ${recordCount} record${recordCount !== 1 ? "s" : ""} that have NOT been billed:\n`;
      } else {
        summary = `⚠️ Found ${recordCount} potential anomalies:\n`;
      }
      detailedContent = formatEntityList(data);
      return `${summary}${detailedContent}\n\nThese entities indicate process gaps in the Order-to-Cash flow.`;
    }

    case "AGGREGATION": {
      // Check if data contains aggregation results (typically with count/sum fields)
      const firstRecord = data[0];
      if (firstRecord && Object.keys(firstRecord).length > 1) {
        // Has multiple columns - likely aggregation
        const recordCount = data.length;
        summary = `📊 Aggregation Results (${recordCount} record${recordCount !== 1 ? "s" : ""}):\n`;
        
        // Format as structured data
        const lines = data.map((row, idx) => {
          const fields = Object.entries(row)
            .map(([key, val]) => `${key}: ${val}`)
            .join(" | ");
          return `${idx + 1}. ${fields}`;
        });
        
        detailedContent = lines.join("\n");
        return `${summary}${detailedContent}`;
      }
      // Fallback to entity list if not structured aggregation
      summary = `📊 Query Results (${data.length} items):\n`;
      detailedContent = formatEntityList(data);
      return `${summary}${detailedContent}`;
    }

    case "RELATIONSHIP": {
      summary = `🔗 Found ${data.length} related record${data.length !== 1 ? "s" : ""}:\n`;
      detailedContent = formatEntityList(data);
      return `${summary}${detailedContent}`;
    }

    default: {
      // Standard lookup
      summary = `✓ Found ${data.length} record${data.length !== 1 ? "s" : ""}:\n`;
      detailedContent = formatEntityList(data);
      return `${summary}${detailedContent}`;
    }
  }
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
  // 1. VALIDATE - Enhanced domain awareness
  if (!isValidDomainQuestion(question)) {
    return {
      error: generateRejectionMessage(question),
    };
  }

  // 2. EXTRACT - Entity IDs for potential specific lookups
  const entityIds = extractEntityIds(question);
  console.log("📌 Detected entities:", entityIds);

  // 3. CLASSIFY - Query type for better response formatting
  const queryType = classifyQueryType(question);
  console.log("🏷️  Query Type:", queryType);

  // 4. GENERATE - Cypher from question
  const cypher = await generateCypher(question);
  console.log("\n🔍 Generated Cypher:\n", cypher);

  // 5. VALIDATE - Query safety
  validateCypher(cypher);

  const session = getSession();

  try {
    const result = await session.run(cypher);

    // 6. CLEAN - Neo4j output normalization
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

    // 7. ANSWER - Human-readable response with context
    const answer = generateAnswer(question, cleaned, cypher);

    // 8. EXTRACT IDS - For visualization
    const ids: string[] = cleaned
      .map((r) => {
        const entity = extractEntity(r);
        return entity?.id || null;
      })
      .filter((id) => id !== null);

    return {
      question,
      queryType,
      answer,
      cypher,
      data: cleaned,
      ids,
      success: true,
    };
  } catch (error) {
    console.error("❌ Query Execution Error:", error);

    return {
      question,
      queryType,
      cypher,
      error:
        "Failed to execute query: " +
        (error instanceof Error ? error.message : "Unknown error"),
      success: false,
    };
  } finally {
    await session.close();
  }
}