"use client";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
export default function PaymentReturnPage() {
    return <main className="payment-return"><section className="panel"><ShieldCheck size={38}/><h1>Retour de PayPal Sandbox</h1><p>Ce retour ne confirme pas l’encaissement. Consultez la commande pour vérifier le statut et faire réconcilier le paiement par un opérateur autorisé.</p><Link href="/#orders" className="button primary"><ArrowLeft size={16}/>Retour aux commandes</Link></section></main>;
}
