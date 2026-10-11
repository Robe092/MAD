import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "PayFlow AI — Commerce under control",
    description: "Your quotes, orders and payments in one clear workspace. AI sales assistance and financial analytics.",
};
export default function RootLayout({ children, }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" className="light">
      <body className="antialiased">
        {children}
      </body>
    </html>);
}
