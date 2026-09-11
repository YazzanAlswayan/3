import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sun & Moon Sudoku",
  description: "Same puzzle. One winner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
