# Implementation Guide - Enhanced Query Retrieval System

## Overview

This guide explains the enhanced query retrieval system with improved accuracy, better guardrails, and support for complex queries about the Order-to-Cash process.

---

## What's New

### ✅ Three New Services

1. **Query Validator** (`queryValidator.ts`)
   - Semantic domain analysis
   - Forbidden pattern detection
   - Entity ID extraction
   - Query type classification

2. **Entity Extractor** (`entityExtractor.ts`)
   - Automatic entity type detection
   - Smart formatting with emojis
   - Safe null handling
   - Summary statistics

3. **Enhanced LLM Service** (updated `llmService.ts`)
   - Complete schema documentation
   - 9 comprehensive examples
   - All node types and relationships
   - Support for aggregation and anomaly queries

### ✅ Five Query Types Now Supported

| Type | Examples |
|------|----------|
| **FLOW_TRACE** | "Trace order 740584", "Show complete flow" |
| **ANOMALY_DETECTION** | "Orders not delivered", "Billed but not delivered" |
| **AGGREGATION** | "Products in most billing docs", "Total payment by customer" |
| **RELATIONSHIP** | "All invoices for customer X", "Orders from plant Y" |
| **LOOKUP** | Standard entity lookups, "Show order 123", "Customer details" |

---

## Architecture

```
User Query
    ↓
Query Validation (Semantic analysis)
    ↓ [Rejected if invalid]
Entity & Type Classification
    ↓
Cypher Generation (Enhanced schema-aware LLM)
    ↓
Query Execution
    ↓
Response Formatting (Type-aware)
    ↓
Visualization Data Extraction
    ↓
Response to User
```

---

## How to Use

### Starting the System

```bash
# From the workspace root
npm run dev              # Starts backend at 3000, UI at 5173

# Or separately:
# Terminal 1: Backend
npm run dev --workspace src

# Terminal 2: UI
npm run dev --workspace graph-ui
```

### Querying the System

**In the Chat Panel UI:**

1. Type your question about the Order-to-Cash process
2. System validates for domain relevance
3. Cypher query is generated automatically
4. Results are returned with formatted entities
5. Graph visualization updates with matched IDs

---

## Example Queries & Responses

### Query 1: Specific Order Lookup

**Input:**
```
Show me sales order 740584
```

**Internal Process:**
```
✓ Validation: Contains "order" (salesOrder domain) + ID
✓ Type: LOOKUP
✓ Entity ID Extracted: 740584
→ Cypher Generated:
  MATCH (s:SalesOrder {id: "740584"})
  RETURN s
```

**Output:**
```
✓ Found 1 record:
1. 🛒 Sales Order | ID: 740584 | Amount: INR 50000.00 | Status: COMPLETED | Date: Nov 19, 2025
```

---

### Query 2: Flow Tracing (Complex)

**Input:**
```
Trace the complete flow from order to cash for sales order 740584
```

**Internal Process:**
```
✓ Validation: Contains "trace" + "order" + "flow"
✓ Type: FLOW_TRACE
✓ Entity ID Extracted: 740584
→ Cypher Generated:
  MATCH (s:SalesOrder {id: "740584"})-[:FULFILLED_BY]->(d:Delivery)-[:BILLED_AS]->(i:Invoice)
        -[:RECORDED_AS]->(j:JournalEntry)
  RETURN s, d, i, j
```

**Output:**
```
✅ Complete Order-to-Cash Flow:
1. 🛒 Sales Order | ID: 740584 | Amount: INR 50000.00 | Status: COMPLETED | Date: Nov 19, 2025
2. 📦 Delivery | ID: 840001 | Status: COMPLETED | Ship Point: DC01 | Date: Nov 20, 2025
3. 📄 Invoice | ID: 1000001 | Amount: INR 50000.00 | Type: ZF2 | Date: Nov 21, 2025
4. 📊 Journal Entry | ID: 4000001 | GL: 1200 | Amount: 50000.00 | Type: AA | Profit Center: PC01

This shows the complete path from order placement through delivery and billing.
```

---

### Query 3: Anomaly Detection

**Input:**
```
Show me orders that were delivered but not yet billed
```

**Internal Process:**
```
✓ Validation: Contains "delivered" + "not billed" (anomaly signals)
✓ Type: ANOMALY_DETECTION
→ Cypher Generated:
  MATCH (s:SalesOrder)-[:FULFILLED_BY]->(d:Delivery)
  WHERE NOT (d)-[:BILLED_AS]->()
  RETURN s LIMIT 10
```

**Output:**
```
⚠️ Found 3 records with incomplete or broken flow:
1. 🛒 Sales Order | ID: 740585 | Amount: INR 25000.00 | Status: COMPLETED | Date: Nov 20, 2025
2. 🛒 Sales Order | ID: 740586 | Amount: INR 15000.00 | Status: COMPLETED | Date: Nov 21, 2025
3. 🛒 Sales Order | ID: 740587 | Amount: INR 30000.00 | Status: COMPLETED | Date: Nov 22, 2025

These entities indicate process gaps in the Order-to-Cash flow.
```

---

### Query 4: Aggregation

**Input:**
```
Which products are associated with the most billing documents?
```

