import { getSession } from "../config/neo4j";
import { readFolderJSONL } from "./readJSONL";

/**
 * 🔹 Customers
 */
async function loadCustomers() {
  const session = getSession();
  const data = readFolderJSONL("data/business_partners");

  for (const bp of data) {
    if (!bp.businessPartner) continue;

    await session.run(
      `
      MERGE (c:Customer {id: $id})
      SET c.name = $name
      `,
      {
        id: bp.businessPartner,
        name: bp.businessPartnerFullName || "Unknown",
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Products
 */
async function loadProducts() {
  const session = getSession();
  const items = readFolderJSONL("data/sales_order_items");

  const map = new Map();

  for (const item of items) {
    if (!item.material) continue;
    map.set(item.material, item);
  }

  for (const mat of map.values()) {
    await session.run(
      `
      MERGE (p:Product {id: $id})
      `,
      { id: mat.material }
    );
  }

  await session.close();
}

/**
 * 🔹 Sales Orders
 */
async function loadSalesOrders() {
  const session = getSession();
  const data = readFolderJSONL("data/sales_order_headers");

  for (const order of data) {
    if (!order.salesOrder || !order.soldToParty) continue;

    await session.run(
      `
      MERGE (c:Customer {id: $cid})
      MERGE (o:SalesOrder {id: $oid})
      MERGE (c)-[:PLACED]->(o)
      `,
      {
        cid: order.soldToParty,
        oid: order.salesOrder,
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Order Items
 */
async function loadOrderItems() {
  const session = getSession();
  const items = readFolderJSONL("data/sales_order_items");

  for (const item of items) {
    if (!item.salesOrder || !item.salesOrderItem || !item.material) continue;

    await session.run(
      `
      MERGE (o:SalesOrder {id: $oid})
      MERGE (oi:OrderItem {id: $oi})
      MERGE (p:Product {id: $pid})

      MERGE (o)-[:CONTAINS]->(oi)
      MERGE (oi)-[:FOR_PRODUCT]->(p)
      `,
      {
        oid: item.salesOrder,
        oi: `${item.salesOrder}-${item.salesOrderItem}`,
        pid: item.material,
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Deliveries
 */
async function loadDeliveries() {
  const session = getSession();
  const data = readFolderJSONL("data/outbound_delivery_headers");

  for (const d of data) {
    if (!d.deliveryDocument) continue;

    await session.run(
      `
      MERGE (d:Delivery {id: $id})
      `,
      { id: d.deliveryDocument }
    );
  }

  await session.close();
}

/**
 * 🔹 Delivery Items + Product Link (FIXED)
 */
async function loadDeliveryItems() {
  const session = getSession();
  const items = readFolderJSONL("data/outbound_delivery_items");

  for (const item of items) {
    if (!item.deliveryDocument || !item.deliveryDocumentItem) continue;

    await session.run(
      `
      MERGE (d:Delivery {id: $did})
      MERGE (di:DeliveryItem {id: $di})
      MERGE (p:Product {id: $pid})

      MERGE (d)-[:CONTAINS]->(di)
      MERGE (di)-[:FOR_PRODUCT]->(p)
      `,
      {
        did: item.deliveryDocument,
        di: `${item.deliveryDocument}-${item.deliveryDocumentItem}`,
        pid: item.material || "",
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Orders → Deliveries
 */
async function linkOrdersToDeliveries() {
  const session = getSession();
  const items = readFolderJSONL("data/outbound_delivery_items");

  for (const item of items) {
    if (!item.deliveryDocument || !item.referenceSdDocument) continue;

    await session.run(
      `
      MERGE (o:SalesOrder {id: $oid})
      MERGE (d:Delivery {id: $did})
      MERGE (o)-[:FULFILLED_BY]->(d)
      `,
      {
        oid: item.referenceSdDocument,
        did: item.deliveryDocument,
      }
    );
  }

  await session.close();
}

/**
 * 🔹 OrderItem → DeliveryItem
 */
async function linkOrderItemsToDeliveryItems() {
  const session = getSession();
  const items = readFolderJSONL("data/outbound_delivery_items");

  for (const item of items) {
    if (!item.referenceSdDocument || !item.referenceSdDocumentItem) continue;

    await session.run(
      `
      MERGE (oi:OrderItem {id: $oi})
      MERGE (di:DeliveryItem {id: $di})
      MERGE (oi)-[:DELIVERED_BY]->(di)
      `,
      {
        oi: `${item.referenceSdDocument}-${item.referenceSdDocumentItem}`,
        di: `${item.deliveryDocument}-${item.deliveryDocumentItem}`,
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Invoices
 */
async function loadInvoices() {
  const session = getSession();
  const data = readFolderJSONL("data/billing_document_headers");

  for (const doc of data) {
    if (!doc.billingDocument || !doc.soldToParty) continue;

    await session.run(
      `
      MERGE (c:Customer {id: $cid})
      MERGE (i:Invoice {id: $iid})

      MERGE (c)-[:RECEIVED_INVOICE]->(i)
      `,
      {
        cid: doc.soldToParty,
        iid: doc.billingDocument,
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Invoice Items
 */
async function loadInvoiceItems() {
  const session = getSession();
  const data = readFolderJSONL("data/billing_document_items");

  for (const item of data) {
    if (!item.billingDocument || !item.billingDocumentItem) continue;

    await session.run(
      `
      MERGE (i:Invoice {id: $iid})
      MERGE (ii:InvoiceItem {id: $ii})
      MERGE (p:Product {id: $pid})

      MERGE (i)-[:CONTAINS]->(ii)
      MERGE (ii)-[:FOR_PRODUCT]->(p)
      `,
      {
        iid: item.billingDocument,
        ii: `${item.billingDocument}-${item.billingDocumentItem}`,
        pid: item.material || "",
      }
    );
  }

  await session.close();
}

/**
 * 🔹 OrderItem → InvoiceItem
 */
async function linkOrderItemsToInvoiceItems() {
  const session = getSession();
  const data = readFolderJSONL("data/billing_document_items");

  for (const item of data) {
    if (!item.referenceSdDocument || !item.referenceSdDocumentItem) continue;

    await session.run(
      `
      MERGE (oi:OrderItem {id: $oi})
      MERGE (ii:InvoiceItem {id: $ii})
      MERGE (oi)-[:BILLED_BY]->(ii)
      `,
      {
        oi: `${item.referenceSdDocument}-${item.referenceSdDocumentItem}`,
        ii: `${item.billingDocument}-${item.billingDocumentItem}`,
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Orders → Invoices
 */
async function linkOrdersToInvoices() {
  const session = getSession();
  const items = readFolderJSONL("data/billing_document_items");

  for (const item of items) {
    if (!item.referenceSdDocument || !item.billingDocument) continue;

    await session.run(
      `
      MERGE (o:SalesOrder {id: $oid})
      MERGE (i:Invoice {id: $iid})
      MERGE (o)-[:INVOICED]->(i)
      `,
      {
        oid: item.referenceSdDocument,
        iid: item.billingDocument,
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Journal Entries
 */
async function loadJournalEntries() {
  const session = getSession();
  const data = readFolderJSONL("data/journal_entry_items_accounts_receivable");

  for (const entry of data) {
    if (!entry.accountingDocument) continue;

    await session.run(
      `
      MERGE (j:JournalEntry {id: $id})
      `,
      { id: entry.accountingDocument }
    );
  }

  await session.close();
}

/**
 * 🔹 Payments
 */
async function loadPayments() {
  const session = getSession();
  const data = readFolderJSONL("data/payments_accounts_receivable");

  for (const p of data) {
    if (!p.accountingDocument) continue;

    await session.run(
      `
      MERGE (pmt:Payment {id: $id})
      `,
      {
        id: `${p.accountingDocument}-${p.accountingDocumentItem}`,
      }
    );
  }

  await session.close();
}

/**
 * 🔹 Finance Linking (ONLY CORRECT WAY)
 */
async function linkFinance() {
  const session = getSession();

  const invs = readFolderJSONL("data/billing_document_headers");
  const pays = readFolderJSONL("data/payments_accounts_receivable");

  for (const i of invs) {
    if (!i.accountingDocument) continue;

    await session.run(
      `
      MERGE (inv:Invoice {id: $iid})
      MERGE (j:JournalEntry {id: $jid})
      MERGE (inv)-[:RECORDED_AS]->(j)
      `,
      {
        iid: i.billingDocument,
        jid: i.accountingDocument,
      }
    );
  }

  for (const p of pays) {
    if (!p.clearingAccountingDocument) continue;

    await session.run(
      `
      MERGE (p:Payment {id: $pid})
      MERGE (j:JournalEntry {id: $jid})
      MERGE (p)-[:RECORDED_AS]->(j)
      `,
      {
        pid: `${p.accountingDocument}-${p.accountingDocumentItem}`,
        jid: p.clearingAccountingDocument,
      }
    );
  }

  await session.close();
}
async function linkDeliveriesToInvoices() {
  const session = getSession();
  const items = readFolderJSONL("data/billing_document_items");

  for (const item of items) {
    if (!item.referenceSdDocument || !item.billingDocument) continue;

    await session.run(
      `
      MERGE (d:Delivery {id: $did})
      MERGE (i:Invoice {id: $iid})
      MERGE (d)-[:BILLED_AS]->(i)
      `,
      {
        did: item.referenceSdDocument,
        iid: item.billingDocument,
      }
    );
  }

  await session.close();
}
/**
 * 🚀 MAIN
 */
export async function ingestGraph() {
  console.log("🚀 CLEAN INGESTION STARTED\n");

  await loadCustomers();
  await loadProducts();
  await loadSalesOrders();
  await loadOrderItems();

  await loadDeliveries();
  await loadDeliveryItems();
  await linkOrdersToDeliveries();
  await linkOrderItemsToDeliveryItems();

  await loadInvoices();
  await loadInvoiceItems();
  await linkOrderItemsToInvoiceItems();
  await linkOrdersToInvoices();

  await loadJournalEntries();
  await loadPayments();
  await linkFinance();
  await linkDeliveriesToInvoices();
  console.log("\n✅ CLEAN GRAPH READY");
}

// Support running ingestion manually:
//   npx ts-node src/ingestion/loadData.ts
if (require.main === module) {
  void ingestGraph();
}