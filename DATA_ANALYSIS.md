# Order to Cash Data Pipeline Analysis

## 📊 Data Structure Overview

### Input Data Files

#### 1. **business_partners/** (Customers)
- **Fields**: businessPartner (ID), businessPartnerFullName, customer, createdByUser, creationDate
- **Key Field**: `businessPartner` = customer ID
- **Records**: Customer masters
- **Status**: ✅ Correctly loaded as Customer nodes

---

#### 2. **sales_order_headers/** (Orders)
- **Fields**: salesOrder (ID), soldToParty, totalNetAmount, transactionCurrency, creationDate, overallDeliveryStatus
- **Key Relationships**:
  - `soldToParty` → links to Customer
  - `totalNetAmount`, `transactionCurrency` → order value
- **Status**: ✅ Correctly linked to Customer via PLACED relationship

---

#### 3. **sales_order_items/** (Order Details)
- **Fields**: salesOrder, salesOrderItem, material, requestedQuantity, netAmount, productionPlant, storageLocation
- **Key Field**: `material` = Product/Material ID
- **Issue**: ❌ **MATERIALS NOT LOADED** - No Product/Material nodes created
- **Missing Link**: Should create Product nodes and link OrderItems to Products

---

#### 4. **outbound_delivery_headers/** (Deliveries)
- **Fields**: deliveryDocument (ID), overallGoodsMovementStatus, shippingPoint, creationDate
- **Status**: ✅ Loaded as Delivery nodes

---

#### 5. **outbound_delivery_items/** (Delivery Details)
- **Fields**: deliveryDocument, referenceSdDocument, referenceSdDocumentItem
- **Key Relationship**:
  - `referenceSdDocument` = salesOrder ID (links Order to Delivery)
  - `deliveryDocument` = delivery ID
- **Current Issue**: ❌ **INCORRECT MAPPING**
  - Current code: Links via `item.referenceSdDocument` → treats as delivery
  - **Correct mapping**: Should be `item.referenceSdDocument` → salesOrder, then Delivery fulfills Order

---

#### 6. **billing_document_headers/** (Invoices/Billing Docs)
- **Fields**: billingDocument (ID), soldToParty, totalNetAmount, transactionCurrency, accountingDocument
- **Key Relationships**:
  - `soldToParty` → Customer ID
  - `accountingDocument` → Journal Entry
- **Status**: ❌ **NOT LOADED** - Missing as nodes in graph

---

#### 7. **billing_document_items/** (Invoice Details)
- **Fields**: billingDocument, referenceSdDocument, material, billingQuantity, netAmount
- **Key Relationship**:
  - `referenceSdDocument` = **DELIVERY DOCUMENT ID** (NOT order)
  - `billingDocument` = invoice ID
- **Current Issue**: ❌ **WRONG MAPPING**
  - Current code: Treats `referenceSdDocument` as delivery
  - This is actually CORRECT in intent but implementation links to wrong entity

---

#### 8. **payments_accounts_receivable/** (Payments)
- **Fields**: accountingDocument (ID), customer, clearingAccountingDocument, amountInTransactionCurrency, transactionCurrency
- **Key Relationships**:
  - `customer` → Customer ID
  - `clearingAccountingDocument` → Journal Entry ID
  - `accountingDocument` → Could link to Invoice/Billing Document
- **Missing Link**: Should link payment to invoice (billingDocument reference)

---

#### 9. **journal_entry_items_accounts_receivable/** (Journal Entries)
- **Fields**: accountingDocument (ID), customer, glAccount, amountInTransactionCurrency, referenceDocument
- **Current Issue**: ❌ **NOT LOADED AS NODES** 
  - Journal entries are only created implicitly through payment linking
  - Should be explicit nodes with properties

---

#### 10. **products/** / **product_descriptions/** / **product_plants/** / **product_storage_locations/**
- **Status**: ❌ **NOT LOADED** - Missing product master data
- Should create Product nodes and link to:
  - Sales Order Items
  - Plants/Storage locations

---

## 🔴 Critical Issues Found

### Issue 1: Missing Material/Product Nodes
**Severity**: HIGH
**Current**: Sales order items reference materials but no Product nodes are created
**Impact**: Cannot analyze product-level Order to Cash flow

### Issue 2: Billing Document Headers Not Loaded
**Severity**: HIGH
**Current**: Only billing_document_items are processed, missing invoice headers
**Impact**: Invoices not visible as first-class entities in graph

### Issue 3: Journal Entry Items Not Loaded
**Severity**: MEDIUM
**Current**: Only payment → journal links created, no journal entry nodes
**Impact**: Accounting records not properly represented

### Issue 4: Payment to Invoice Link Missing
**Severity**: MEDIUM
**Current**: Payments only link to journal entries
**Impact**: Cannot trace payment to specific invoice

### Issue 5: readJSONL.ts No Error Handling
**Severity**: MEDIUM
**Current**: JSON.parse() can fail silently if malformed data exists
**Impact**: Data loss without notification

---

## ✅ What's Working Correctly

- ✅ Customer loading from business_partners
- ✅ Sales Order loading and Customer → Order links
- ✅ Order → Delivery relationships (FULFILLED_BY)
- ✅ Delivery → Invoice relationships (BILLED_AS)
- ✅ Payment creation and Customer → Payment links
- ✅ Payment → Journal links

---

## 📋 Recommended Improvements

### Priority 1 - CRITICAL
1. Load Product/Material data
2. Load Billing Document Headers as nodes
3. Link Sales Order Items to Products
4. Link Invoices to proper entities

### Priority 2 - HIGH
1. Load Journal Entry Items as explicit nodes
2. Link Payments to Invoices (billing documents)
3. Add error handling to readJSONL.ts
4. Validate all data relationships

### Priority 3 - MEDIUM
1. Load product_plants and product_storage_locations
2. Add more comprehensive relationship mapping
3. Add data validation in loadData.ts

---

## 🔗 Corrected Order to Cash Flow

```
Customer
  ↓ (PLACES)
SalesOrder → SalesOrderItem → Product
  ↓ (FULFILLED_BY)
Delivery → DeliveryItem
  ↓ (BILLED_AS)
Invoice (BillingDocument) → InvoiceItem
  ↓ (PAID_BY)
Payment → JournalEntry
```

---

## 📊 Data Counts (Approximate)

- Business Partners: ~500+
- Sales Orders: ~500+
- Sales Order Items: ~1000+
- Outbound Deliveries: ~500+
- Delivery Items: ~1000+
- Billing Documents: ~500+
- Billing Items: ~1000+
- Payments: ~500+
- Journal Entries: ~500+

