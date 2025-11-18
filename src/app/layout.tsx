// src/app/layout.tsx
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/context/AuthContext";
import LoginToast from "@/components/LoginToast";
import ChatDock from "@/components/ChatDock";
import ActiveProfileBadge from "@/components/ActiveProfileBadge";

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
      <body className="min-h-screen">
        <AuthProvider>
          {/* Header: logo + wordmark + active profile badge */}
          <header className="site-header">
            <div className="site-header-left">
              <Link href="/" className="site-header-logo">
                <Image
                  src="/table-space-logo.png"
                  alt="TableSpace logo"
                  width={80}
                  height={80}
                  className="site-header-logo-img"
                  priority
                />
              </Link>
              <div className="site-header-wordmark">TABLESPACE</div>
            </div>

            <div className="site-header-right">
              {/* Who you are signed in as */}
              <ActiveProfileBadge />
            </div>
          </header>

          {/* Navigation bar */}
          <NavBar />

          {/* Optional login success toast */}
          <LoginToast />

          {/* Main content area */}
          <main className="site-main">{children}</main>

          {/* Floating unread-messages widget (bottom-left) */}
          <ChatDock />
        </AuthProvider>
      </body>
    </html>
  );
}


