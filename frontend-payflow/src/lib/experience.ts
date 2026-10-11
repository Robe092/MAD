import { isCaptured, isSimulated, type OrderRow } from './payflow';

/** Presentation only: never authorizes an action or infers payment from an URL. */
export function nextOrderStep(order: OrderRow): { title: string; detail: string; tone: string } {
    if (isSimulated(order)) return { title: 'Règlement simulé', detail: 'Cette commande de test ne compte pas dans les encaissements PayPal.', tone: 'neutral' };
    if (isCaptured(order)) return { title: 'Paiement confirmé', detail: 'PayPal a confirmé la capture. La commande est réglée.', tone: 'positive' };
    if (['CANCELLED', 'OVERDUE', 'REJECTED'].includes(order.status)) return { title: 'Commande clôturée', detail: 'Consultez les produits et la réservation ci-dessous pour retrouver le détail de cette commande.', tone: 'neutral' };
    if (order.status === 'PAID') return { title: 'Paiement à vérifier', detail: 'La commande est marquée réglée, mais la preuve de capture PayPal reste à vérifier.', tone: 'warning' };
    if (order.status === 'BLOCKED_ANOMALY') return { title: 'Examiner les contrôles', detail: 'Cette commande est bloquée. Consultez les anomalies avant de préparer une nouvelle demande.', tone: 'warning' };
    if (order.status === 'PENDING_APPROVAL') return { title: 'Valider le devis en interne', detail: 'Examinez les remises, les marges et les stocks, puis validez ou refusez la commande.', tone: 'warning' };
    if (order.invoice?.resource_type === 'PAYPAL_ORDER_V2' && order.invoice.paypal_status === 'APPROVED') return { title: 'Confirmer la capture', detail: 'L’acheteur a autorisé le paiement dans PayPal. La capture nécessite encore votre confirmation.', tone: 'blue' };
    if (order.invoice) return { title: 'Attendre le paiement acheteur', detail: 'Le lien PayPal est émis. Suivez son état ici ; la vérification automatique ne lance aucune capture.', tone: 'blue' };
    if (order.status === 'APPROVED') return { title: 'Préparer le paiement PayPal', detail: 'Le devis est validé en interne. Créez le lien PayPal pour permettre à l’acheteur de payer.', tone: 'blue' };
    return { title: 'Consulter le devis', detail: 'Retrouvez les produits, les contrôles et l’état de la commande ci-dessous.', tone: 'neutral' };
}

export function orderJourney(order: OrderRow) {
    const closed = ['CANCELLED', 'OVERDUE', 'REJECTED', 'BLOCKED_ANOMALY'].includes(order.status);
    const paid = isCaptured(order);
    const validated = ['APPROVED', 'INVOICE_SENT', 'PAID'].includes(order.status);
    const authorized = !isSimulated(order) && (paid || (order.invoice?.resource_type === 'PAYPAL_ORDER_V2' && order.invoice.paypal_status === 'APPROVED'));
    return [
        { title: 'Devis & contrôles', state: order.status === 'BLOCKED_ANOMALY' ? 'stop' : 'done' },
        { title: 'Validation interne', state: validated ? 'done' : closed ? 'stop' : 'current' },
        { title: 'Autorisation acheteur', state: authorized ? 'done' : closed || isSimulated(order) ? 'waiting' : order.invoice ? 'current' : 'waiting' },
        { title: 'Paiement confirmé', state: paid ? 'done' : !closed && authorized ? 'current' : 'waiting' },
    ];
}
