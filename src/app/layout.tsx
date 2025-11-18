import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/context/AuthContext";
import LoginToast from "@/components/LoginToast";
import ProfileIndicator from "@/components/ProfileIndicator";

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
          {/* Header: logo + wordmark + profile indicator */}
          <header className="site-header">
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

            {/* Logged-in / profile indicator (top area) */}
            <div style={{ marginLeft: "auto", marginRight: "1rem" }}>
              <ProfileIndicator />
            </div>
          </header>

          {/* Navigation bar */}
          <NavBar />

          {/* Main content area */}
          <main className="site-main">{children}</main>

          {/* One-off login success popup */}
          <LoginToast />
        </AuthProvider>
      </body>
    </html>
  );
}
