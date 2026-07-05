import "./globals.css";
import PWARegister from "@/components/PWARegister";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caretaker Compliance Pro",
  description: "Body corporate caretaker task evidence and financial control system",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Caretaker"
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><PWARegister />{children}</body>
    </html>
  );
}
