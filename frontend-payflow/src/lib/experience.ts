import { isCaptured, isSimulated, type OrderRow } from './payflow';

/** Presentation only: never authorizes an action or infers payment from an URL. */
export function nextOrderStep(order: OrderRow): { title: string; detail: string; tone: string } {
    if (isSimulated(order)) return { title: 'Simulated settlement', detail: 'This test order is excluded from PayPal receipts.', tone: 'neutral' };
    if (isCaptured(order)) return { title: 'Payment confirmed', detail: 'PayPal has confirmed the capture. The order is paid.', tone: 'positive' };
    if (['CANCELLED', 'OVERDUE', 'REJECTED'].includes(order.status)) return { title: 'Order closed', detail: 'Review the products and reservation below for this order’s details.', tone: 'neutral' };
    if (order.status === 'PAID') return { title: 'Payment needs verification', detail: 'The order is marked paid, but PayPal capture evidence still needs verification.', tone: 'warning' };
    if (order.status === 'BLOCKED_ANOMALY') return { title: 'Review the checks', detail: 'This order is blocked. Review the issues before preparing a new request.', tone: 'warning' };
    if (order.status === 'PENDING_APPROVAL') return { title: 'Approve the quote internally', detail: 'Review discounts, margins and stock, then approve or reject the order.', tone: 'warning' };
    if (order.invoice?.resource_type === 'PAYPAL_ORDER_V2' && order.invoice.paypal_status === 'APPROVED') return { title: 'Confirm capture', detail: 'The buyer has approved payment in PayPal. Capture still requires your confirmation.', tone: 'blue' };
    if (order.invoice) return { title: 'Await buyer payment', detail: 'The PayPal link has been created. Track it here; automatic checks never initiate capture.', tone: 'blue' };
    if (order.status === 'APPROVED') return { title: 'Prepare PayPal payment', detail: 'The quote is internally approved. Create the PayPal link so the buyer can pay.', tone: 'blue' };
    return { title: 'View quote', detail: 'Find the products, checks and order status below.', tone: 'neutral' };
}

export function orderJourney(order: OrderRow) {
    const closed = ['CANCELLED', 'OVERDUE', 'REJECTED', 'BLOCKED_ANOMALY'].includes(order.status);
    const paid = isCaptured(order);
    const validated = ['APPROVED', 'INVOICE_SENT', 'PAID'].includes(order.status);
    const authorized = !isSimulated(order) && (paid || (order.invoice?.resource_type === 'PAYPAL_ORDER_V2' && order.invoice.paypal_status === 'APPROVED'));
    return [
        { title: 'Quote & checks', state: order.status === 'BLOCKED_ANOMALY' ? 'stop' : 'done' },
        { title: 'Internal approval', state: validated ? 'done' : closed ? 'stop' : 'current' },
        { title: 'Buyer approval', state: authorized ? 'done' : closed || isSimulated(order) ? 'waiting' : order.invoice ? 'current' : 'waiting' },
        { title: 'Payment confirmed', state: paid ? 'done' : !closed && authorized ? 'current' : 'waiting' },
    ];
}
