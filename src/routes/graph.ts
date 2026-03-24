import { Router } from "express";
import { getSession } from "../config/neo4j";

const router = Router();

router.get("/", async (req, res) => {
  const session = getSession();

  try {
    // Improved query to get all nodes and relationships
    const result = await session.run(`
      MATCH (n)
      OPTIONAL MATCH (n)-[r]->(m)
      RETURN DISTINCT n, r, m
      LIMIT 500
    `);

    const nodesMap = new Map();
    const linksMap = new Map(); // Use Map for better deduplication

    result.records.forEach((record) => {
      const nNode = record.get("n");
      const rRelationship = record.get("r");
      const mNode = record.get("m");

      // Add source node
      if (nNode) {
        const nProps = nNode.properties;
        nodesMap.set(nProps.id, {
          id: nProps.id,
          label: nNode.labels[0] || "Node",
          ...nProps,
        });
      }

      // Add target node and relationship if they exist
      if (mNode && rRelationship) {
        const mProps = mNode.properties;
        nodesMap.set(mProps.id, {
          id: mProps.id,
          label: mNode.labels[0] || "Node",
          ...mProps,
        });

        // Use Map with unique key for deduplication
        const linkKey = `${nNode.properties.id}-${mNode.properties.id}`;
        linksMap.set(linkKey, {
          source: nNode.properties.id,
          target: mNode.properties.id,
          type: rRelationship.type,
        });
      }
    });

    // Convert Map to array
    const links = Array.from(linksMap.values());

    console.log(`Graph data: ${nodesMap.size} nodes, ${links.length} links`);

    res.json({
      nodes: Array.from(nodesMap.values()),
      links,
    });
  } catch (error) {
    console.error("Graph fetch error:", error);
    res.status(500).json({ error: "Graph fetch failed" });
  } finally {
    await session.close();
  }
});

// 🔥 New endpoint to check data in Neo4j
router.get("/stats", async (req, res) => {
  const session = getSession();

  try {
    const nodeCount = await session.run("MATCH (n) RETURN count(n) as count");
    const relationshipCount = await session.run(
      "MATCH ()-[r]->() RETURN count(r) as count"
    );
    const nodeTypes = await session.run(
      "MATCH (n) RETURN DISTINCT labels(n) as labels, count(n) as count"
    );

    res.json({
      totalNodes: nodeCount.records[0].get("count").toNumber(),
      totalRelationships: relationshipCount.records[0].get("count").toNumber(),
      nodesByType: nodeTypes.records.map((r) => ({
        type: r.get("labels")[0],
        count: r.get("count").toNumber(),
      })),
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    res.status(500).json({ error: "Stats fetch failed" });
  } finally {
    await session.close();
  }
});

export default router;