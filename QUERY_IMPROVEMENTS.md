# Query Retrieval & Validation Improvements - Technical Documentation

## Executive Summary

The chat query system has been enhanced with **improved accuracy, better guardrails, and comprehensive query type support**. Key improvements include:

1. **Enhanced Query Validation** - Semantic domain awareness with entity recognition
2. **Complete Schema Definition** - All 8 node types and relationships documented
3. **Intelligent Query Classification** - 5 query types with specialized response formatting
4. **Entity Extraction** - Smart entity recognition and formatted output
5. **Better Error Handling** - User-friendly rejection messages for out-of-domain queries

---

## Architecture Overview

### Request Flow

```
User Query
    ↓
[1] Query Validation (isValidDomainQuestion)
    ↓ PASS/FAIL
[2] Entity Extraction & Classification
    ↓
[3] Cypher Generation (LLM with enhanced schema)
    ↓
[4] Query Execution (Neo4j)
    ↓
[5] Response Formatting (Context-aware)
    ↓
User Response + Visualization IDs
```

---

## Component Details

### 1. Query Validator (`src/services/queryValidator.ts`)

**Purpose**: Enforce strict domain boundaries and classify query types

#### Validation Layers:

```typescript
// Layer 1: Forbidden Pattern Detection
- Creative requests (stories, jokes, code reviews)
- General knowledge questions
- Unrelated topics (weather, sports, food)
- System meta-queries

// Layer 2: Domain Entity Recognition
- Categorizes queries by business domain
- Checks for presence of domain keywords
- Extracts specific entity IDs when present

// Layer 3: Minimum Semantic Threshold
- Rejects trivial queries (< 5 chars)
- Requires at least one semantic category
```

#### Key Functions:

| Function | Purpose |
|----------|---------|
| `isValidDomainQuestion()` | Main validation gate (returns boolean) |
| `extractDomainEntities()` | Identifies query business domains |
| `matchesForbiddenPattern()` | Blocks non-domain queries |
| `generateRejectionMessage()` | Helpful rejection with guidance |
| `extractEntityIds()` | Parses specific IDs from query |
| `classifyQueryType()` | Determines response format strategy |

#### Query Type Classification:

| Type | Pattern | Response Format |
|------|---------|-----------------|
| `FLOW_TRACE` | "trace", "flow", "path" | Complete process chain visualization |
| `ANOMALY_DETECTION` | "broken", "incomplete", "missing" | Flagged issues with explanations |
| `AGGREGATION` | "count", "sum", "total", "highest" | Structured data tables |
| `RELATIONSHIP` | "related", "connected", "associated" | Entity relationship display |
| `LOOKUP` | Standard queries | Standard entity list |

---

### 2. Entity Extractor (`src/services/entityExtractor.ts`)

**Purpose**: Intelligent entity recognition and formatted display

#### Entity Types Recognized:

| Type | Emoji | Key Properties |
|------|-------|-----------------|
| SalesOrder | 🛒 | amount, currency, dates, status |
| Delivery | 📦 | status, shipping point, dates |
| Invoice | 📄 | amount, type, cancellation status |
| Payment | 💳 | amount, GL account, clearing dates |
| Customer | 👤 | name, category, grouping |
| Product | 🏭 | material group, plant |
| JournalEntry | 📊 | GL account, profit center |
| OrderItem | (generic) | quantity, amount |

#### Smart Features:

- **Automatic type detection** from properties
- **Context-aware formatting** (emojis + structured data)
- **Safe null handling** (no crashes on malformed data)
- **Entity summary statistics** (count by type)

#### Example Output:

```
1. 🛒 Sales Order | ID: 740584 | Amount: INR 50000.00 | Status: OPEN | Date: Nov 19, 2025
2. 📦 Delivery | ID: 840001 | Status: COMPLETED | Ship Point: DC01 | Date: Nov 20, 2025
3. 📄 Invoice | ID: 1000001 | Amount: INR 50000.00 | Type: ZF2 | Date: Nov 21, 2025
4. 💳 Payment | ID: 2000001 | Amount: 50000.00 | GL Account: 1200 | Cleared: Nov 25, 2025
```

---

### 3. Enhanced LLM Service (`src/services/llmService.ts`)

**Changes Made:**

#### Before:
- Limited 9-node schema
- 5 basic examples
- Missing relationships (Plant, AssignmentS)
- No aggregation/anomaly examples

#### After:
- **Complete schema** with all 8 nodes + properties
- **9 examples** covering all query types:
  - Lookups
  - Flow tracing
  - Aggregations
  - Anomaly detection
- **Clear rules** about relationships & functions
- **Better context** about the Order-to-Cash process

#### New System Prompt Sections:

1. **DATABASE SCHEMA** - All nodes with key properties
2. **RELATIONSHIPS** - Correct cardinality & direction
3. **RULES** - Critical Cypher guidelines
4. **EXAMPLES** - Categorized by query type

#### Example Queries Now Supported:

