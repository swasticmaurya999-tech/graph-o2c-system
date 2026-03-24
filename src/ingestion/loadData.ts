import { getSession } from "../config/neo4j";
import { readFolderJSONL } from "./readJSONL";

/**
 * 🔹 Load Customers
 */
async function loadCustomers() {
  const session = getSession();

  try {
    const data = readFolderJSONL("data/business_partners");
    console.log(`📊 Loading ${data.length} customers...`);
    
    for (const bp of data) {
      if (!bp.businessPartner) continue;

      await session.run(
        `
        MERGE (c:Customer {id: $id})
        SET c.name = $name,
            c.category = $category,
            c.grouping = $grouping,
            c.createdDate = $createdDate
        `,
        {
          id: bp.businessPartner,
          name: bp.businessPartnerFullName || "Unknown",
          category: bp.businessPartnerCategory || "",
          grouping: bp.businessPartnerGrouping || "",
          createdDate: bp.creationDate || "",
        }
      );
    }

    await session.close();
    console.log("✅ Customers loaded ");
  } catch (error) {
    console.error("❌ Error loading customers:", error);
  }
}

/**
 * 🔹 Load Products/Materials
 */
async function loadProducts() {
  const session = getSession();

  try {
    // Get unique materials from sales_order_items
    const soItems = readFolderJSONL("data/sales_order_items");
    const materialsMap = new Map();
    
    console.log(`📊 Processing ${soItems.length} sales order items for materials...`);
    
    for (const item of soItems) {
      if (!item.material) continue;
      
      if (!materialsMap.has(item.material)) {
        materialsMap.set(item.material, {
          material: item.material,
          materialGroup: item.materialGroup || "",
          productionPlant: item.productionPlant || "",
        });
      }
    }

    console.log(`📊 Loading ${materialsMap.size} unique products...`);
    
    for (const matData of materialsMap.values()) {
      await session.run(
        `
        MERGE (p:Product {id: $id})
        SET p.materialGroup = $materialGroup,
            p.productionPlant = $productionPlant
        `,
        {
          id: matData.material,
          materialGroup: matData.materialGroup,
          productionPlant: matData.productionPlant,
        }
      );
    }

    await session.close();
    console.log("✅ Products loaded ");
  } catch (error) {
    console.error("❌ Error loading products:", error);
  }
}

/**
 * 🔹 Load Sales Orders + Relationship
 */
async function loadSalesOrders() {
  const session = getSession();

  try {
    const data = readFolderJSONL("data/sales_order_headers");
    console.log(`📊 Loading ${data.length} sales orders...`);

    for (const order of data) {
      if (!order.salesOrder || !order.soldToParty) continue;

      await session.run(
        `
        MERGE (c:Customer {id: $customerId})
        MERGE (o:SalesOrder {id: $orderId})
        SET o.amount = $amount,
            o.currency = $currency,
            o.createdDate = $createdDate,
            o.deliveryStatus = $deliveryStatus
        MERGE (c)-[:PLACED]->(o)
        `,
        {
          customerId: order.soldToParty,
          orderId: order.salesOrder,
          amount: order.totalNetAmount || "0",
          currency: order.transactionCurrency || "INR",
          createdDate: order.creationDate || "",
          deliveryStatus: order.overallDeliveryStatus || "",
        }
      );
    }

    await session.close();
    console.log("✅ Sales Orders loaded ");
  } catch (error) {
    console.error("❌ Error loading sales orders:", error);
  }
}

/**
 * 🔹 Link Sales Order Items to Products
 */
async function linkOrderItemsToProducts() {
  const session = getSession();

  try {
    const items = readFolderJSONL("data/sales_order_items");
    console.log(`📊 Linking ${items.length} order items to products...`);

    for (const item of items) {
      if (!item.salesOrder || !item.material) continue;

      await session.run(
        `
        MERGE (o:SalesOrder {id: $orderId})
        MERGE (p:Product {id: $productId})
        MERGE (oi:OrderItem {id: $oiId})
        SET oi.quantity = $quantity,
            oi.amount = $amount,
            oi.currency = $currency
        MERGE (o)-[:CONTAINS]->(oi)
        MERGE (oi)-[:FOR_PRODUCT]->(p)
        `,
        {
          orderId: item.salesOrder,
          productId: item.material,
          oiId: `${item.salesOrder}-${item.salesOrderItem}`,
          quantity: item.requestedQuantity || "0",
          amount: item.netAmount || "0",
          currency: item.transactionCurrency || "INR",
        }
      );
    }

    await session.close();
    console.log("✅ Order Items linked to Products ");
  } catch (error) {
    console.error("❌ Error linking order items:", error);
  }
}

