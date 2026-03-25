# Quick Testing Guide - Sample Queries

Copy and paste these queries into the chat to test each query type.

---

## ✅ LOOKUP Queries (Basic Entity Retrieval)

### Test 1: Find Specific Sales Order
```
Show me sales order 740584
```

**Expected**: Returns one order with details
**Type**: LOOKUP
**Icon**: 🛒

---

### Test 2: Find Customer
```
Customer 320000083
```

**Expected**: Customer details if exist
**Type**: LOOKUP  
**Icon**: 👤

---

### Test 3: Find Invoice
```
Invoice 1000001
```

**Expected**: Invoice details with amount
**Type**: LOOKUP
**Icon**: 📄

---

## 🔄 FLOW TRACE Queries (Process Journey)

### Test 4: Complete Order Flow
```
Trace the complete flow of sales order 740584 from order to cash
```

**Expected**: 
- Sales Order → Delivery → Invoice → Journal Entry
- Shows entire chain
**Type**: FLOW_TRACE
**Icon**: ✅

---

### Test 5: Order Fulfillment Path
```
Show me the path from order placement to billing for sales order 740585
```

**Expected**: Complete order-to-cash flow
**Type**: FLOW_TRACE

---

## ⚠️ ANOMALY DETECTION Queries (Gap Finding)

### Test 6: Orders Delivered But Not Billed
```
Show me orders that were delivered but not billed
```

**Expected**: 
- 3-5 sales orders with completed deliveries
- Missing invoices
**Type**: ANOMALY_DETECTION
**Icon**: ⚠️

---

### Test 7: Orders Not Yet Delivered
```
Which sales orders have not been delivered yet?
```

**Expected**: 
- Orders pending fulfillment
- No delivery relationships
**Type**: ANOMALY_DETECTION

---

### Test 8: Orders Not Invoiced
```
Find orders that are delivered but not invoiced
```

**Expected**: Incomplete order-to-cash flows
**Type**: ANOMALY_DETECTION

---

### Test 9: Missing Payments
```
Invoices that haven't been paid yet
```

**Expected**: Outstanding invoices
**Type**: ANOMALY_DETECTION

---

## 📊 AGGREGATION Queries (Analytics)

### Test 10: Product Billing Frequency
```
Which products are associated with the most billing documents?
```

**Expected**:
- Product IDs with count of invoices
- Sorted descending
- Top 5-10 products
**Type**: AGGREGATION
**Format**: Table with product_id | invoice_count

---

### Test 11: Customer Invoice Total
```
What is the total invoice amount by customer?
```

**Expected**: 
- Customer IDs/Names
- Sum of invoice amounts
- Sorted by total amount
**Type**: AGGREGATION

---

### Test 12: Delivery Count
```
How many deliveries do we have?
```

**Expected**: 
- Total not found (no aggregation)
- Falls back to full list
- Or: Could generate aggregation query
**Type**: AGGREGATION

---

### Test 13: Order Count by Status  
```
Count the number of sales orders by delivery status
```

**Expected**: Status breakdown with counts
**Type**: AGGREGATION

---

## 🔗 RELATIONSHIP Queries (Entity Connections)

### Test 14: Customer Orders
```
Show me all orders from customer 320000083
```

**Expected**: 
- All sales orders for this customer
- 5-20 results
**Type**: RELATIONSHIP
**Icon**: 🔗

---

### Test 15: Customer Invoices
```
What invoices has customer 320000083 received?
```

**Expected**: All invoices for this customer
**Type**: RELATIONSHIP

---

### Test 16: Related Entities
```
Find all related entities for order 740584
```

**Expected**: Customer, delivery, invoice, payment
**Type**: RELATIONSHIP

---

## ❌ REJECTED Queries (Out of Domain)

### Test 17: Creative Request
```
Tell me a funny joke about orders
```

