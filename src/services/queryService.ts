import { getSession } from "../config/neo4j";
import { generateCypher, generateAnswer } from "./llmService";

/**
 * 🔹 Run full pipeline:
 * User → LLM → Cypher → Neo4j → Answer
 */
export async function runQuery(question: string) {
  const session = getSession();

  try {
    // 1️⃣ Generate Cypher
    const cypher = await generateCypher(question);

    if (!cypher) {
      throw new Error("Failed to generate Cypher query");
    }

    // 2️⃣ Execute Query
    const result = await session.run(cypher);

    const data = result.records.map((record) => record.toObject());

    console.log(`📊 Records returned: ${data.length}`);

    // 3️⃣ Generate Answer
    const answer = await generateAnswer(question, data);

    // 4️⃣ Extract IDs for graph highlighting
    const ids: string[] = [];

    data.forEach((row: any) => {
      Object.values(row).forEach((val: any) => {
        if (val?.properties?.id) {
          ids.push(val.properties.id);
        }
      });
    });

    return {
      answer,
      data,
      cypher,
      ids,
    };
  } catch (error) {
    console.error("❌ Query error:", error);

    return {
      answer: "Sorry, I encountered an error while processing your request.",
      data: [],
      cypher: "",
      ids: [],
    };
  } finally {
    await session.close();
  }
}