```cypher
# Aggregation (NEW)
MATCH (oi:OrderItem)-[:FOR_PRODUCT]->(p:Product)
MATCH (oi:OrderItem)-->(o:SalesOrder)-[:FULFILLED_BY]->(d:Delivery)-[:BILLED_AS]->(i:Invoice)
RETURN p.id, COUNT(DISTINCT i.id) as invoice_count

# Flow Tracing (NEW)
MATCH (s:SalesOrder {id: "740584"})-[:FULFILLED_BY]->(d:Delivery)-[:BILLED_AS]->(i:Invoice)-[:RECORDED_AS]->(j:JournalEntry)
RETURN s, d, i, j

# Anomaly Detection (NEW)
MATCH (s:SalesOrder)-[:FULFILLED_BY]->(d:Delivery)
WHERE NOT (d)-[:BILLED_AS]->()
RETURN s
```

---

### 4. Improved Query Service (`src/services/queryService.ts`)

**Main Changes:**

#### Before:
- Simple keyword matching for validation
- Rigid rule-based answer generation
- Limited ID extraction
- Poor error messages

#### After:
- Uses semantic validator
- Type-aware response formatting
- Proper entity extraction & ID collection
- Helpful error guidance
- Query classification for debugging

#### Execution Pipeline:

```typescript
1. VALIDATE   → isValidDomainQuestion()
2. EXTRACT    → extractEntityIds(), entityExtractor
3. CLASSIFY   → classifyQueryType()
4. GENERATE   → generateCypher() via LLM
5. VALIDATE   → validateCypher()
6. EXECUTE    → session.run()
7. CLEAN      → Normalize Neo4j output
8. ANSWER     → generateAnswer with context
9. RETURN     → Enhanced response object
```

#### Response object now includes:

```typescript
{
  question: string,
  queryType: "FLOW_TRACE" | "ANOMALY_DETECTION" | "AGGREGATION" | "RELATIONSHIP" | "LOOKUP",
  answer: string,        // Human-readable formatted response
  cypher: string,        // Generated query (for debugging)
  data: any[],          // Raw Neo4j records
  ids: string[],        // Extracted entity IDs (for visualization)
  success: boolean,
  error?: string
}
```

---

## Usage Examples

### Example 1: Flow Tracing ✅

**Query**: "Trace the complete flow of sales order 740584"

**Validation**: ✓ Contains required keywords ("trace", "sales order")
**Type**: `FLOW_TRACE`
**Cypher Generated**:
```cypher
MATCH (s:SalesOrder {id: "740584"})-[:FULFILLED_BY]->(d:Delivery)-[:BILLED_AS]->(i:Invoice)-[:RECORDED_AS]->(j:JournalEntry)
RETURN s, d, i, j
```

**Response**:
```
✅ Complete Order-to-Cash Flow:
1. 🛒 Sales Order | ID: 740584 | Amount: INR 50000.00 | Status: COMPLETED | Date: Nov 19, 2025
2. 📦 Delivery | ID: 840001 | Status: COMPLETED | Ship Point: DC01 | Date: Nov 20, 2025
3. 📄 Invoice | ID: 1000001 | Amount: INR 50000.00 | Type: ZF2 | Date: Nov 21, 2025
4. 📊 Journal Entry | ID: 4000001 | GL: 1200 | Amount: 50000.00 | Type: AA

This shows the complete path from order placement through delivery and billing.
```

---

### Example 2: Anomaly Detection ⚠️

**Query**: "Show me orders delivered but not billed"

**Validation**: ✓ Contains "not billed" (anomaly pattern)
**Type**: `ANOMALY_DETECTION`
**Cypher Generated**:
```cypher
MATCH (s:SalesOrder)-[:FULFILLED_BY]->(d:Delivery)
WHERE NOT (d)-[:BILLED_AS]->()
RETURN s LIMIT 10
```

**Response**:
```
⚠️ Found 3 records with incomplete or broken flow:
1. 🛒 Sales Order | ID: 740585 | Amount: INR 25000.00 | Status: COMPLETED | Date: Nov 20, 2025
2. 🛒 Sales Order | ID: 740586 | Amount: INR 15000.00 | Status: COMPLETED | Date: Nov 21, 2025
3. 🛒 Sales Order | ID: 740587 | Amount: INR 30000.00 | Status: COMPLETED | Date: Nov 22, 2025

These entities indicate process gaps in the Order-to-Cash flow.
```

---

### Example 3: Rejected Query ❌

**Query**: "Tell me a joke about pizza"

**Validation**: ✗ Matches forbidden pattern (creative + food)
**Response**:
```
⚠️ This system is designed to answer questions about the Order-to-Cash business process only. 
Please ask about:
• Sales orders and their status
• Deliveries and shipments
• Invoices and payments
• Customer information
• Order fulfillment flows
```

---

### Example 4: Aggregation 📊

**Query**: "Which products are in the most billing documents?"