**Internal Process:**
```
✓ Validation: Contains "products" + "most" (aggregation signal)
✓ Type: AGGREGATION
→ Cypher Generated:
  MATCH (oi:OrderItem)-[:FOR_PRODUCT]->(p:Product)
  MATCH (oi:OrderItem)-->(o:SalesOrder)-[:FULFILLED_BY]->(d:Delivery)-[:BILLED_AS]->(i:Invoice)
  RETURN p.id, COUNT(DISTINCT i.id) as invoice_count
  ORDER BY invoice_count DESC
  LIMIT 10
```

**Output:**
```
📊 Aggregation Results (5 records):
1. p.id: PROD001 | invoice_count: 152
2. p.id: PROD002 | invoice_count: 148
3. p.id: PROD003 | invoice_count: 131
4. p.id: PROD004 | invoice_count: 125
5. p.id: PROD005 | invoice_count: 119
```

---

### Query 5: Rejected Query (Out of Domain)

**Input:**
```
Tell me a funny joke about pizza
```

**Internal Process:**
```
✗ Validation FAILED
✗ Matches forbidden patterns: ["joke", "pizza"]
✗ No domain entities detected
→ Rejection triggered
```

**Output:**
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

## Validation Rules

### ✅ Valid Queries (examples)

```
1. "What is the status of order 740584?"
2. "Show me all customers in the system"
3. "Which orders haven't been delivered?"
4. "Trace the complete order-to-cash flow"
5. "How many invoices did customer 320000083 receive?"
6. "Products that appear in most billing documents"
7. "Find orders that were billed but not delivered"
8. "Shipments from warehouse DC01"
```

### ❌ Invalid Queries (rejected)

```
1. "Tell me a joke" → Creative request
2. "What's the weather?" → Unrelated topic
3. "How do I cook pasta?" → Off-domain
4. "Explain quantum mechanics" → General knowledge
5. "Review my code" → System meta-query
6. "" → Empty/minimal query
7. "abc" → Less than 5 characters
```

---

## Domain Keywords

The system recognizes these domain areas:

```
Sales Orders:     order, purchase order, so, sales, quotation
Deliveries:       delivery, outbound, shipment, shipped
Billing:          invoice, billing, bill
Payments:         payment, paid, clearing
Customers:        customer, client, partner, buyer
Products:         product, material, sku, item
Journals:         journal, entry, accounting, gl account
Analysis:         count, sum, total, highest, which, how many
Flow:             flow, trace, path, sequence, process
```

---

## Troubleshooting

### Q: My query is rejected even though it seems valid

**A:** Check for:
- Forbidden patterns (joke, weather, pizza, etc.)
- Missing domain keywords
- Query too short (< 5 characters)
- Try rephrasing with domain terminology

Example:
```
❌ "Tell me about our sales"  
→ Too vague, missing keywords

✅ "Show me all sales orders from the past month"  
→ Contains "sales orders" keyword
```

### Q: Query returns no results

**A:** This could mean:
- No matching data in database
- Entity ID is incorrect  
- Specific relationship doesn't exist
- Try a broader query

Example:
```
❌ "Order 9999999"  
→ Doesn't exist

✅ "Show me any sales orders"  
→ Get all orders to find valid IDs
```

### Q: Cypher query looks wrong

**A:** Enable console logging to see:
```typescript
// In queryService.ts - already logging:
console.log("📌 Detected entities:", entityIds);
console.log("🏷️  Query Type:", queryType);
console.log("\n🔍 Generated Cypher:\n", cypher);
```

Check browser console (F12) → Network tab → query request → Response for full Cypher.

---

## Files Modified/Created

### New Files:
- `src/services/queryValidator.ts` - Domain validation
- `src/services/entityExtractor.ts` - Entity recognition

### Updated Files:
- `src/services/queryService.ts` - Enhanced query execution
- `src/services/llmService.ts` - Better schema & examples
- `graph-ui/src/components/ChatPanel.tsx` - Better error handling

### Documentation:
- `QUERY_IMPROVEMENTS.md` - Detailed technical documentation
- `IMPLEMENTATION_GUIDE.md` - This file

---

## Next Steps

### To improve further:

1. **Collect Query Patterns**
   - Log common queries
   - Identify domain gaps
   - Add new keywords as needed

2. **Tune Validator**
   - Adjust forbidden patterns
   - Add domain-specific rules
   - Test with real user queries

3. **Enhance Entity Extraction**
   - Add new entity types
   - Improve formatting
   - Add calculated fields

4. **Expand Examples in LLM Prompt**
   - User feedback queries
   - Edge cases
   - Complex multi-hop paths

5. **Add Query Analytics**
   - Track query success rate
   - Monitor rejection reasons
   - Identify improvement areas

---

## Performance Notes

- **Validation**: < 1ms (local regex matching)
- **Type Classification**: < 1ms (keyword checking)
- **Entity Extraction**: < 5ms (pattern parsing)
- **Cypher Generation**: 1-3s (LLM API call)
- **Query Execution**: Varies (depends on Neo4j query complexity)
- **Total Response Time**: 2-5 seconds for typical queries

---

## Testing Checklist

- [ ] Valid flow trace queries work
- [ ] Anomaly detection queries return correct gaps
- [ ] Aggregation queries return structured data
- [ ] Invalid queries are politely rejected
- [ ] Entity IDs are extracted for visualization
- [ ] Chat shows helpful intro message
- [ ] Error messages are user-friendly
- [ ] Cypher queries look correct in console

---

## Support

For issues or questions:

1. Check console logs (F12 → Console in browser)
2. Review generated Cypher query
3. Verify data exists in Neo4j
4. Check domain keywords in query
5. Review `QUERY_IMPROVEMENTS.md` for detailed architecture

