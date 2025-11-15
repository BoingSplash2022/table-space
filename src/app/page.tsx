// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";

function HomeActionButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        min-w-[180px]
        px-8
        py-3
        rounded-full
        border border-black
        text-black
        text-sm sm:text-base
        font-semibold
        text-center
        hover:bg-black hover:text-white
        transition
      "
    >
      {children}
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-10 flex flex-col items-center text-center">
      {/* BIG LOGO */}
      <div className="mb-6">
        <Image
          src="/table-space-logo.png"
          alt="TableSpace logo"
          width={420}
          height={420}
          className="w-[260px] sm:w-[320px] md:w-[380px] h-auto mx-auto"
          priority
        />
      </div>

      {/* TAGLINE */}
      <section className="max-w-2xl mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold mb-3">
          A social network for turntablists
        </h1>
        <p className="text-sm md:text-base text-gray-800">
          Share scratches, flex beat juggles, join battles, and connect with DJs
          who live on the platters.
        </p>
      </section>

      {/* CALLS TO ACTION */}
      <section className="flex flex-col sm:flex-row gap-4 items-center">
        <HomeActionButton href="/register">Sign up</HomeActionButton>
        <HomeActionButton href="/login">Sign in</HomeActionButton>
      </section>
    </main>
  );
}




