/**
 * Entity Extractor - Recognizes domain entities in Neo4j records
 * Handles formatting for different data types
 */

interface EntityData {
  type: "SalesOrder" | "Delivery" | "Invoice" | "Payment" | "Customer" | "Product" | "JournalEntry" | "OrderItem" | "Unknown";
  id: string;
  formatted: string;
  properties: Record<string, any>;
}

/**
 * Determine entity type from Neo4j properties
 */
function detectEntityType(properties: Record<string, any>): EntityData["type"] {
  // SalesOrder detection
  if (
    properties.deliveryStatus ||
    properties.overallDeliveryStatus ||
    (properties.amount && properties.currency && properties.createdDate && !properties.accountingDocument)
  ) {
    return "SalesOrder";
  }

  // Delivery detection
  if (
    properties.status === "COMPLETED" ||
    properties.status === "PENDING" ||
    properties.shippingPoint ||
    properties.overallGoodsMovementStatus
  ) {
    return "Delivery";
  }

  // Invoice detection
  if (properties.billingDocumentType || properties.isCancelled !== undefined || properties.accountingDocument) {
    // If has accountingDocument, might be invoice linked to journal
    if (properties.billingDocumentType) return "Invoice";
  }

  // Payment detection
  if (properties.clearingDate || properties.postingDate || (properties.glAccount && properties.customer)) {
    // Could be payment or journal - check context
    if (properties.clearingDate) return "Payment";
  }

  // Journal Entry detection
  if (properties.glAccount && properties.documentType === "AA") {
    return "JournalEntry";
  }

  // Order Item detection
  if (properties.quantity && properties.FOR_PRODUCT) {
    return "OrderItem";
  }

  // Product detection
  if (properties.materialGroup || !properties.createdDate) {
    return "Product";
  }

  // Customer detection
  if (properties.category || properties.grouping || (properties.name && !properties.amount)) {
    return "Customer";
  }

  return "Unknown";
}

/**
 * Format SalesOrder entity
 */
