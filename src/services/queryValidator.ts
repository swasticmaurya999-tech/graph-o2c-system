/**
 * Enhanced Query Validator with Semantic Domain Awareness
 * Prevents out-of-domain queries and validates business context
 */

// Domain-specific keywords organized by semantic category
const DOMAIN_KEYWORDS = {
  // Sales Order related
  salesOrder: ["order", "purchase order", "so", "sales", "quotation"],
  
  // Delivery related
  delivery: ["delivery", "outbound", "shipment", "shipped", "goods movement"],
  
  // Billing/Invoice related
  billing: ["invoice", "billing", "bill", "billing document"],
  
  // Payment related
  payment: ["payment", "paid", "payment status", "clearing"],
  
  // Customer related
  customer: ["customer", "client", "partner", "buyer", "supplier"],
  
  // Product related
  product: ["product", "material", "sku", "item", "good"],
  
  // Journal/Accounting related
  journal: ["journal", "entry", "accounting", "account", "gl account"],
  
  // Process flow related
  flow: ["flow", "trace", "path", "sequence", "process", "journey"],
  
  // Analytical queries
  analysis: ["count", "sum", "total", "highest", "lowest", "most", "which", "how many"],
};

// Forbidden patterns for non-domain queries
const FORBIDDEN_PATTERNS = [
  // Creative requests
  /write.*story|story.*write|poem|creative/i,
  /tell.*joke|joke|funny/i,
  /code.*review|review.*code/i,
  
  // General knowledge
  /what.*is.*[?]|definition|explain.*concept/i,
  /how.*does.*work.*general/i,
  
  // Unrelated topics
  /weather|news|sports|politics|weather/i,
  /pizza|restaurant|food|recipe/i,
  /movie|film|music|entertainment/i,
  
  // System queries
  /who.*are.*you|your.*name|system.*architecture/i,
];

/**
 * Extract domain entities from question
 */
export function extractDomainEntities(question: string): string[] {
  const entities = new Set<string>();
  const lowerQ = question.toLowerCase();

  for (const [category, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQ.includes(keyword)) {
        entities.add(category);
        break;
      }
    }
  }

  return Array.from(entities);
}

/**
 * Check if question matches forbidden patterns
 */
export function matchesForbiddenPattern(question: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(question));
}

/**
 * Enhanced validation with semantic analysis
 */
export function isValidDomainQuestion(question: string): boolean {
  // 1. Check forbidden patterns (hard block)
  if (matchesForbiddenPattern(question)) {
    return false;
  }

  // 2. Check minimum length to avoid trivial queries
  if (question.trim().length < 5) {
    return false;
  }

  // 3. Check for domain entity presence
  const entities = extractDomainEntities(question);
  if (entities.length === 0) {
    return false;
  }

  // 4. Must contain at least one semantic category
  return true;
}

/**
 * Generate user-friendly rejection message based on query type
 */
export function generateRejectionMessage(question: string): string {
  if (matchesForbiddenPattern(question)) {
    return "This system is designed to answer questions about the Order-to-Cash business process only. Please ask about orders, deliveries, invoices, payments, or customers.";
  }

  if (extractDomainEntities(question).length === 0) {
    return "I don't recognize this question as related to the Order-to-Cash process. Try asking about:\n• Sales orders and their status\n• Deliveries and shipments\n• Invoices and payments\n• Customer information\n• Order fulfillment flows";
  }

  return "This query falls outside the scope of the dataset. Please ask about business entities in the Order-to-Cash system.";
}

/**
 * Validate ID format in question (for specific lookups)
 */
export function extractEntityIds(question: string): string[] {
  const ids: string[] = [];
  
  // Look for common ID patterns
  // Sales Order IDs (often numeric)
  const soMatch = question.match(/order\s+(\d+)|so\s+(\d+)|sales\s+order\s+(\d+)/i);
  if (soMatch) {
    ids.push(soMatch[1] || soMatch[2] || soMatch[3]);
  }

  // Customer IDs
  const custMatch = question.match(/customer\s+(\d+)|cust\s+(\d+)|customer\s+id\s+(\d+)/i);
  if (custMatch) {
    ids.push(custMatch[1] || custMatch[2] || custMatch[3]);
  }

  // Delivery IDs
  const delivMatch = question.match(/delivery\s+(\d+)|deliv\s+(\d+)/i);
  if (delivMatch) {
    ids.push(delivMatch[1] || delivMatch[2]);
  }

  // Invoice IDs
  const invMatch = question.match(/invoice\s+(\d+)|bill\s+(\d+)/i);
  if (invMatch) {
    ids.push(invMatch[1] || invMatch[2]);
  }

  return ids;
}

/**
 * Determine query type for better response formatting
 */
export function classifyQueryType(question: string): string {
  const lowerQ = question.toLowerCase();

  // Flow/Trace queries - HIGH VALUE
  if (lowerQ.includes("trace") || lowerQ.includes("flow") || lowerQ.includes("path")) {
    return "FLOW_TRACE";
  }

  // Broken/Incomplete flow detection
  if (
    lowerQ.includes("broken") ||
    lowerQ.includes("incomplete") ||
    lowerQ.includes("missing") ||
    lowerQ.includes("without")
  ) {
    return "ANOMALY_DETECTION";
  }

  // Aggregation/Count queries
  if (
    lowerQ.includes("how many") ||
    lowerQ.includes("count") ||
    lowerQ.includes("total") ||
    lowerQ.includes("highest") ||
    lowerQ.includes("most")
  ) {
    return "AGGREGATION";
  }

  // Relationship/Connection queries
  if (
    lowerQ.includes("related") ||
    lowerQ.includes("connected") ||
    lowerQ.includes("associated")
  ) {
    return "RELATIONSHIP";
  }

  // Standard lookup
  return "LOOKUP";
}

/**
 * 🔥 Validate Cypher syntax - catches LLM-generated invalid queries
 */
export function validateCypherSyntax(cypher: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Basic checks
  if (!cypher || cypher.length < 15) {
    errors.push("Query too short to be valid");
    return { valid: false, errors };
  }

  // Must have MATCH and RETURN
  if (!/^\s*MATCH/i.test(cypher.trim())) {
    errors.push("Query must start with MATCH");
  }

  if (!/\bRETURN\b/i.test(cypher)) {
    errors.push("Query must have RETURN clause");
  }

  // Check for incomplete relationships
  if (/-\[.*\]\s*$/.test(cypher.trim())) {
    errors.push("Incomplete relationship pattern at end");
  }

  // Check for unmatched parentheses
  const openParen = (cypher.match(/\(/g) || []).length;
  const closeParen = (cypher.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    errors.push(`Mismatched parentheses: ${openParen} open, ${closeParen} close`);
  }

  // Check for unmatched brackets
  const openBracket = (cypher.match(/\[/g) || []).length;
  const closeBracket = (cypher.match(/\]/g) || []).length;
  if (openBracket !== closeBracket) {
    errors.push(`Mismatched brackets: ${openBracket} open, ${closeBracket} close`);
  }

  // Check for double LIMIT
  if (/\bLIMIT\s+\d+\s+LIMIT\b/i.test(cypher)) {
    errors.push("Duplicate LIMIT clause");
  }

  // Allow multiple WHERE if properly structured with AND/OR
  // Don't reject - LLM should generate correct WHERE combinations

  return {
    valid: errors.length === 0,
    errors,
  };
}
