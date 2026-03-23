import { getSession } from "../config/neo4j";
import { readFolderJSONL } from "./readJSONL";

/**
 * 🔹 Load Customers
 */
async function loadCustomers() {
  const session = getSession();

  const data = readFolderJSONL("data/business_partners");
  // console.log("Sample customer row:", data[0]);
  const paymentData = readFolderJSONL("data/payments_accounts_receivable");
  console.log("Sample payment:", paymentData[0]); 
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
  console.log("Customers loaded ✅");
}

/**
 * 🔹 Load Sales Orders + Relationship
 */
async function loadSalesOrders() {
  const session = getSession();

  const data = readFolderJSONL("data/sales_order_headers");

  // console.log("Sample sales order row:", data[0]);

  for (const order of data) {
    if (!order.salesOrder || !order.soldToParty) continue;

    await session.run(
      `
      MERGE (c:Customer {id: $customerId})
      MERGE (o:SalesOrder {id: $orderId})
      SET o.amount = $amount,
          o.currency = $currency
      MERGE (c)-[:PLACED]->(o)
      `,
      {
        customerId: order.soldToParty,
        orderId: order.salesOrder,
        amount: order.totalNetAmount || "0",
        currency: order.transactionCurrency || "INR",
      }
    );
  }

  await session.close();
  console.log("Sales Orders loaded ✅");
}

async function loadDeliveries() {
  const session = getSession();

  const data = readFolderJSONL("data/outbound_delivery_headers");

  // console.log("Sample delivery row:", data[0]);

  for (const d of data) {
    if (!d.deliveryDocument) continue;

    await session.run(
      `
      MERGE (del:Delivery {id: $deliveryId})
      SET del.status = $status
      `,
      {
        deliveryId: d.deliveryDocument,
        status: d.overallGoodsMovementStatus || "UNKNOWN",
      }
    );
  }

  await session.close();
  console.log("Deliveries loaded ✅");
}


async function linkOrdersToDeliveries() {
  const session = getSession();

  const items = readFolderJSONL("data/outbound_delivery_items");

  // console.log("Sample delivery item:", items[0]);

  for (const item of items) {
    if (!item.deliveryDocument || !item.referenceSdDocument) continue;

    await session.run(
      `
      MERGE (o:SalesOrder {id: $orderId})
      MERGE (d:Delivery {id: $deliveryId})
      MERGE (o)-[:FULFILLED_BY]->(d)
      `,
      {
        orderId: item.referenceSdDocument,
        deliveryId: item.deliveryDocument,
      }
    );
  }

  await session.close();
  console.log("Order → Delivery linked ✅");
}

async function loadInvoices() {
  const session = getSession();

  const data = readFolderJSONL("data/billing_document_items");

  // console.log("Sample billing item:", data[0]);

  for (const item of data) {
    if (!item.billingDocument || !item.referenceSdDocument) continue;

    await session.run(
      `
      MERGE (d:Delivery {id: $deliveryId})
      MERGE (i:Invoice {id: $invoiceId})
      SET i.amount = $amount,
          i.currency = $currency
      MERGE (d)-[:BILLED_AS]->(i)
      `,
      {
        deliveryId: item.referenceSdDocument,
        invoiceId: item.billingDocument,
        amount: item.netAmount || "0",
        currency: item.transactionCurrency || "INR",
      }
    );
  }

  await session.close();
  console.log("Invoices loaded ✅");
}
async function loadPayments() {
  const session = getSession();

  const data = readFolderJSONL("data/payments_accounts_receivable");

  console.log("Sample payment row:", data[0]);

  for (const p of data) {
    if (!p.accountingDocument || !p.customer) continue;

    await session.run(
      `
      MERGE (c:Customer {id: $customerId})
      MERGE (pmt:Payment {id: $paymentId})
      SET pmt.amount = $amount,
          pmt.currency = $currency
      MERGE (c)-[:MADE_PAYMENT]->(pmt)
      `,
      {
        customerId: p.customer,
        paymentId: p.accountingDocument,
        amount: p.amountInTransactionCurrency || "0",
        currency: p.transactionCurrency || "INR",
      }
    );
  }

  await session.close();
  console.log("Payments loaded ✅");
}

async function linkPaymentsToJournal() {
  const session = getSession();

  const data = readFolderJSONL("data/payments_accounts_receivable");

  for (const p of data) {
    if (!p.accountingDocument || !p.clearingAccountingDocument) continue;

    await session.run(
      `
      MERGE (pmt:Payment {id: $paymentId})
      MERGE (j:JournalEntry {id: $journalId})
      MERGE (pmt)-[:RECORDED_AS]->(j)
      `,
      {
        paymentId: p.accountingDocument,
        journalId: p.clearingAccountingDocument,
      }
    );
  }

  await session.close();
  console.log("Payment → Journal linked ✅");
}


async function main() {
  try {
    await loadCustomers();
    await loadSalesOrders();
    await loadDeliveries();          
    await linkOrdersToDeliveries(); 
    await loadInvoices(); 
    await loadPayments();  
    await linkPaymentsToJournal(); 
  } catch (error) {
    console.error("Error during ingestion:", error);
  }
}

main();