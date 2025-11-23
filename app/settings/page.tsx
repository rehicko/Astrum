// app/settings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { RequireAuthGate } from "@/components/RequireAuthGate";
import { useBlockList } from "@/lib/useBlockList";

type ProviderState = {
  email: string | null;
  hasEmail: boolean;
  hasGoogle: boolean;
  hasTwitch: boolean;
  bnetLinked: boolean;
  bnetCharsCount: number | null;
};

const INITIAL_PROVIDER_STATE: ProviderState = {
  email: null,
  hasEmail: false,
  hasGoogle: false,
  hasTwitch: false,
  bnetLinked: false,
  bnetCharsCount: null,
};

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const { entries, loading, error, unblockUser } = useBlockList();
  const hasBlocked = entries.length > 0;

  const [providerState, setProviderState] =
    useState<ProviderState>(INITIAL_PROVIDER_STATE);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load auth providers + Battle.net link status for the current user
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setAuthLoading(true);
      setAuthError(null);

      // Use getSession() so we never trigger AuthSessionMissingError
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        console.error("settings auth getSession error:", error);
        setProviderState(INITIAL_PROVIDER_STATE);
        setAuthError("Failed to load account links.");
        setAuthLoading(false);
        return;
      }

      const session = data.session;
      if (!session) {
        // Not logged in (RequireAuthGate should usually handle this anyway)
        setProviderState(INITIAL_PROVIDER_STATE);
        setAuthLoading(false);
        return;
      }

      const user = session.user;

      // identities can be on the user object in the session payload
      const identities = ((user as any).identities ?? []) as Array<{
        provider: string;
      }>;
      const providers = identities.map((i) => i.provider);

      // Battle.net status from wow_characters
      const { data: chars, error: charsErr } = await supabase
        .from("wow_characters")
        .select("id")
        .eq("user_id", user.id);

      if (cancelled) return;

      let bnetLinked = false;
      let bnetCharsCount: number | null = null;

      if (!charsErr && chars) {
        bnetLinked = chars.length > 0;
        bnetCharsCount = chars.length;
      }

      setProviderState({
        email: user.email ?? null,
        hasEmail: providers.includes("email"),
        hasGoogle: providers.includes("google"),
        hasTwitch: providers.includes("twitch"),
        bnetLinked,
        bnetCharsCount,
      });

      setAuthLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <RequireAuthGate>
      <main className="max-w-5xl mx-auto px-4 pt-10 pb-16">
        {/* Page heading */}
        <header className="mb-8 md:mb-10 space-y-3">
          <p className="text-[11px] tracking-[0.32em] uppercase text-emerald-400/80">
            Account
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold">
            Settings &amp; safety.
          </h1>
          <p className="text-sm md:text-[13px] text-neutral-300 max-w-xl">
            Tweak how Astrum behaves for you. This is your space for identity,
            safety, and future overlay controls.
          </p>
        </header>

        {/* Accounts & links card */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-black/60 shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* Card header */}
          <div className="border-b border-white/5 px-5 md:px-8 py-4 md:py-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] tracking-[0.28em] uppercase text-emerald-400">
                Identity
              </p>
              <h2 className="text-base md:text-lg font-medium">
                Accounts &amp; links
              </h2>
              <p className="text-[12px] md:text-[11px] text-neutral-400 max-w-xl">
                See how you sign in to Astrum today, which providers are linked,
                and how your characters are connected.
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className="px-5 md:px-8 py-4 md:py-6 space-y-4 text-[13px]">
            {authLoading ? (
              <p className="text-[12px] text-neutral-400">
                Loading your account links…
              </p>
            ) : authError ? (
              <p className="text-[12px] text-red-300">
                {authError || "Failed to load account links."}
              </p>
            ) : (
              <>
                {/* Email row */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3">
                  <div className="space-y-0.5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                      Email login
                    </p>
                    <p className="text-[13px] text-neutral-100">
                      {providerState.email ?? "No email on file"}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Used for password sign-in and important notices.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-300">
                    {providerState.hasEmail ? "Active" : "Email only"}
                  </span>
                </div>

                {/* Google / Twitch rows */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                          Google
                        </p>
                        <p className="text-[12px] text-neutral-300">
                          One-click sign-in with your Google account.
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${
                          providerState.hasGoogle
                            ? "border border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                            : "border border-neutral-700 bg-black/40 text-neutral-400"
                        }`}
                      >
                        {providerState.hasGoogle ? "Linked" : "Not linked"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                          Twitch
                        </p>
                        <p className="text-[12px] text-neutral-300">
                          Connect for future streamer overlays and badges.
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${
                          providerState.hasTwitch
                            ? "border border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                            : "border border-neutral-700 bg-black/40 text-neutral-400"
                        }`}
                      >
                        {providerState.hasTwitch ? "Linked" : "Not linked"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Battle.net row (real status) */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-400">
                        Battle.net
                      </p>
                      <p className="text-[12px] text-neutral-300">
                        Link Battle.net to pull your characters directly into
                        Astrum and future overlays.
                      </p>
                      {providerState.bnetLinked && (
                        <p className="text-[11px] text-neutral-500">
                          {providerState.bnetCharsCount != null
                            ? `${providerState.bnetCharsCount} Retail character${
                                providerState.bnetCharsCount === 1 ? "" : "s"
                              } imported so far.`
                            : "Characters imported from your linked account."}
                        </p>
                      )}
                      {!providerState.bnetLinked && (
                        <p className="text-[11px] text-neutral-500">
                          Manage the link from your profile page to start
                          importing characters.
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${
                        providerState.bnetLinked
                          ? "border border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                          : "border border-neutral-700 bg-black/40 text-neutral-400"
                      }`}
                    >
                      {providerState.bnetLinked ? "Linked" : "Not linked"}
                    </span>
                  </div>
                </div>

                <p className="pt-1 text-[11px] text-neutral-500">
                  To link new providers, use the buttons on the sign-in page or
                  the Battle.net screen from your profile. Astrum will show them
                  here once they&apos;re connected.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Blocked users card */}
        <section className="rounded-3xl border border-white/10 bg-black/60 shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* Card header */}
          <div className="border-b border-white/5 px-5 md:px-8 py-4 md:py-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] tracking-[0.28em] uppercase text-emerald-400">
                Safety
              </p>
              <h2 className="text-base md:text-lg font-medium">
                Blocked users
              </h2>
              <p className="text-[12px] md:text-[11px] text-neutral-400 max-w-xl">
                When you block someone, you won&apos;t see future messages from
                them. They aren&apos;t notified and can still see public
                channels like normal.
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className="px-5 md:px-8 py-4 md:py-6 space-y-4">
            {loading ? (
              <p className="text-[12px] text-neutral-400">
                Loading your block list…
              </p>
            ) : error ? (
              <p className="text-[12px] text-red-300">
                {error || "Failed to load blocked users."}
              </p>
            ) : !hasBlocked ? (
              <p className="text-[12px] text-neutral-400">
                You haven&apos;t blocked anyone yet. If someone is being
                disruptive, open their name in chat and choose{" "}
                <span className="text-emerald-300 font-medium">
                  Block user
                </span>
                .
              </p>
            ) : (
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li
                    key={`${entry.blockedUserId}-${entry.createdAt}`}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg
                      white/[0.02] px-3.5 py-3 text-[13px]"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {entry.blockedDisplayName ?? "Unknown user"}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Blocked{" "}
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void unblockUser(entry.blockedUserId)}
                      className="px-3.5 py-1.5 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-[11px] font-medium tracking-[0.16em] uppercase hover:bg-emerald-500/20"
                    >
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="pt-2 text-[11px] text-neutral-500">
              Blocking only affects what you see in chat. Moderation is still
              handled separately by Astrum.
            </p>
          </div>
        </section>

        {/* Future sections placeholder */}
        <section className="mt-8 text-[11px] text-neutral-500">
          More settings will live here later: title visibility, class colors,
          overlay preferences, and notification controls.
        </section>
      </main>
    </RequireAuthGate>
  );
}