/**
 * 🔹 Load Deliveries
 */
async function loadDeliveries() {
  const session = getSession();

  try {
    const data = readFolderJSONL("data/outbound_delivery_headers");
    console.log(`📊 Loading ${data.length} deliveries...`);

    for (const d of data) {
      if (!d.deliveryDocument) continue;

      await session.run(
        `
        MERGE (del:Delivery {id: $deliveryId})
        SET del.status = $status,
            del.createdDate = $createdDate,
            del.shippingPoint = $shippingPoint
        `,
        {
          deliveryId: d.deliveryDocument,
          status: d.overallGoodsMovementStatus || "UNKNOWN",
          createdDate: d.creationDate || "",
          shippingPoint: d.shippingPoint || "",
        }
      );
    }

    await session.close();
    console.log("✅ Deliveries loaded ");
  } catch (error) {
    console.error("❌ Error loading deliveries:", error);
  }
}

/**
 * 🔹 Link Orders to Deliveries
 */
async function linkOrdersToDeliveries() {
  const session = getSession();

  try {
    const items = readFolderJSONL("data/outbound_delivery_items");
    console.log(`📊 Linking orders to deliveries (${items.length} items)...`);

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
    console.log("✅ Orders → Deliveries linked ");
  } catch (error) {
    console.error("❌ Error linking orders to deliveries:", error);
  }
}

/**
 * 🔹 Load Billing Document Headers (Invoices)
 */
async function loadBillingDocuments() {
  const session = getSession();

  try {
    const data = readFolderJSONL("data/billing_document_headers");
    console.log(`📊 Loading ${data.length} billing documents (invoices)...`);

    for (const doc of data) {
      if (!doc.billingDocument || !doc.soldToParty) continue;

      await session.run(
        `
        MERGE (c:Customer {id: $customerId})
        MERGE (inv:Invoice {id: $invoiceId})
        SET inv.amount = $amount,
            inv.currency = $currency,
            inv.createdDate = $createdDate,
            inv.billingDocumentType = $type,
            inv.isCancelled = $isCancelled,
            inv.accountingDocument = $accountingDoc
        MERGE (c)-[:RECEIVED_INVOICE]->(inv)
        `,
        {
          customerId: doc.soldToParty,
          invoiceId: doc.billingDocument,
          amount: doc.totalNetAmount || "0",
          currency: doc.transactionCurrency || "INR",
          createdDate: doc.creationDate || "",
          type: doc.billingDocumentType || "",
          isCancelled: doc.billingDocumentIsCancelled || false,
          accountingDoc: doc.accountingDocument || "",
        }
      );
    }

    await session.close();
    console.log("✅ Invoices loaded ");
  } catch (error) {
    console.error("❌ Error loading billing documents:", error);
  }
}

/**
 * 🔹 Link Invoices to Deliveries
 */
async function linkInvoicesToDeliveries() {
  const session = getSession();

  try {
    const items = readFolderJSONL("data/billing_document_items");
    console.log(`📊 Linking invoices to deliveries (${items.length} items)...`);

    for (const item of items) {
      if (!item.billingDocument || !item.referenceSdDocument) continue;

      await session.run(
        `
        MERGE (d:Delivery {id: $deliveryId})
        MERGE (inv:Invoice {id: $invoiceId})
        MERGE (d)-[:BILLED_AS]->(inv)
        `,
        {
          invoiceId: item.billingDocument,
          deliveryId: item.referenceSdDocument,
        }
      );
    }

    await session.close();
    console.log("✅ Invoices → Deliveries linked ");
  } catch (error) {
    console.error("❌ Error linking invoices to deliveries:", error);
  }
}

/**
 * 🔹 Load Journal Entries
 */
async function loadJournalEntries() {
  const session = getSession();

  try {
    const data = readFolderJSONL("data/journal_entry_items_accounts_receivable");
    const journalsMap = new Map();

    console.log(`📊 Processing ${data.length} journal entries...`);

    // Deduplicate journal entries
    for (const entry of data) {
      if (!entry.accountingDocument) continue;

      if (!journalsMap.has(entry.accountingDocument)) {
        journalsMap.set(entry.accountingDocument, entry);
      }
    }

    console.log(`📊 Loading ${journalsMap.size} unique journal entries...`);

    for (const entry of journalsMap.values()) {
      await session.run(
        `
        MERGE (j:JournalEntry {id: $id})
        SET j.glAccount = $glAccount,
            j.amount = $amount,
            j.currency = $currency,
            j.createdDate = $createdDate,
            j.documentType = $docType,
            j.profitCenter = $profitCenter,
            j.customer = $customer
        `,
        {
          id: entry.accountingDocument,
          glAccount: entry.glAccount || "",
          amount: entry.amountInTransactionCurrency || "0",
          currency: entry.transactionCurrency || "INR",
          createdDate: entry.postingDate || "",
          docType: entry.accountingDocumentType || "",
          profitCenter: entry.profitCenter || "",
          customer: entry.customer || "",
        }
      );
    }

    await session.close();
    console.log("✅ Journal Entries loaded ");
  } catch (error) {
    console.error("❌ Error loading journal entries:", error);
  }
}