**Expected**: Rejection message
**Response**: "This system is designed to answer questions about the Order-to-Cash business process only"

---

### Test 18: Unrelated Topic
```
What's the weather like today?
```

**Expected**: Rejection message
**Reason**: Forbidden pattern detected

---

### Test 19: Food/Restaurant
```
How do I make good pizza?
```

**Expected**: Rejection message
**Reason**: Off-domain topic (food)

---

### Test 20: General Knowledge
```
What is quantum mechanics?
```

**Expected**: Rejection message
**Reason**: General knowledge question

---

### Test 21: Code Review
```
Can you review my Python code?
```

**Expected**: Rejection message
**Reason**: System meta-query

---

### Test 22: Minimal Query
```
abc
```

**Expected**: Rejection message
**Reason**: Too short (< 5 chars)

---

## 📈 Advanced Queries (Complex Scenarios)

### Test 23: Multi-Hop Flow With Conditions
```
Trace all orders from customer 320000083 that have been delivered but not yet invoiced
```

**Expected**: 
- Filtered flow trace
- Shows process gaps
**Type**: Combination (RELATIONSHIP + ANOMALY)

---

### Test 24: Aggregation With Details
```
Which customers have the highest number of undelivered orders?
```

**Expected**: Aggregation with anomaly detection
**Type**: Combination

---

### Test 25: Product-Level Analytics
```
How many different products were sold to customer 320000083?
```

**Expected**: Product count for customer
**Type**: AGGREGATION

---

## Testing Results Template

```markdown
# Test Results - [Date]

| Query | Type | Result | Status |
|-------|------|--------|--------|
| Test 1 | LOOKUP | ✓/❌ | PASS/FAIL |
| Test 2 | LOOKUP | ✓/❌ | PASS/FAIL |
| ... | ... | ... | ... |

## Issues Found
- [Issues]

## Notes
- [Notes]
```

---

## Tips

- **Specific IDs**: Use real IDs from your database for best results
- **Natural Language**: Queries don't need to be exact - slight variations work
- **Entity Types**: Mix different entity types for complex queries
- **Check Console**: Press F12 to see generated Cypher queries
- **Multiple Attempts**: If first result is empty, try rephrasing

---

## Expected Data Ranges

Based on the dataset:

- **Sales Orders**: IDs like 740584, 740585, etc.
- **Customers**: IDs like 320000083
- **Deliveries**: IDs like 840001, 840002, etc.
- **Invoices**: IDs like 1000001, 1000002, etc.
- **Products**: Material IDs (various formats)
- **Payments**: IDs like 2000001, 2000002, etc.
- **Journal Entries**: Accounting document IDs

---

## Batch Test (Run All)

To test all 25 queries automatically:

1. Copy each query
2. Paste in chat
3. Check result
4. Document outcome
5. Compare with expected

**Time**: ~10-15 minutes for full test suite

---

## Debug Mode

Enable detailed logging:

**Browser Console (F12)**:
```javascript
// Watch for these logs:
// 📌 Detected entities: [...]
// 🏷️  Query Type: [TYPE]
// 🔍 Generated Cypher: [...]
// ✅/❌ Query Status
```

**Terminal Console**:
```
// Backend will show:
// Generated Cypher: [query]
// Query Execution Error: [if any]
```

---

## Success Indicators

✅ **All Tests Pass When:**
- Lookups return entity details
- Flow traces show complete chains
- Anomalies detect gaps
- Aggregations provide numbers
- Rejected queries show helpful messages
- Cypher queries appear in console
- Response times < 5 seconds
- No TypeScript errors

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Empty results | Try different entity ID or broader query |
| "System designed for..." message | Add domain keywords (order, delivery, etc.) |
| Very slow response | Wait for LLM (normal 2-3s) |
| Cypher not visible | Check browser console F12 |
| Query rejected incorrectly | Verify domain keyword included |
| Graph not updating | Check IDs were extracted correctly |

