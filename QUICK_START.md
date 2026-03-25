# 🚀 Quick Start - Enhanced Query System

Get up and running with the improved query retrieval system in 5 minutes.

---

## Step 1: Ensure System is Running

```bash
# Terminal 1: Backend
cd d:\code\graph-system
npm run dev

# Terminal 2: Frontend (new terminal)
cd d:\code\graph-system\graph-ui
npm run dev

# You should see:
# ✓ Backend: Server running on port 3000
# ✓ Frontend: App running at http://localhost:5173
```

---

## Step 2: Open the App

```
Navigate to: http://localhost:5173
```

You'll see:
- 🎯 Graph visualization panel (left/top)
- 💬 Chat panel (right/bottom)
- 📝 Intro message with examples

---

## Step 3: Try Your First Query

**in the chat input:**

```
Copy this exact query:
Show me sales order 740584
```

**Press Enter or click Send**

**Expected Response** (within 2-5 seconds):
```
✓ Found 1 record:
1. 🛒 Sales Order | ID: 740584 | Amount: INR 50000.00 | Status: COMPLETED | Date: Nov 19, 2025
```

---

## Step 4: Try a Complex Query

**Copy and paste:**

```
Trace the complete flow of sales order 740584
```

**Expected Response:**
```
✅ Complete Order-to-Cash Flow:
1. 🛒 Sales Order | ID: 740584 | ...
2. 📦 Delivery | ID: 840001 | ...
3. 📄 Invoice | ID: 1000001 | ...
4. 📊 Journal Entry | ID: 4000001 | ...

This shows the complete path from order placement through delivery and billing.
```

**Note:** Graph panel should update with highlighted entities

---

## Step 5: Try an Anomaly Query

**Copy:**

```
Show me orders that were not delivered
```

**Expected Response:**
```
⚠️ Found 3 orders that have NOT been delivered:
1. 🛒 Sales Order | ID: 740585 | ...
2. 🛒 Sales Order | ID: 740586 | ...
3. 🛒 Sales Order | ID: 740587 | ...

These entities indicate process gaps in the Order-to-Cash flow.
```

---

## Step 6: Try a Rejected Query

**Copy:**

```
Tell me a joke
```

**Expected Response:**
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

## What's Different?

### Before Enhancement
```
❌ "pizza sales" - ACCEPTED (wrong!)
❌ Limited to order lookups
❌ No flow tracing
❌ Poor error messages
❌ Generic formatting
```

### After Enhancement  
```
✅ "pizza sales" - REJECTED (correct!)
✅ 5 query types supported
✅ Complete flow tracing works
✅ Helpful error guidance
✅ Professional formatting with emojis
```

---

## Common Queries to Try

### Lookups
```
1. "Customer 320000083"
2. "Invoice 1000001"
3. "Delivery 840001"
```

### Flow Traces
```
1. "Trace order 740584"
2. "Show the complete flow of 740585"
3. "Order to cash flow 740586"
```

### Anomalies
```
1. "Orders not delivered"
2. "Find invoices that weren't paid"
3. "Billing documents that are cancelled"
```

### Analytics
```
1. "How many orders do we have?"
2. "Which products sell most?"
3. "Total payments by customer"
```

---

## Understanding the Response

### 🛒 SalesOrder
- Shows: Order ID, Amount, Currency, Status, Date
- Emoji: 🛒 (shopping cart)

### 📦 Delivery
- Shows: Delivery ID, Status, Shipping Point, Date
- Emoji: 📦 (package)

### 📄 Invoice
- Shows: Invoice ID, Amount, Type, Date
- Emoji: 📄 (document)

### 💳 Payment
- Shows: Payment ID, Amount, GL Account, Cleared Date
- Emoji: 💳 (credit card)

### 👤 Customer
- Shows: Customer ID, Name, Category, Group
- Emoji: 👤 (person)

### 🏭 Product
- Shows: Product ID, Material Group, Plant
- Emoji: 🏭 (factory)

### 📊 Journal Entry
- Shows: Journal ID, GL Account, Amount, Type
- Emoji: 📊 (chart)

---

## Debug Tips

