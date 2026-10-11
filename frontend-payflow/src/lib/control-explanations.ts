import type { ControlAnomaly, OrderRow } from './payflow';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

// Render the server's recorded values only. Missing/invalid values are never zero.
function value(raw: unknown): number | null {
    if (typeof raw !== 'number' && typeof raw !== 'string') return null;
    if (typeof raw === 'string' && !/^-?\d+(?:\.\d+)?$/.test(raw.trim())) return null;
    const result = Number(raw);
    return Number.isFinite(result) ? result : null;
}
function percent(raw: unknown): string {
    const result = value(raw);
    return result === null ? 'unavailable' : `${numberFormat.format(result)} %`;
}
function quantity(raw: unknown): string {
    const result = value(raw);
    return result === null || result < 0 || !Number.isInteger(result)
        ? 'unavailable'
        : `${numberFormat.format(result)} ${result === 1 ? 'case' : 'cases'}`;
}
function amount(raw: unknown, currency: string): string {
    const result = value(raw);
    if (result === null || result < 0) return 'unavailable';
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(result); }
    catch { return 'unavailable'; }
}

/** Explanation only: never changes a price, threshold, reservation or decision. */
export function explainControl(anomaly: ControlAnomaly, order: Pick<OrderRow, 'status' | 'currency' | 'items'>) {
    const product = anomaly.sku ? order.items?.find(item => item.sku === anomaly.sku)?.product_name : undefined;
    const subject = product || anomaly.sku || 'Order';
    const closed = ['CANCELLED', 'OVERDUE', 'REJECTED'].includes(order.status);
    const validated = ['APPROVED', 'INVOICE_SENT', 'PAID'].includes(order.status);
    const guidance = (current: string) => closed
        ? 'This check is retained to explain the closed quote.'
        : validated
            ? 'This check is retained in the internally approved order’s history.'
            : current;

    switch (anomaly.code) {
        case 'INSUFFICIENT_STOCK':
            return { subject, title: 'Insufficient stock',
                detail: `Requested quantity: ${quantity(anomaly.requested)}. Available stock at the time of the check: ${quantity(anomaly.available)}.`,
                guidance: guidance('Insufficient stock blocks this quote. Check quantity and availability before preparing a new request.') };
        case 'DISCOUNT_LIMIT_EXCEEDED':
            return { subject, title: 'Discount above the limit',
                detail: `Quote discount: ${percent(anomaly.effective_discount_pct)}. Allowed limit at the time of the check: ${percent(anomaly.max_discount_pct)}.`,
                guidance: guidance(order.status === 'PENDING_APPROVAL'
                    ? 'Your internal approval is required for this exception. The requested discount is unchanged.'
                    : 'This discount requires internal approval. Check the order status before making a decision.') };
        case 'MARGIN_FLOOR_BREACH':
            return { subject, title: 'Margin below the minimum',
                detail: `Calculated margin: ${percent(anomaly.line_margin_pct)}. Minimum margin at the time of the check: ${percent(anomaly.min_margin_pct)}.`,
                guidance: guidance(order.status === 'PENDING_APPROVAL'
                    ? 'Your internal approval is required to accept this margin. Prices are unchanged.'
                    : 'This margin requires internal approval. Check the order status before making a decision.') };
        case 'HIGH_VALUE_THRESHOLD':
            return { subject: 'Order', title: 'Amount requiring approval',
                detail: `Checked amount: ${amount(anomaly.total_amount, order.currency)}. Internal approval threshold: ${amount(anomaly.threshold, order.currency)}.`,
                guidance: guidance(order.status === 'PENDING_APPROVAL'
                    ? 'This amount requires your internal approval before creating the PayPal payment link.'
                    : 'This amount requires internal approval. Check the order status before making a decision.') };
        case 'UNKNOWN_SKU':
            return { subject, title: 'Unknown product',
                detail: 'This product reference was not found in the catalogue used for this quote.',
                guidance: guidance('This reference blocks the quote. Check the product before preparing a new request.') };
        case 'INVALID_QUANTITY':
            return { subject, title: 'Invalid quantity',
                detail: 'The quantity must be a whole number of cases greater than zero.',
                guidance: guidance('The quantity blocks this quote. Correct it in a new request.') };
        default:
            return { subject, title: 'Check to review',
                detail: 'The engine reported an issue to review. The original message is available in History & diagnostics.',
                guidance: guidance('Review the diagnostic before making a decision.') };
    }
}
