import { displayMessage } from './display-message';
export interface ControlAnomaly {
    code: string;
    message: string;
    sku?: string;
    requested?: number | string | null;
    available?: number | string | null;
    effective_discount_pct?: number | string | null;
    max_discount_pct?: number | string | null;
    line_margin_pct?: number | string | null;
    min_margin_pct?: number | string | null;
    total_amount?: number | string | null;
    threshold?: number | string | null;
}
export interface OrderItem {
    id: number;
    order_id: string;
    product_id: string;
    sku: string;
    product_name: string;
    quantity: number;
    catalog_unit_price: number;
    unit_cost_snapshot: number;
    applied_unit_price: number;
    discount_pct: number;
    line_total: number;
    line_margin_pct: number;
    stock_reserved_qty: number;
    line_anomalies: ControlAnomaly[];
}
export interface ApprovalInfo {
    id: string;
    approval_token: string;
    status: string;
    approver_identity?: string;
    decision_notes?: string;
    expires_at?: string;
    decided_at?: string;
}
export interface InvoiceInfo {
    id: string;
    resource_type: string;
    paypal_invoice_id: string;
    paypal_invoice_number: string;
    paypal_status: string;
    total_amount: number;
    paid_amount: number;
    capture_id?: string;
    payee_merchant_id?: string;
    recipient_view_url?: string;
    invoicer_view_url?: string;
    paid_at?: string;
    last_reconciled_at?: string;
}
export interface OrderRow {
    id: string;
    quote_number: string;
    customer_name: string;
    customer_email: string;
    customer_company: string | null;
    currency: string;
    subtotal_amount: number;
    discount_amount: number;
    tax_rate_pct: number;
    tax_amount: number;
    total_amount: number;
    total_cost_amount: number;
    computed_margin_pct: number;
    payment_channel: string;
    status: string;
    settlement_mode?: string;
    requires_hitl: boolean;
    anomaly_flags: ControlAnomaly[];
    control_summary: string;
    due_date: string;
    created_at: string;
    updated_at: string;
    items: OrderItem[];
    approval?: ApprovalInfo | null;
    invoice?: InvoiceInfo | null;
}
export interface ProductRow {
    id: string;
    sku: string;
    name: string;
    category: string;
    unit_price: number;
    unit_cost: number;
    currency: string;
    stock_on_hand: number;
    stock_reserved: number;
    available_stock: number;
    max_discount_pct: number;
    min_margin_pct: number;
    updated_at: string;
}
export interface OperationRow {
    id: string;
    order_id: string;
    operation_type: string;
    logical_operation_key: string;
    paypal_request_id: string;
    status: string;
    http_status: number;
    attempt_count: number;
    paypal_resource_id?: string;
    last_error?: string;
    created_at: string;
    updated_at: string;
}
export interface DashboardSummary {
    total_orders: number;
    paid_orders_count: number;
    paid_revenue_usd: number;
    simulated_test_paid_count?: number;
    simulated_test_paid_usd?: number;
    pending_approval_count: number;
    pending_approval_usd: number;
    awaiting_payment_count: number;
    awaiting_payment_usd: number;
    blocked_or_rejected_count: number;
    idempotent_replays_saved: number;
    average_margin_pct?: number;
    pipeline_revenue_usd?: number;
}
export const money = (value: unknown) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
export const isSimulated = (order: OrderRow) => String(order.invoice?.capture_id || "").startsWith("CAP-TEST-") || order.settlement_mode === "SIMULATED_SQL_TEST_T6C";
export const isCaptured = (order: OrderRow) => order.status === "PAID" && !isSimulated(order) && Boolean(order.invoice?.capture_id) && order.invoice?.paypal_status === "COMPLETED";
export function settlementLabel(order: OrderRow): string {
    if (isSimulated(order))
        return "Simulated payment";
    if (isCaptured(order))
        return "PayPal captured";
    return ({ PAID: "Capture needs verification", PENDING_APPROVAL: "Internal approval required", APPROVED: "Internally approved", INVOICE_SENT: "Awaiting payment", BLOCKED_ANOMALY: "Blocked", REJECTED: "Rejected", CANCELLED:"Cancelled", OVERDUE:"Quote expired" } as Record<string, string>)[order.status] || order.status;
}
export async function callPayFlow(payload: Record<string, unknown>) {
    const session = await fetch("/api/operator", {cache:"no-store"}).then(r=>r.json());
    if (!session.authenticated || !session.csrf) throw new Error("Sign in with your operator account.");
    let response: Response;
    try { response = await fetch("/api/payflow", { method: "POST", headers: { "Content-Type": "application/json", "X-PayFlow-Csrf": session.csrf }, body: JSON.stringify(payload), signal: AbortSignal.timeout(90000) }); }
    catch { throw new Error("The request is taking too long. Try again; the checks protect against duplicates."); }
    const data = await response.json();
    if ((!response.ok && response.status !== 422) || data.status === "error")
        throw new Error(/error in workflow/i.test(data.message || "") ? "The PayFlow engine could not process the request. Check service diagnostics and try again." : displayMessage(data.message, "The service is unavailable. Please try again shortly."));
    return { data, httpStatus: response.status };
}
