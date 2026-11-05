import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react"; // <-- Import added here
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "Bench | Request a Song",
  description: "Take over the aux.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} ${spaceGrotesk.variable} bg-[#050505] text-white antialiased`}>
        {children}
        <Analytics /> {/* <-- Component added here */}
      </body>
    </html>
  );
}