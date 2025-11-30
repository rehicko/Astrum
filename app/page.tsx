// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex justify-center px-4 py-10 md:py-16">
      <div className="relative w-full max-w-6xl">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute -inset-[80px] -z-10
  bg-[radial-gradient(circle_at_32%_24%,_rgba(16,185,129,0.03),_transparent_68%),radial-gradient(circle_at_78%_110%,_rgba(16,185,129,0.02),_transparent_80%)]"
        />
        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)]">
          {/* LEFT: Hero + alpha status */}
          <section className="space-y-8">
            {/* Tag + headline */}
            <div className="space-y-4">
              <p className="text-xs font-medium tracking-[0.28em] text-emerald-400">
                A S T R U M&nbsp;&nbsp;A L P H A
              </p>

              <h1 className="text-3xl md:text-5xl font-semibold leading-tight text-foreground">
                The next layer for live game chat.
              </h1>

              <p className="max-w-xl text-sm md:text-base leading-relaxed text-zinc-400">
                Astrum is a real-time social layer that sits over your game —
                global channels that stay alive, cross-realm discovery, and a
                chat overlay so you never have to alt-tab to talk.
              </p>
            </div>

            {/* Alpha status row */}
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Status */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Status
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-400">
                  Closed alpha
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Expect bugs. Expect changes. What you do here shapes what
                  Astrum becomes.
                </p>
              </div>

              {/* Realms */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Realms
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-400">
                  WoW first. More later.
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Start with Classic. The layer is built to expand across games.
                </p>
              </div>

              {/* Overlay */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Overlay
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-400">
                  Desktop in 0.1
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Always-on-top overlay so chat follows you in-game.
                </p>
              </div>
            </div>

            {/* Founder note */}
            <p className="text-xs text-zinc-500">
              Founded by WoW players tired of dead LFG channels and scattered
              Discords.
            </p>
          </section>

          {/* RIGHT: Seamless action column */}
          <aside className="mt-4 space-y-7 md:mt-0 md:border-l md:border-zinc-800 md:pl-10">
            {/* Header */}
            <div className="space-y-2 text-left">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                Get started
              </p>
              <h2 className="text-lg font-semibold text-foreground">
                Choose how you want to run Astrum.
              </h2>
              <p className="text-xs text-zinc-500">
                Jump straight into live channels, or keep Astrum floating above
                your game with the desktop overlay.
              </p>
            </div>

            {/* Step indicators */}
            <div className="flex flex-col gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600 md:flex-row md:gap-6">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/70 text-[10px] text-emerald-400">
                  1
                </span>
                <span>Pick your mode</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 text-[10px] text-zinc-400">
                  2
                </span>
                <span>Sign in & explore</span>
              </div>
            </div>

            {/* Enter Chat block */}
            <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.85)]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Enter Chat
                  </p>
                  <p className="text-xs text-zinc-500">
                    Takes you straight into Astrum’s first always-on global
                    channel with profiles, reputation, and moderation built in.
                  </p>
                </div>
                <span className="border-l border-emerald-500/60 pl-2 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-400">
                  Live
                </span>
              </div>

              <Link
                href="/crossroads/global"
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Enter Chat
              </Link>
            </div>

            {/* Overlay block */}
            <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.85)]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Use Overlay While You Play
                  </p>
                  <p className="text-xs text-zinc-500">
                    Run Astrum as an always-on-top overlay so you can read and
                    send messages without leaving your game. Designed for WoW
                    Classic first, with more games to come.
                  </p>
                </div>
                <span className="border-l border-zinc-600 pl-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400">
                  In alpha
                </span>
              </div>

              <Link
                href="/download"
                className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-500/70 bg-gradient-to-r from-transparent via-transparent to-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
              >
                Learn about the overlay
              </Link>
            </div>

            {/* Small note */}
            <p className="text-[11px] text-zinc-600">
              You can switch between browser chat and the overlay at any time —
              your identity and reputation stay in one place.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