function formatSalesOrder(id: string, props: Record<string, any>): string {
  const parts = ["🛒 Sales Order"];
  parts.push(`ID: ${id}`);
  if (props.amount) {
    const amt = typeof props.amount === "string" ? parseFloat(props.amount) : props.amount;
    parts.push(`Amount: ${props.currency || "INR"} ${amt.toFixed(2)}`);
  }
  if (props.deliveryStatus || props.overallDeliveryStatus) {
    parts.push(`Status: ${props.deliveryStatus || props.overallDeliveryStatus}`);
  }
  if (props.createdDate) {
    const date = new Date(props.createdDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    parts.push(`Date: ${date}`);
  }
  return parts.join(" | ");
}

/**
 * Format Delivery entity
 */
function formatDelivery(id: string, props: Record<string, any>): string {
  const parts = ["📦 Delivery"];
  parts.push(`ID: ${id}`);
  if (props.status) {
    parts.push(`Status: ${props.status}`);
  }
  if (props.shippingPoint) {
    parts.push(`Ship Point: ${props.shippingPoint}`);
  }
  if (props.createdDate) {
    const date = new Date(props.createdDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    parts.push(`Date: ${date}`);
  }
  return parts.join(" | ");
}

/**
 * Format Invoice entity
 */
function formatInvoice(id: string, props: Record<string, any>): string {
  const parts = ["📄 Invoice"];
  parts.push(`ID: ${id}`);
  if (props.amount) {
    const amt = typeof props.amount === "string" ? parseFloat(props.amount) : props.amount;
    parts.push(`Amount: ${props.currency || "INR"} ${amt.toFixed(2)}`);
  }
  if (props.billingDocumentType) {
    parts.push(`Type: ${props.billingDocumentType}`);
  }
  if (props.isCancelled) {
    parts.push("Status: CANCELLED");
  }
  if (props.createdDate) {
    const date = new Date(props.createdDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    parts.push(`Date: ${date}`);
  }
  return parts.join(" | ");
}

/**
 * Format Payment entity
 */
function formatPayment(id: string, props: Record<string, any>): string {
  const parts = ["💳 Payment"];
  parts.push(`ID: ${id}`);
  if (props.amount) {
    const amt = typeof props.amount === "string" ? parseFloat(props.amount) : props.amount;
    parts.push(`Amount: ${amt.toFixed(2)}`);
  }
  if (props.clearingDate) {
    const date = new Date(props.clearingDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    parts.push(`Cleared: ${date}`);
  }
  if (props.glAccount) {
    parts.push(`GL Account: ${props.glAccount}`);
  }
  return parts.join(" | ");
}

/**
 * Format Customer entity
 */
function formatCustomer(id: string, props: Record<string, any>): string {
  const parts = ["👤 Customer"];
  parts.push(`ID: ${id}`);
  if (props.name) {
    parts.push(`Name: ${props.name}`);
  }
  if (props.category) {
    parts.push(`Category: ${props.category}`);
  }
  if (props.grouping) {
    parts.push(`Group: ${props.grouping}`);
  }
  return parts.join(" | ");
}

/**
 * Format Product entity
 */
function formatProduct(id: string, props: Record<string, any>): string {
  const parts = ["🏭 Product"];
  parts.push(`ID: ${id}`);
  if (props.materialGroup) {
    parts.push(`Group: ${props.materialGroup}`);
  }
  if (props.productionPlant) {
    parts.push(`Plant: ${props.productionPlant}`);
  }
  return parts.join(" | ");
}

/**
 * Format Journal Entry entity
 */
function formatJournalEntry(id: string, props: Record<string, any>): string {
  const parts = ["📊 Journal Entry"];
  parts.push(`ID: ${id}`);
  if (props.glAccount) {
    parts.push(`GL: ${props.glAccount}`);
  }
  if (props.amount) {
    const amt = typeof props.amount === "string" ? parseFloat(props.amount) : props.amount;
    parts.push(`Amount: ${amt.toFixed(2)}`);
  }
  if (props.documentType) {
    parts.push(`Type: ${props.documentType}`);
  }
  if (props.profitCenter) {
    parts.push(`Profit Center: ${props.profitCenter}`);
  }
  return parts.join(" | ");
}

/**
 * Extract entity data from Neo4j record
 */
export function extractEntity(record: any): EntityData | null {
  // Handle different possible structures
  let properties: any = null;
  let id: string | null = null;

  // If record is nested with relationship keys like s, d, i, p, c
  if (record && typeof record === "object") {
    const keys = Object.keys(record);

    // Try each key to find actual object
    for (const key of keys) {
      if (record[key] && typeof record[key] === "object" && record[key].id) {
        properties = record[key];
        id = record[key].id;
        break;
      }
    }
  }

  if (!properties || !id) {
    return null;
  }

  const entityType = detectEntityType(properties);

  let formatted = "";
  switch (entityType) {
    case "SalesOrder":
      formatted = formatSalesOrder(id, properties);
      break;
    case "Delivery":
      formatted = formatDelivery(id, properties);
      break;
    case "Invoice":
      formatted = formatInvoice(id, properties);
      break;
    case "Payment":
      formatted = formatPayment(id, properties);
      break;
    case "Customer":
      formatted = formatCustomer(id, properties);
      break;
    case "Product":
      formatted = formatProduct(id, properties);
      break;
    case "JournalEntry":
      formatted = formatJournalEntry(id, properties);
      break;
    default:
      formatted = `Record (ID: ${id})`;
  }

  return {
    type: entityType,
    id,
    formatted,
    properties,
  };
}

/**
 * Format multiple entities for display
 */
export function formatEntityList(records: any[], maxItems: number = 50): string {
  if (records.length === 0) {
    return "No matching records found in the dataset.";
  }

  const entities = records
    .map((r) => extractEntity(r))
    .filter((e) => e !== null) as EntityData[];

  if (entities.length === 0) {
    return "No matching records found.";
  }

  const displayEntities = entities.slice(0, maxItems);
  const output = displayEntities.map((e, i) => `${i + 1}. ${e.formatted}`).join("\n");

  if (entities.length > maxItems) {
    return `${output}\n\n... and ${entities.length - maxItems} more records`;
  }

  return output;
}

/**
 * Get entity summary statistics
 */
export function getEntitySummary(records: any[]): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const record of records) {
    const entity = extractEntity(record);
    if (entity) {
      summary[entity.type] = (summary[entity.type] || 0) + 1;
    }
  }

  return summary;
}
