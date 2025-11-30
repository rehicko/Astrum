// app/download/page.tsx
import Link from "next/link";

export default function DownloadPage() {
  return (
    <main className="relative min-h-[calc(100vh-64px)] bg-black text-white">
      {/* Soft Astrum glow background */}
      <div className="pointer-events-none absolute -inset-[80px] -z-10 bg-[radial-gradient(circle_at_32%_24%,_rgba(16,185,129,0.03),_transparent_68%),radial-gradient(circle_at_78%_110%,_rgba(16,185,129,0.02),_transparent_80%)]" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 md:px-8 md:py-16 lg:py-20">
        {/* HERO */}
        <section className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Left column – copy */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-400">
              Astrum overlay
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
              Download the Astrum desktop overlay.
            </h1>

            <p className="mt-4 max-w-xl text-sm text-neutral-300 md:text-[15px]">
              Run Astrum on top of your game so chat is always in
              view. One identity, one account — your profile, reputation, and
              overlay chat all live under the same login as the web.
            </p>

            <p className="mt-4 max-w-xl text-xs text-neutral-500">
              The 0.1 alpha ships first for{" "}
              <span className="text-emerald-300">macOS</span> with a{" "}
              <span className="text-neutral-200">Windows</span> build close
              behind. While we package the installers, you can still use
              Chat in the browser and keep your progress.
            </p>

            {/* Small status strip */}
            <div className="mt-8 grid gap-4 text-xs text-neutral-300 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  Status
                </div>
                <div className="mt-1 font-medium text-emerald-300">
                  Closed alpha
                </div>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Expect bugs. Expect changes. What you do here shapes what
                  Astrum becomes.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  Games first
                </div>
                <div className="mt-1 font-medium text-emerald-300">
                  WoW Classic
                </div>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Tuned for fullscreen-windowed MMORPGs. More games come after
                  the alpha.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  Your identity
                </div>
                <div className="mt-1 font-medium text-emerald-300">
                  One Astrum account
                </div>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Same login for web and overlay. Your XP, titles, and rep stay
                  in sync.
                </p>
              </div>
            </div>
          </div>

          {/* Right column – platform cards */}
          <div className="space-y-5">
            {/* macOS card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/90 shadow-[0_22px_80px_rgba(0,0,0,0.95)]">
              {/* Top neon strip */}
              <div className="h-[2px] w-full bg-gradient-to-r from-emerald-400/80 via-emerald-300/70 to-emerald-500/80" />

              <div className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Platform
                    </div>
                    <div className="mt-1 text-sm font-semibold text-neutral-50">
                      macOS
                    </div>
                    <p className="mt-1 text-[12px] text-neutral-400">
                      Built with Tauri. Tuned for fullscreen-windowed games on
                      recent macOS.
                    </p>
                  </div>

                  {/* macOS icon / badge */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 via-emerald-400/5 to-emerald-500/0 text-xl font-semibold text-emerald-300">
                    
                  </div>
                </div>

                {/* Faux preview window */}
                <div className="mt-5 rounded-xl border border-white/7 bg-gradient-to-br from-emerald-500/16 via-black/90 to-emerald-500/4 p-3">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500/80" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                      <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">
                      Astrum overlay
                    </span>
                  </div>

                  <div className="mt-3 h-16 rounded-lg border border-white/7 bg-black/80 px-3 py-2">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="text-emerald-300/80">#crossroads</span>
                      <span className="text-neutral-600">
                        Live over your game
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5 text-[10px] text-neutral-400">
                      <div className="flex gap-2">
                        <span className="w-10 text-neutral-500">11:35</span>
                        <span className="text-emerald-200">
                          Ajay → test wave for load testing, ignore.
                        </span>
                      </div>
                      <div className="flex gap-2 opacity-60">
                        <span className="w-10 text-neutral-500">11:36</span>
                        <span>Players chatting while you stay in combat.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 text-[12px] font-semibold tracking-[0.18em] uppercase text-black py-2.5 disabled:cursor-not-allowed disabled:opacity-80 hover:bg-emerald-400 transition-colors"
                >
                  Download for macOS
                  <span className="ml-2 text-[10px] font-normal tracking-[0.18em] text-emerald-950/80">
                    Coming soon
                  </span>
                </button>

                <p className="mt-2 text-[11px] text-neutral-500">
                  First alpha build targets macOS Sonoma+ in fullscreen-windowed
                  mode. Native Battle.net and game overlays come later.
                </p>
              </div>
            </div>

            {/* Windows card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/80 shadow-[0_18px_70px_rgba(0,0,0,0.9)]">
              <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/60 via-slate-400/40 to-emerald-500/60" />

              <div className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Platform
                    </div>
                    <div className="mt-1 text-sm font-semibold text-neutral-50">
                      Windows
                    </div>
                    <p className="mt-1 text-[12px] text-neutral-400">
                      Native overlay for Windows PCs. Same Astrum account, same
                      chat, tuned for WoW and other fullscreen games.
                    </p>
                  </div>

                  {/* Refined Windows icon */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-slate-200/12 via-slate-400/5 to-emerald-500/6">
                    <div className="grid h-8 w-8 grid-cols-2 grid-rows-2 gap-[2px]">
                      <div className="rounded-[3px] bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.35)]" />
                      <div className="rounded-[3px] bg-white/80" />
                      <div className="rounded-[3px] bg-white/80" />
                      <div className="rounded-[3px] bg-white/90" />
                    </div>
                  </div>
                </div>

                {/* Overlay “window” */}
                <div className="mt-5 rounded-xl border border-white/7 bg-gradient-to-br from-slate-400/14 via-black/90 to-emerald-500/4 p-3">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">
                      In-game overlay
                    </span>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] text-neutral-400">
                      Windows 11+
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-neutral-400">
                    <div className="rounded-lg border border-white/10 bg-black/80 p-2">
                      <div className="text-neutral-500">Edge-safe</div>
                      <p className="mt-1 text-[10px] text-neutral-400">
                        Overlay runs beside your game, no input automation.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/80 p-2">
                      <div className="text-neutral-500">Hotkey</div>
                      <p className="mt-1 text-[10px] text-neutral-400">
                        Toggle chat on / off while staying in combat.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/80 p-2">
                      <div className="text-neutral-500">Same identity</div>
                      <p className="mt-1 text-[10px] text-neutral-400">
                        XP, titles, and rep carry over from the web.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-white/8 text-[12px] font-semibold tracking-[0.18em] uppercase text-neutral-200 py-2.5 disabled:cursor-not-allowed disabled:opacity-80 hover:bg-white/12 transition-colors"
                >
                  Download for Windows
                  <span className="ml-2 text-[10px] font-normal tracking-[0.18em] text-neutral-500">
                    Coming soon
                  </span>
                </button>

                <p className="mt-2 text-[11px] text-neutral-500">
                  Windows builds follow shortly after macOS once we finish
                  signing, installers, and launch-day stress testing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER COPY */}
        <section className="border-t border-white/5 pt-8 text-[11px] text-neutral-500">
          <p>
            When the builds are ready, the buttons above will switch to direct
            download links for the latest signed installers (
            <span className="text-neutral-300">.dmg</span> on macOS and{" "}
            <span className="text-neutral-300">.msi / .exe</span> on Windows).
          </p>
          <p className="mt-2">
            Until then, you can always use Astrum in the browser at{" "}
            <Link
              href="/crossroads/global"
              className="text-emerald-300 hover:text-emerald-200"
            >
              /crossroads/global
            </Link>{" "}
            while we finish packaging the desktop overlay.
          </p>
        </section>
      </div>
    </main>
  );
}
