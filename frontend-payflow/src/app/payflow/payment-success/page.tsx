"use client";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
export default function PaymentReturnPage() {
    return <main className="payment-return"><section className="panel"><ShieldCheck size={38}/><h1>Return from PayPal Sandbox</h1><p>This return does not confirm receipt of payment. Open the order to check its status and have an authorized operator reconcile the payment.</p><Link href="/#orders" className="button primary"><ArrowLeft size={16}/>Back to orders</Link></section></main>;
}
