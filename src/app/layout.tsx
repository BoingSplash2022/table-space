import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import NavBar from "@/components/NavBar";


export const metadata = {
  title: "TableSpace",
  description: "A social network for turntablists and DJ's",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Header: logo is now clickable (back to home) */}
        <header className="site-header">
          <Link href="/" className="site-header-logo">
            <Image
              src="/table-space-logo.png"
              alt="TableSpace logo small"
              width={80}
              height={80}
              className="site-header-logo-img"
              priority
            />
          </Link>

          <div className="site-header-wordmark">TABLESPACE</div>
        </header>

        {/* NAV BAR */}
                {/* NAV BAR */}
        <NavBar />



        {/* PAGE CONTENT */}
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}

function NavButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="site-nav-button">
      {children}
    </Link>
  );
}