/**
 * 🔹 Load Payments + Relationships
 */
async function loadPayments() {
  const session = getSession();

  try {
    const data = readFolderJSONL("data/payments_accounts_receivable");
    console.log(`📊 Loading ${data.length} payments...`);

    for (const p of data) {
      if (!p.accountingDocument || !p.customer) continue;

      await session.run(
        `
        MERGE (c:Customer {id: $customerId})
        MERGE (pmt:Payment {id: $paymentId})
        SET pmt.amount = $amount,
            pmt.currency = $currency,
            pmt.clearingDate = $clearingDate,
            pmt.postingDate = $postingDate,
            pmt.glAccount = $glAccount
        MERGE (c)-[:MADE_PAYMENT]->(pmt)
        `,
        {
          customerId: p.customer,
          paymentId: p.accountingDocument,
          amount: p.amountInTransactionCurrency || "0",
          currency: p.transactionCurrency || "INR",
          clearingDate: p.clearingDate || "",
          postingDate: p.postingDate || "",
          glAccount: p.glAccount || "",
        }
      );
    }

    await session.close();
    console.log("✅ Payments loaded ");
  } catch (error) {
    console.error("❌ Error loading payments:", error);
  }
}

/**
 * 🔹 Link Payments to Journal Entries
 */
async function linkPaymentsToJournals() {
  const session = getSession();

  try {
    const data = readFolderJSONL("data/payments_accounts_receivable");
    console.log(`📊 Linking payments to journal entries...`);

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
    console.log("✅ Payments → Journal Entries linked ");
  } catch (error) {
    console.error("❌ Error linking payments to journals:", error);
  }
}

/**
 * 🔹 Link Invoices to Journal Entries
 */
async function linkInvoicesToJournals() {
  const session = getSession();

  try {
    const data = readFolderJSONL("data/billing_document_headers");
    console.log(`📊 Linking invoices to journal entries...`);

    for (const doc of data) {
      if (!doc.billingDocument || !doc.accountingDocument) continue;

      await session.run(
        `
        MERGE (inv:Invoice {id: $invoiceId})
        MERGE (j:JournalEntry {id: $journalId})
        MERGE (inv)-[:RECORDED_AS]->(j)
        `,
        {
          invoiceId: doc.billingDocument,
          journalId: doc.accountingDocument,
        }
      );
    }

    await session.close();
    console.log("✅ Invoices → Journal Entries linked ");
  } catch (error) {
    console.error("❌ Error linking invoices to journals:", error);
  }
}

async function main() {
  try {
    console.log("\n🚀 Starting IMPROVED data ingestion...\n");
    
    // Phase 1: Load master entities
    await loadCustomers();
    await loadProducts();
    await loadSalesOrders();
    await loadDeliveries();
    await loadBillingDocuments();
    await loadJournalEntries();
    await loadPayments();
    
    // Phase 2: Create relationships
    await linkOrderItemsToProducts();
    await linkOrdersToDeliveries();
    await linkInvoicesToDeliveries();
    await linkPaymentsToJournals();
    await linkInvoicesToJournals();
    
    // Phase 3: Verify data loaded
    const session = getSession();
    const nodeResult = await session.run("MATCH (n) RETURN count(n) as count");
    const relResult = await session.run("MATCH ()-[r]->() RETURN count(r) as count");
    const typeResult = await session.run(
      "MATCH (n) RETURN DISTINCT labels(n)[0] as type, count(n) as count ORDER BY count DESC"
    );
    
    const nodeCount = nodeResult.records[0]?.get("count").toNumber() || 0;
    const relCount = relResult.records[0]?.get("count").toNumber() || 0;
    
    console.log(`\n✅ Data ingestion complete!`);
    console.log(`📊 Total nodes: ${nodeCount}`);
    console.log(`🔗 Total relationships: ${relCount}\n`);
    console.log("📈 Nodes by type:");
    typeResult.records.forEach((r) => {
      console.log(`   - ${r.get("type")}: ${r.get("count").toNumber()}`);
    });
    console.log();
    
    await session.close();
  } catch (error) {
    console.error("❌ Error during ingestion:", error);
  }
}

main();
