// components/MiniProfileCard.tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type MiniProfileCardProps = {
  portalEl: HTMLElement;
  data: {
    userId: string;
    displayName: string;
    classicName: string | null;
    classicRealm: string | null;
    classicRegion: string | null;
    classicFaction: string | null;
    classicClass: string | null;
    classicRace: string | null;
    classicLevel: number | null;
    joinedAt: string | null;
    anchorX: number;
    anchorY: number;

    // New rank fields
    level: number | null;
    xp: number | null;
    highestTitle: string | null;
    displayTitle: string | null;
    showTitle: boolean | null;
  };
  onClose: () => void;
};

function formatJoined(joinedAt: string | null) {
  if (!joinedAt) return null;
  const d = new Date(joinedAt);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Shared title logic (same idea as public profile)
function getDisplayTitleFromData(
  data: MiniProfileCardProps["data"]
): string | null {
  if (data.showTitle === false) return null;

  const explicit =
    data.displayTitle && data.displayTitle.trim().length > 0
      ? data.displayTitle.trim()
      : null;

  const highest =
    data.highestTitle && data.highestTitle.trim().length > 0
      ? data.highestTitle.trim()
      : null;

  return explicit ?? highest ?? null;
}

export function MiniProfileCard({
  portalEl,
  data,
  onClose,
}: MiniProfileCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const joinedLabel = useMemo(() => formatJoined(data.joinedAt), [data]);

  const classicPrimaryLine = useMemo(() => {
    if (!data.classicName) return null;
    const pieces = [
      data.classicName,
      "—",
      data.classicLevel ? String(data.classicLevel) : null,
      data.classicRace,
      data.classicClass,
    ].filter(Boolean);
    return pieces.join(" ");
  }, [data]);

  const classicRealmLine = useMemo(() => {
    if (!data.classicRealm && !data.classicRegion) return null;
    const pieces = [
      data.classicRealm,
      data.classicRegion ? `(${data.classicRegion})` : null,
    ].filter(Boolean);
    return pieces.join(" ");
  }, [data]);

  const effectiveTitle = useMemo(
    () => getDisplayTitleFromData(data),
    [data]
  );
  const level = data.level;
  const xp = data.xp;

  // Close on Escape
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleViewProfile = () => {
    router.push(`/profile/${data.userId}`);
    onClose();
  };

  const handleViewRecentMessages = () => {
    router.push(`/profile/${data.userId}?section=messages`);
    onClose();
  };

  // Position card relative to click
  const top = data.anchorY + 8;
  const left = data.anchorX + 8;

  const content = (
    // 🔹 Full-screen backdrop that closes on click
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* The actual card – stop click from bubbling to backdrop */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute min-w-[280px] max-w-[360px] rounded-2xl border border-emerald-400/50 bg-black/95 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.95)] text-xs text-neutral-100 overflow-hidden"
        style={{ top, left }}
      >
        {/* Neon strip */}
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-400 via-emerald-200 to-emerald-400" />

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-neutral-50">
              {data.displayName}
            </span>
            {/* Rank line */}
            {(typeof level === "number" ||
              effectiveTitle ||
              typeof xp === "number") && (
              <span className="mt-0.5 text-[11px] text-neutral-400 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                {typeof level === "number" && (
                  <span className="text-neutral-300">
                    Level {level}
                  </span>
                )}
                {effectiveTitle && (
                  <>
                    {typeof level === "number" && (
                      <span className="text-neutral-700">•</span>
                    )}
                    <span className="text-neutral-100">
                      {effectiveTitle}
                    </span>
                  </>
                )}
                {typeof xp === "number" && (
                  <>
                    {(typeof level === "number" || effectiveTitle) && (
                      <span className="text-neutral-700">•</span>
                    )}
                    <span className="text-neutral-500">
                      {xp} XP
                    </span>
                  </>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] uppercase tracking-[0.18em] text-emerald-400/80">
              Astrum
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-neutral-400 hover:text-neutral-100"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2">
          {classicPrimaryLine ? (
            <>
              <p className="text-[13px] text-neutral-100">
                {classicPrimaryLine}
              </p>
              {classicRealmLine && (
                <p className="text-[12px] text-neutral-400">
                  {classicRealmLine}
                </p>
              )}
            </>
          ) : (
            <p className="text-[12px] text-neutral-500">
              No Classic main set yet.
            </p>
          )}

          {joinedLabel && (
            <p className="pt-2 mt-1 border-t border-neutral-900 text-[11px] text-neutral-500">
              Joined Astrum: {joinedLabel}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleViewProfile}
            className="px-4 py-2 rounded-full bg-white text-black text-[11px] font-semibold tracking-[0.18em] uppercase hover:bg-neutral-100 transition-colors"
          >
            View full profile
          </button>
          <button
            type="button"
            onClick={handleViewRecentMessages}
            className="text-[11px] text-neutral-400 hover:text-neutral-100"
          >
            View recent messages
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, portalEl);
}