### See Generated Cypher Query
```
1. Press F12 (DevTools)
2. Go to Console tab
3. Submit a query
4. Look for: "🔍 Generated Cypher: [query]"
5. Copy the Cypher to analyze or test directly
```

### Check Network Response
```
1. Press F12 (DevTools)
2. Go to Network tab
3. Submit a query
4. Click on "query" request
5. Go to Response tab
6. See full response with:
   - queryType
   - answer
   - cypher
   - ids
```

### Monitor Query Classification
```
Console shows queries classified as:
- LOOKUP: Simple entity filter
- FLOW_TRACE: Multi-hop path queries
- ANOMALY_DETECTION: WHERE NOT clauses
- AGGREGATION: COUNT, SUM, GROUP BY
- RELATIONSHIP: Entity connections
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send Message | Enter |
| New Line | Shift + Enter |
| DevTools | F12 |
| Refresh | Ctrl + R |
| Clear Cache | Ctrl + Shift + Delete |

---

## Troubleshooting

### "Connection refused"
```
✓ Check backend is running (port 3000)
✓ Check frontend can reach http://localhost:3000
```

### "No answer found"
```
✓ Check entity ID is correct (try different ID)
✓ Query with less specific criteria
✓ Check Neo4j database has data
```

### "Query rejected"
```
✓ Add domain keywords: order, delivery, invoice, etc.
✓ Avoid creative requests (jokes, stories)
✓ Stay focused on business process
```

### "Empty results"
```
✓ Data might not exist in database
✓ Try: "Show any orders" (no specific ID)
✓ Check sample queries in TESTING_GUIDE.md
```

---

## Features at a Glance

| Feature | Status | How to Use |
|---------|--------|-----------|
| **Order Lookup** | ✅ | "Order 740584" |
| **Flow Trace** | ✅ | "Trace order 740584" |
| **Anomaly Find** | ✅ | "Orders not delivered" |
| **Analytics** | ✅ | "Count orders by status" |
| **Guardrails** | ✅ | Invalid queries rejected |
| **Error Handling** | ✅ | Helpful messages |
| **Visualization** | ✅ | Graph updates auto |

---

## Next Steps

1. **Run Tests** → Use [TESTING_GUIDE.md](TESTING_GUIDE.md)
2. **Review Code** → Check [QUERY_IMPROVEMENTS.md](QUERY_IMPROVEMENTS.md)
3. **Full Implementation** → See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
4. **Verify Setup** → Use [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md)

---

## Files Changed

**New Services** (Automatically integrated):
- `src/services/queryValidator.ts` - Validates & classifies queries
- `src/services/entityExtractor.ts` - Formats entity responses

**Documentation** (For reference):
- `QUERY_IMPROVEMENTS.md` - Technical deep dive
- `IMPLEMENTATION_GUIDE.md` - Complete user guide
- `TESTING_GUIDE.md` - 25 test queries
- `VERIFICATION_CHECKLIST.md` - 25 verification steps
- `IMPROVEMENTS_SUMMARY.md` - High-level summary
- `QUICK_START.md` - This file!

---

## Success = You Can...

✅ Ask complex order-to-cash questions
✅ Get accurate results in 2-5 seconds
✅ See formatted entity data with emojis
✅ Get helpful errors for invalid queries
✅ Trace complete order flows
✅ Find billing and delivery gaps
✅ Get analytics and aggregations
✅ Update graph visualization automatically

---

## Questions? Check Here First

| Question | Answer |
|----------|--------|
| Which queries work? | See [TESTING_GUIDE.md](TESTING_GUIDE.md) |
| How do I write queries? | See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) |
| Why was my query rejected? | See Troubleshooting above |
| How does it work? | See [QUERY_IMPROVEMENTS.md](QUERY_IMPROVEMENTS.md) |
| Is everything working? | Run [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) |

---

## 🎉 You're Ready!

Your Order-to-Cash analytics system is now enhanced with:
- Intelligent query validation
- 5 query types (vs just 1 before)
- Better entity recognition
- Professional response formatting
- Comprehensive guardrails

**Go ahead and explore! Start asking questions about your orders, deliveries, invoices, and payments.**

---

**Questions? Check the full documentation in your workspace root.**

