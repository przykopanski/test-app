import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT-Service Management",
  description: "MSP-System für IT-Systemhäuser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
