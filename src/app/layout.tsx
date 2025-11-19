// src/app/layout.tsx
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/context/AuthContext";
import LoginToast from "@/components/LoginToast";
import ChatDock from "@/components/ChatDock";

export const metadata = {
  title: "TableSpace",
  description: "A social network for turntablists",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          {/* Header */}
          <header
            className="site-header py-4"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <Link href="/" className="site-header-logo">
              <Image
                src="/table-space-logo.png"
                alt="TableSpace logo"
                width={80}
                height={80}
                priority
              />
            </Link>
            <div className="site-header-wordmark text-3xl font-bold">
              TABLESPACE
            </div>
          </header>

          {/* Navigation bar */}
          <NavBar />

          {/* Login toast */}
          <LoginToast />

          {/* Main content */}
          <main className="site-main flex-1">{children}</main>

          {/* Floating unread messages widget */}
          <ChatDock />

          {/* Footer */}
          <footer className="w-full py-6 text-center text-sm text-gray-500 border-t mt-10">
            <Link
              href="/privacy-policy"
              className="hover:underline"
            >
              Privacy Policy
            </Link>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}