**Validation**: ✓ Contains "most" (aggregation) + "products" + "billing"
**Type**: `AGGREGATION`
**Cypher Generated**:
```cypher
MATCH (oi:OrderItem)-[:FOR_PRODUCT]->(p:Product)
MATCH (oi:OrderItem)-->(o:SalesOrder)-[:FULFILLED_BY]->(d:Delivery)-[:BILLED_AS]->(i:Invoice)
RETURN p.id, COUNT(DISTINCT i.id) as invoice_count
ORDER BY invoice_count DESC
LIMIT 10
```

**Response**:
```
📊 Aggregation Results (5 records):
1. p.id: PROD001 | invoice_count: 152
2. p.id: PROD002 | invoice_count: 148
3. p.id: PROD003 | invoice_count: 131
4. p.id: PROD004 | invoice_count: 125
5. p.id: PROD005 | invoice_count: 119
```

---

## Query Accuracy Improvements

### What's Better:

| Aspect | Before | After |
|--------|--------|-------|
| **Guardrails** | 6 hardcoded keywords | Semantic domain analysis + forbidden patterns |
| **Schema Completeness** | 9 nodes, basic relationships | All entities + complete relationship map |
| **Query Examples** | 5 basic lookups | 9 examples covering 5 query types |
| **Aggregations** | Not supported | Fully supported with proper formatting |
| **Anomaly Detection** | Basic pattern matching | Dedicated anomaly query type |
| **Entity Recognition** | Property guessing | Smart type detection + formatting |
| **Error Messages** | Generic rejection | Contextual guidance + suggestions |
| **Response Format** | Rigid templates | Type-aware dynamic formatting |

---

## Configuration & Tuning

### Validator Configuration

Edit `src/services/queryValidator.ts`:

```typescript
const DOMAIN_KEYWORDS = {
  // Add/remove keywords per category
  salesOrder: ["order", "purchase order", "so"],
  // ...
};

const FORBIDDEN_PATTERNS = [
  // Add patterns for new blocklist items
  /tell.*joke|joke/i,
];
```

### Entity Type Detection

Edit `src/services/entityExtractor.ts`:

```typescript
function detectEntityType(properties): EntityType {
  // Tune property-based detection logic
  // Add new entity types as needed
}
```

### LLM Prompt

Edit `src/services/llmService.ts`:

```typescript
const SYSTEM_PROMPT = `
  // Update schema section with new entities
  // Add examples for new query patterns
  // Adjust rules as needed
`;
```

---

## Testing Queries

### ✅ Valid Domain Queries (Should Pass)

```
1. "What sales orders are pending delivery?"
2. "Show me invoice 1000001"
3. "Trace the full flow of order 740584"
4. "Which products are billed most frequently?"
5. "Find customers who haven't paid yet"
6. "Orders delivered but not invoiced"
7. "Total payment amount by customer"
8. "Show me all deliveries from plant DC01"
```

### ❌ Invalid Queries (Should Be Rejected)

```
1. "Tell me a joke"                      → Creative request
2. "What's the weather?"                 → Unrelated topic
3. "How do i make pizza?"                → Off-topic
4. "Explain quantum computing"           → General knowledge
5. "Code review my function"             → System meta-query
6. "write a poem about business"         → Creative writing
```

---

## Future Enhancements

### Potential Improvements:

1. **Query Suggestion Autocomplete** - ML-based suggestions as user types
2. **Query History & Analytics** - Track common queries, user patterns
3. **Natural Language Fallback** - When Cypher fails, generate explanations
4. **Visualization Suggestions** - Recommend chart types (pie, bar, line) based on results
5. **Time Series Analysis** - Date-based filtering and trending
6. **Export Capabilities** - CSV/JSON export for results
7. **Saved Queries** - User-created query templates
8. **Multi-language Support** - Queries in different languages

---

## Debugging & Monitoring

### Enable Query Logging

The system logs:
- ✓ Query validation result
- ✓ Detected entities
- ✓ Query type classification
- ✓ Generated Cypher
- ✓ Execution status

Example console output:
```
📌 Detected entities: ['salesOrder', 'billing', 'analysis']
🏷️  Query Type: AGGREGATION
🔍 Generated Cypher:
MATCH (oi:OrderItem)-[:FOR_PRODUCT]->(p:Product)...
```

### Performance Monitoring

Track in frontend:
- Response time per query
- Query success rate
- Most common query types
- Validation rejection rate

---

## Summary

The improved query system now provides:

✅ **Better Accuracy** - Semantic validation with forbidden pattern detection
✅ **Broader Coverage** - 5 query types vs. basic lookup-only
✅ **Smarter Responses** - Context-aware formatting per query type
✅ **Helpful Errors** - Guidance when rejecting out-of-domain queries
✅ **Complete Schema** - All entities and relationships documented
✅ **Entity Recognition** - Automatic type detection and formatting

The system is ready to handle complex business analysis queries while maintaining strict domain boundaries and data accuracy.
