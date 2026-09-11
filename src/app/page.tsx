import Link from "next/link";
import Stars from "@/components/Stars";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Stars count={70} />

      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex items-center gap-3 text-3xl">
          <span className="text-glow-sun">☀️</span>
          <span className="tracking-[0.3em] text-sm font-semibold text-white/50 sm:text-base">
            SUN &amp; MOON
          </span>
          <span className="text-glow-moon">🌙</span>
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-wide text-white sm:text-5xl">
          SUDOKU
        </h1>
        <p className="mt-4 text-sm text-white/50 sm:text-base">Same puzzle. One winner.</p>
      </div>

      <div className="mt-12 flex w-full max-w-xs flex-col gap-3">
        <Link href="/create" className="btn-primary w-full">
          Create Game
        </Link>
        <Link href="/join" className="btn-moon w-full">
          Join Game
        </Link>
        <Link href="/solo" className="btn-secondary w-full">
          Play Solo
        </Link>
      </div>

      <p className="mt-16 max-w-xs text-center text-xs leading-relaxed text-white/30">
        Two players. One board. Whoever solves it first wins.
      </p>
    </main>
  );
}
