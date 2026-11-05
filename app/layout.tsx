import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "Bench.",
  description: "Up Next: Your Faves",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Notice outfit.className is back on the body, and we keep spaceGrotesk.variable */}
      <body className={`${outfit.className} ${spaceGrotesk.variable} bg-[#050505] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}