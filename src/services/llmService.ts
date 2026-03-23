import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateCypher(question: string): Promise<string> {
  const prompt = `
You are an expert in Neo4j Cypher queries.

Graph Schema:
(Customer)-[:PLACED]->(SalesOrder)
(SalesOrder)-[:FULFILLED_BY]->(Delivery)
(Delivery)-[:BILLED_AS]->(Invoice)
(Customer)-[:MADE_PAYMENT]->(Payment)
(Payment)-[:RECORDED_AS]->(JournalEntry)

Rules:
- Only return valid Cypher query
- Do NOT use exists(variable)
- To check missing relationships use:
  WHERE NOT (node)-[:REL]->()
- Do NOT use markdown (no \`\`\`)
- Do NOT explain anything
- Always return syntactically correct Cypher
- Use LIMIT 10

Examples:

Q: Find orders not delivered
A:
MATCH (s:SalesOrder)
WHERE NOT (s)-[:FULFILLED_BY]->()
RETURN s LIMIT 10

Now generate Cypher for:
"${question}"
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  let cypher = response.choices[0].message.content;

  if (!cypher) {
    throw new Error("LLM returned empty response");
  }

  //  Clean markdown if any
  cypher = cypher
    .replace(/```cypher/g, "")
    .replace(/```/g, "")
    .trim();

  return cypher;
}