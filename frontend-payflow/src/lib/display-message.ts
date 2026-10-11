/** Presentation only. Preserve unknown diagnostics and provider prose verbatim. */
const messages: Record<string, string> = {
    'Origine refusée.': 'Request origin rejected.',
    'Origine de la requête refusée.': 'Request origin rejected.',
    'Trop de tentatives. Réessayez dans une minute.': 'Too many attempts. Try again in one minute.',
    'Authentification non configurée.': 'Authentication is not configured.',
    'Authentification opérateur requise.': 'Operator authentication is required.',
    'Identifiants incorrects.': 'Incorrect username or password.',
    'Requête invalide.': 'Invalid request.',
    'Requête JSON invalide.': 'Invalid JSON request.',
    'Connectez-vous avec votre compte opérateur.': 'Sign in with your operator account.',
    'Session de formulaire expirée. Rechargez la page.': 'Form session expired. Reload the page.',
    'Décrivez votre demande en 1 à 6 000 caractères.': 'Describe your request in 1 to 6,000 characters.',
    'La connexion au service PayFlow n’est pas configurée.': 'The PayFlow service connection is not configured.',
    'Le service PayFlow est momentanément indisponible. Réessayez.': 'The PayFlow service is temporarily unavailable. Please try again.',
    'Gemini n’a pas produit une réponse exploitable. Réessayez plus tard.': 'Gemini did not produce a usable response. Please try again later.',
    'La commande d’analyse reçue est invalide.': 'The received analytics command is invalid.',
    'Précisez les produits du catalogue et les quantités.': 'Specify catalogue products and quantities.',
    'Précisez le nom du client et une adresse email valide ; aucune commande ni réservation n’a été créée.': 'Provide the customer name and a valid email address; no order or reservation was created.',
    'Précisez l’adresse email du client dans votre demande. Aucun devis ni réservation créé.': 'Include the customer email in your request. No quote or reservation was created.',
    'Données numériques invalides.': 'Invalid numeric data.',
    'Quantité, prix ou remise invalide.': 'Invalid quantity, price or discount.',
    'Une ressource PayPal est déjà liée à cette commande.': 'A PayPal resource is already linked to this order.',
    'Paiement de facture à vérifier par transaction PayPal avant règlement du stock.': 'Invoice payment must be verified against a PayPal transaction before stock settlement.',
    'Facture vérifiée ; aucun règlement capturé.': 'Invoice checked; no captured settlement.',
    'La capture n’a pas été confirmée. Vérifiez le statut avant de réessayer.': 'Capture was not confirmed. Check the status before trying again.',
    'Le moteur n’a pas pu terminer la demande.': 'The engine could not complete the request.',
    'La persistance n’a pas été confirmée. Actualisez avant de réessayer.': 'Persistence was not confirmed. Refresh before trying again.',
    'La capture distante est observée mais le règlement local doit être vérifié.': 'A remote capture was observed, but local settlement needs verification.',
};

export function displayMessage(raw: unknown, fallback = 'The service could not complete the request.'): string {
    if (typeof raw !== 'string' || !raw.trim()) return fallback;
    return Object.prototype.hasOwnProperty.call(messages, raw) ? messages[raw] : raw;
}
