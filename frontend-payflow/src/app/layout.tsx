import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "PayFlow AI — Commerce sous contrôle",
    description: "Vos devis, commandes et paiements dans un espace de travail clair. Assistant commercial IA et analyses financières.",
};
export default function RootLayout({ children, }: {
    children: React.ReactNode;
}) {
    return (<html lang="fr" className="light">
      <body className="antialiased">
        {children}
      </body>
    </html>);
}
