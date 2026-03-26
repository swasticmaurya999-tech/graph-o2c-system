import dotenv from "dotenv";
import neo4j from "neo4j-driver";

dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME!,
    process.env.NEO4J_PASSWORD!
  )
);

export function getSession() {
  return driver.session();
}

/**
 * 🔥 SAFE Dynamic Schema Fetch - Query actual data relationships
 */

type SchemaType = {
  nodes: string[];
  relationships: string[];
};

export async function getSchema(): Promise<SchemaType> {
  const session = getSession();

  try {
    // Get node labels
    const nodeResult = await session.run(`
      CALL db.labels() YIELD label
      RETURN collect(label) as labels
    `);

    const labels = nodeResult.records[0]?.get("labels") || [];

    // Get actual relationship patterns from data
    const relResult = await session.run(`
      MATCH (a)-[r]-(b)
      RETURN DISTINCT 
        labels(a)[0] as startLabel,
        type(r) as relType,
        labels(b)[0] as endLabel
      LIMIT 50
    `);

    let schema: SchemaType = { nodes: [], relationships: [] };
    labels.forEach((label: string) => {
      schema.nodes.push(label);
    });

    schema.relationships = [];
    const seenRels = new Set<string>();
    
    relResult.records.forEach((record) => {
      const start = record.get("startLabel");
      const type = record.get("relType");
      const end = record.get("endLabel");
      const relStr = `(${start})-[:${type}]->(${end})`;
      
      if (!seenRels.has(relStr)) {
        schema.relationships.push(relStr);
        seenRels.add(relStr);
      }
    });

    console.log("📊 Schema Loaded:\n", schema);

    return schema;
  } catch (err) {
    console.error("Schema fetch error:", err);
    return { nodes: [], relationships: [] };
  } finally {
    await session.close();
  }
}