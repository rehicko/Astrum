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
      "Astrum is a live social layer for games. Think of it as threads that feel like in-game chat — but crossrealm, faster, and not buried inside a massive Discord. One account gives you access to channels, profiles, reputation, and (later) an overlay that follows you between matches and raids.",
  },
  {
    question: "How does Astrum work with my games?",
    answer:
      "Right now, Astrum runs in your browser. You log in, join Crossroads, and talk in real time with other players. The long-term plan is a desktop overlay that can sit on top of any game that supports windowed or fullscreen-windowed mode, so your social feed feels like part of the game — not a second monitor you forget about.",
  },
  {
    question: "Is Astrum safe to use?",
    answer:
      "Yes. Astrum does not automate gameplay, does not send inputs for you, and does not read game memory. It’s a separate app that shows chat on your screen. You still need to follow the Terms of Service for whatever game you’re playing, but Astrum is designed to stay on the safe side: no bots, no scripting, no gameplay power.",
  },
  {
    question: "What can I do in the alpha right now?",
    answer:
      "In this early alpha, you can create an account, set your display name and bio, and talk in the Crossroads global channel. Messages are screened by AI before they go live, and you can report messages that cross the line. Profiles and moderation tools will evolve as we learn how people actually use the network.",
  },
  {
    question: "What’s coming next?",
    answer:
      "Short-term: better profiles, account linking, and cleaner UI. Then: character cards (class/spec, region), more channels for different game modes, and the first desktop overlay so Astrum can sit on top of your favorite games. The goal is simple: a single identity and social feed that follows you, instead of a new Discord server for every group.",
  },
  {
    question: "How does moderation work?",
    answer:
      "Every message goes through an AI check before it hits the live feed. If it looks abusive, hateful, or obviously over the line, it gets blocked. Players can also report messages, which get surfaced for review. Racism, threats, doxxing, and similar garbage are not welcome here. Astrum is for people who actually want to play and talk, not ruin the atmosphere.",
  },
  {
    question: "Is Astrum free?",
    answer:
      "Yes. During alpha, Astrum is free to use. In the future there may be optional supporter features or cosmetics, but there are no plans to sell gameplay power, paid advantages, or anything that makes the experience pay-to-win.",
  },
  {
    question: "Who is building Astrum?",
    answer:
      "Astrum is being built by a small group of players who wanted something better than dead trade chat and another bloated Discord server. This is a real alpha: things will change, features will break, and your feedback will directly shape what stays and what gets cut.",
  },
  {
    question: "How do I give feedback or report bugs?",
    answer:
      "For now, use the same channel where you received your alpha access — share screenshots, describe what happened, and include your browser and platform if you can. As Astrum grows, there will be a dedicated feedback channel and clearer support paths inside the app.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex w-full justify-center px-4 py-10 md:py-16">
      <div className="w-full max-w-4xl">
        {/* Page header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.35em] text-cyan-400/80">
              QUESTIONS
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Astrum FAQ
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              A quick overview of what Astrum is, how it works with your games,
              and what to expect while we&apos;re in alpha.
            </p>
          </div>

          <div className="hidden text-right text-[11px] text-white/45 md:block">
            <p className="font-medium">Alpha status</p>
            <p>Live · Expect bugs · Features may change.</p>
          </div>
        </div>

        {/* Card container */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.8)] md:p-8">
          <div className="space-y-6">
            {faqs.map((item, index) => (
              <div
                key={item.question}
                className={`border-b border-white/8 pb-6 ${
                  index === faqs.length - 1 ? "border-b-0 pb-0" : ""
                }`}
              >
                <h2 className="text-sm font-semibold text-white">
                  {item.question}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-cyan-400/40 bg-cyan-400/5 px-4 py-4 text-xs text-white/80 md:px-5 md:py-5">
            <p className="font-semibold text-cyan-200">
              Still unsure about something?
            </p>
            <p className="mt-1 text-white/75">
              This is an early build. If you&apos;re in doubt about how Astrum
              interacts with a specific game, stay on the safe side and ask
              before you rely on it. You can always drop back to using the web
              app while we finish the first overlay.
            </p>
            <p className="mt-3 text-white/70">
              You can jump back into chat at any time from{" "}
              <Link
                href="/crossroads/global"
                className="font-semibold text-cyan-300 underline-offset-4 hover:underline"
              >
                Crossroads
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
