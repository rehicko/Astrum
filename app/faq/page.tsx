// app/faq/page.tsx
import Link from "next/link";

type FaqItem = {
  question: string;
  answer: string;
  tag?: string;
};

const faqs: FaqItem[] = [
  {
    question: "What is Astrum?",
    answer:
      "Astrum is a real-time social layer that sits over your games. Think of it as global channels that feel like in-game chat — but cross-realm, persistent, and not buried inside yet another giant Discord. One account gives you channels, profiles, reputation, and an overlay that can follow you between raids, queues, and seasons.",
  },
  {
    question: "How does Astrum work with my games?",
    answer:
      "Right now you can use Astrum in two ways: in the browser at astrum.gg, and through the desktop overlay. The web app gives you global channels and profiles in a standard tab. The overlay floats above your game in windowed or fullscreen-windowed mode so you can read and send messages without alt-tabbing. Astrum never injects into the game client — it’s just a separate window that rides on top.",
  },
  {
    question: "Is Astrum safe to use?",
    answer:
      "Yes. Astrum does not automate gameplay, does not send inputs for you, and does not read game memory. It shows chat in its own window and leaves your game alone. You still need to follow the Terms of Service for whatever game you’re playing, but Astrum itself is built to stay on the safe side: no bots, no scripting, no gameplay power.",
  },
  {
    question: "What should I know about the desktop overlay in alpha?",
    answer:
      "The overlay is optional and still in alpha. It’s a separate desktop window that floats above your game so you can keep Astrum chat visible while you play. Behavior can vary by game, window mode, and OS, and we’re actively tightening things like how reliably it stays on top and how clean the install feels. If it ever feels janky, you can always fall back to astrum.gg in your browser while we iterate.",
  },
  {
    question: "What can I do in the alpha right now?",
    answer:
      "In this alpha, you can create an account, set your display name and bio, and talk in Astrum’s first always-on global channel. Messages are screened by AI before they go live, you can report anything out of line, and moderators can issue strikes or bans if needed. Profiles, reputation, and the overlay experience will evolve as we see how people actually use the network.",
  },
  {
    question: "What’s coming next?",
    answer:
      "Short-term: cleaner onboarding, better profiles, and a smoother overlay install for Windows and macOS. Then: more channels for different game modes and regions, richer character identity, and support for more games beyond WoW. The goal is simple: a single identity and social feed that follows you, instead of spinning up a new Discord for every group.",
  },
  {
    question: "How does moderation work?",
    answer:
      "Every message passes through an AI gate before it hits the live feed. If it looks abusive, hateful, or obviously over the line, it’s blocked. Players can also report messages, which get surfaced to human moderators. Repeated bad behavior leads to strikes and time-limited bans. Racism, threats, doxxing, and similar garbage are not welcome here — Astrum is for people who actually want to play and talk, not ruin the atmosphere.",
  },
  {
    question: "Is Astrum free?",
    answer:
      "Yes. During alpha, Astrum is free to use. In the future there may be optional supporter features or cosmetics, but there are no plans to sell gameplay power, paid advantages, or anything that makes the experience pay-to-win.",
  },
  {
    question: "Who is building Astrum?",
    answer:
      "Astrum is being built by a small group of players who were tired of dead trade chat, LFG spam, and Discord servers that feel like filing cabinets. This is a real alpha: features will change, things will break, and your feedback directly shapes what stays, what gets cut, and what we build next.",
  },
  {
    question: "How do I contact Astrum for support?",
    answer:
      "For account issues, questions about how Astrum works, or anything that doesn’t fit well in a chat message, you can email support@astrum.gg. Include your Astrum display name, what game you were playing, and what went wrong so we can help faster.",
  },
  {
    question: "How do I request new channels or features?",
    answer:
      "If you want a new global channel, game category, or feature, send a short proposal to request@astrum.gg. Tell us which game, region, and what problem your idea solves. We’ll use this inbox to decide what we test next in alpha.",
  },
  {
    question: "How do I give feedback or report bugs?",
    answer:
      "During alpha, you can still share feedback in the same channel or community where you received your invite, or inside the app by flagging messages and describing what went wrong. Screenshots, what you were doing, and your browser or OS all help. If it’s easier, you can also email support@astrum.gg. As Astrum grows, there will be a dedicated feedback channel and a clearer support path listed here.",
  },
];

export default function FaqPage() {
  return (
    <main className="flex justify-center px-4 py-10 md:py-16">
      <div className="relative w-full max-w-5xl">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute -inset-[80px] -z-10
          bg-[radial-gradient(circle_at_18%_12%,_rgba(16,185,129,0.03),_transparent_68%),radial-gradient(circle_at_85%_115%,_rgba(16,185,129,0.02),_transparent_80%)]"
        />

        {/* Page header */}
        <header className="mb-10 flex flex-col justify-between gap-6 md:mb-12 md:flex-row md:items-end">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-emerald-400">
              A S T R U M&nbsp;&nbsp;A L P H A
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
                Astrum FAQ
              </h1>
              <p className="max-w-2xl text-sm text-zinc-400 md:text-[15px]">
                A quick overview of what Astrum is, how it works with your
                games, and what to expect while we&apos;re in alpha — both in
                the browser and with the desktop overlay.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-right text-[11px] text-zinc-400 shadow-[0_18px_40px_rgba(0,0,0,0.7)] md:min-w-[220px]">
            <p className="font-medium text-zinc-200">Alpha status</p>
            <p className="mt-0.5">
              Closed alpha · Expect bugs · Features may reset.
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              What you do here shapes what Astrum becomes.
            </p>
          </div>
        </header>

        {/* Card container */}
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.85)] md:p-8">
          <div className="space-y-6">
            {faqs.map((item, index) => (
              <article
                key={item.question}
                className={`border-b border-zinc-800 pb-6 ${
                  index === faqs.length - 1 ? "border-b-0 pb-0" : ""
                }`}
              >
                <h2 className="text-sm font-semibold text-foreground md:text-[15px]">
                  {item.question}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-4 text-xs text-zinc-200 md:px-5 md:py-5">
            <p className="font-semibold text-emerald-300">
              Still unsure about something?
            </p>
            <p className="mt-1 text-zinc-200/80">
              This is an early build. If you&apos;re unsure how Astrum interacts
              with a specific game or setup, err on the safe side and ask before
              you rely on it. You can always fall back to using the web app
              while we refine the overlay.
            </p>
            <p className="mt-3 text-zinc-300">
              For direct help, you can email{" "}
              <span className="font-semibold text-emerald-300">
                support@astrum.gg
              </span>{" "}
              with your Astrum display name, game, and a short description of
              what&apos;s happening. If you want to pitch a new channel or
              feature, send it to{" "}
              <span className="font-semibold text-emerald-300">
                request@astrum.gg
              </span>{" "}
              and tell us what problem it would solve.
            </p>
            <p className="mt-3 text-zinc-300">
              You can jump back into chat at any time from{" "}
              <Link
                href="/crossroads/global"
                className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
              >
                the global channel
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
