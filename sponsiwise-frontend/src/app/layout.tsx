import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sponsiwise",
  description:
    "Connect sponsors with events effortlessly. The modern platform for sponsorship management, discovery, and collaboration.",
  icons: {
    icon: "/images/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
