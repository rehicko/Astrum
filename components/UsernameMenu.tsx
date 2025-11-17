// components/UsernameMenu.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useProfileCard } from "@/components/ProfileCardProvider";

type UsernameMenuProps = {
  name: string | null;
  messageId: string;
  userId: string | null;
  classicName: string | null;
  classicRealm: string | null;
  classicRegion: string | null;
  classicFaction: string | null;
  classicClass: string | null;
  classicRace: string | null;
  classicLevel: number | null;
  joinedAt: string | null;
};

type MenuState = {
  open: boolean;
  x: number;
  y: number;
};

export function UsernameMenu({
  name,
  messageId,
  userId,
  classicName,
  classicRealm,
  classicRegion,
  classicFaction,
  classicClass,
  classicRace,
  classicLevel,
  joinedAt,
}: UsernameMenuProps) {
  const supabase = useMemo(() => createClient(), []);
  const { openProfileCard } = useProfileCard();
  const safeName = name || "Anonymous";

  const [menu, setMenu] = useState<MenuState>({
    open: false,
    x: 0,
    y: 0,
  });

  const [reporting, setReporting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = () => {
    setMenu((prev) => ({ ...prev, open: false }));
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Trackpad-friendly: left-click also opens menu
  const handleClick = (e: React.MouseEvent) => {
    handleOpen(e);
  };

  // Close on outside click or Escape
  useEffect(() => {
    if (!menu.open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [menu.open]);

  const handleViewProfile = () => {
    if (!userId) {
      closeMenu();
      alert("Profile not available for this message.");
      return;
    }

    openProfileCard({
      userId,
      displayName: safeName,
      classicName,
      classicRealm,
      classicRegion,
      classicFaction,
      classicClass,
      classicRace,
      classicLevel,
      joinedAt,
      anchorX: menu.x,
      anchorY: menu.y,
    });

    closeMenu();
  };

  const handleAddFriend = () => {
    closeMenu();
    alert("Friends system coming soon.");
  };

  const handleWhisper = () => {
    closeMenu();
    alert("Whispers coming soon.");
  };

  const handleReport = async () => {
    closeMenu();
    setReporting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("You must be signed in to report messages.");
        setReporting(false);
        return;
      }

      const { error } = await supabase.from("message_reports").insert({
        message_id: messageId,
        reporter_id: session.user.id,
        reason: "Reported from context menu",
      });

      if (error) {
        console.error("Report error:", error);
        alert("Failed to send report.");
      } else {
        alert("Report sent.");
      }
    } catch (err) {
      console.error("Report failed:", err);
      alert("Failed to send report.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
      {/* Username text */}
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={handleOpen}
        className="font-semibold text-sky-300 hover:text-sky-100 focus:outline-none focus:ring-1 focus:ring-sky-500/70 rounded-sm transition-colors"
      >
        {safeName}
      </button>

      {/* Floating menu */}
      {menu.open && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[200px] rounded-xl border border-sky-500/40 bg-black/95 backdrop-blur-md shadow-[0_22px_60px_rgba(0,0,0,0.9)] text-xs text-neutral-100 overflow-hidden astrum-menu"
          style={{
            top: menu.y + 6,
            left: menu.x + 6,
          }}
        >
          {/* Neon glow top strip */}
          <div className="h-[2px] w-full astrum-menu-glow bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500" />

          {/* Header */}
          <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02] text-[11px] text-neutral-300 flex items-center justify-between">
            <span className="truncate">{safeName}</span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-sky-400/80">
              Astrum
            </span>
          </div>

          {/* Items */}
          <button
            type="button"
            onClick={handleViewProfile}
            className="w-full text-left px-3 py-2.5 hover:bg-sky-500/15 hover:text-sky-100 flex items-center justify-between transition-colors"
          >
            <span>View Profile</span>
            <span className="text-[9px] text-neutral-500">ENTER</span>
          </button>

          <button
            type="button"
            disabled
            onClick={handleAddFriend}
            className="w-full text-left px-3 py-2.5 text-neutral-500 hover:bg-white/5 cursor-not-allowed flex items-center justify-between"
          >
            <span>Add Friend (soon)</span>
            <span className="text-[9px] uppercase tracking-[0.16em]">
              LOCKED
            </span>
          </button>

          <button
            type="button"
            disabled
            onClick={handleWhisper}
            className="w-full text-left px-3 py-2.5 text-neutral-500 hover:bg-white/5 cursor-not-allowed flex items-center justify-between"
          >
            <span>Whisper (soon)</span>
            <span className="text-[9px] uppercase tracking-[0.16em]">
              LOCKED
            </span>
          </button>

          <div className="border-t border-white/5 mt-1" />

          <button
            type="button"
            onClick={handleReport}
            className="w-full text-left px-3 py-2.5 hover:bg-red-900/40 text-red-300 flex items-center justify-between transition-colors"
          >
            <span>{reporting ? "Reporting…" : "Report"}</span>
            <span className="text-[9px] uppercase tracking-[0.16em] text-red-400/90">
              ALERT
            </span>
          </button>
        </div>
      )}
    </>
  );
}
