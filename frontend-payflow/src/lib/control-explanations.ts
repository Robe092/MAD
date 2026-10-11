import type { ControlAnomaly, OrderRow } from './payflow';

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

// Render the server's recorded values only. Missing/invalid values are never zero.
function value(raw: unknown): number | null {
    if (typeof raw !== 'number' && typeof raw !== 'string') return null;
    if (typeof raw === 'string' && !/^-?\d+(?:\.\d+)?$/.test(raw.trim())) return null;
    const result = Number(raw);
    return Number.isFinite(result) ? result : null;
}
function percent(raw: unknown): string {
    const result = value(raw);
    return result === null ? 'non disponible' : `${numberFormat.format(result)} %`;
}
function quantity(raw: unknown): string {
    const result = value(raw);
    return result === null || result < 0 || !Number.isInteger(result)
        ? 'non disponible'
        : `${numberFormat.format(result)} ${result === 1 ? 'caisse' : 'caisses'}`;
}
function amount(raw: unknown, currency: string): string {
    const result = value(raw);
    if (result === null || result < 0) return 'non disponible';
    try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(result); }
    catch { return 'non disponible'; }
}

/** Explanation only: never changes a price, threshold, reservation or decision. */
export function explainControl(anomaly: ControlAnomaly, order: Pick<OrderRow, 'status' | 'currency' | 'items'>) {
    const product = anomaly.sku ? order.items?.find(item => item.sku === anomaly.sku)?.product_name : undefined;
    const subject = product || anomaly.sku || 'Commande';
    const closed = ['CANCELLED', 'OVERDUE', 'REJECTED'].includes(order.status);
    const validated = ['APPROVED', 'INVOICE_SENT', 'PAID'].includes(order.status);
    const guidance = (current: string) => closed
        ? 'Ce contrôle est conservé pour expliquer le devis clôturé.'
        : validated
            ? 'Ce contrôle est conservé dans l’historique de la commande validée en interne.'
            : current;

    switch (anomaly.code) {
        case 'INSUFFICIENT_STOCK':
            return { subject, title: 'Stock insuffisant',
                detail: `Quantité demandée : ${quantity(anomaly.requested)}. Stock disponible lors du contrôle : ${quantity(anomaly.available)}.`,
                guidance: guidance('Le manque de stock bloque ce devis. Vérifiez la quantité et la disponibilité avant de préparer une nouvelle demande.') };
        case 'DISCOUNT_LIMIT_EXCEEDED':
            return { subject, title: 'Remise au-delà du plafond',
                detail: `Remise du devis : ${percent(anomaly.effective_discount_pct)}. Plafond autorisé lors du contrôle : ${percent(anomaly.max_discount_pct)}.`,
                guidance: guidance(order.status === 'PENDING_APPROVAL'
                    ? 'Votre validation interne est nécessaire pour cette dérogation. La remise demandée reste inchangée.'
                    : 'Cette remise nécessite une validation interne. Consultez l’état de la commande avant toute décision.') };
        case 'MARGIN_FLOOR_BREACH':
            return { subject, title: 'Marge sous le minimum',
                detail: `Marge calculée : ${percent(anomaly.line_margin_pct)}. Marge minimale lors du contrôle : ${percent(anomaly.min_margin_pct)}.`,
                guidance: guidance(order.status === 'PENDING_APPROVAL'
                    ? 'Votre validation interne est nécessaire pour accepter cette marge. Les prix restent inchangés.'
                    : 'Cette marge nécessite une validation interne. Consultez l’état de la commande avant toute décision.') };
        case 'HIGH_VALUE_THRESHOLD':
            return { subject: 'Commande', title: 'Montant soumis à validation',
                detail: `Montant contrôlé : ${amount(anomaly.total_amount, order.currency)}. Seuil de validation interne : ${amount(anomaly.threshold, order.currency)}.`,
                guidance: guidance(order.status === 'PENDING_APPROVAL'
                    ? 'Ce montant nécessite votre validation interne avant de créer le lien de paiement PayPal.'
                    : 'Ce montant est soumis à une validation interne. Consultez l’état de la commande avant toute décision.') };
        case 'UNKNOWN_SKU':
            return { subject, title: 'Produit non reconnu',
                detail: 'Cette référence n’a pas été trouvée dans le catalogue utilisé pour ce devis.',
                guidance: guidance('La référence bloque ce devis. Vérifiez le produit avant de préparer une nouvelle demande.') };
        case 'INVALID_QUANTITY':
            return { subject, title: 'Quantité non valide',
                detail: 'La quantité doit être un nombre entier de caisses, supérieur à zéro.',
                guidance: guidance('La quantité bloque ce devis. Corrigez-la dans une nouvelle demande.') };
        default:
            return { subject, title: 'Contrôle à examiner',
                detail: 'Le moteur a signalé un point à examiner. Le message d’origine est disponible dans « Traçabilité & diagnostic ».',
                guidance: guidance('Consultez le diagnostic avant toute décision.') };
    }
}
