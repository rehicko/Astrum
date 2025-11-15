// components/UsernameMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type UsernameMenuProps = {
  name: string | null;
};

type MenuState = {
  open: boolean;
  x: number;
  y: number;
};

export function UsernameMenu({ name }: UsernameMenuProps) {
  const safeName = name || "Anonymous";
  const [menu, setMenu] = useState<MenuState>({
    open: false,
    x: 0,
    y: 0,
  });

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

  // Left-click to open as well (for trackpads)
  const handleClick = (e: React.MouseEvent) => {
    handleOpen(e);
  };

  // Close on click outside or Escape
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

  // Actions — wired later
  const handleViewProfile = () => {
    closeMenu();
    alert("View Profile is coming soon. You’ll be able to inspect players here.");
  };

  const handleAddFriend = () => {
    closeMenu();
    alert("Friends system is coming soon. For now this is disabled.");
  };

  const handleWhisper = () => {
    closeMenu();
    alert("Whispers / private threads are coming soon.");
  };

  const handleReport = () => {
    closeMenu();
    alert(
      "Report placeholder. This will soon send a report into the moderation queue."
    );
  };

  return (
    <>
      {/* Username label */}
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={handleOpen}
        className="font-semibold text-sky-300 hover:text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-500/70 rounded-sm transition-colors"
      >
        {safeName}
      </button>

      {/* Context menu */}
      {menu.open && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[190px] rounded-xl border border-sky-500/30 bg-black/90 backdrop-blur-md shadow-[0_18px_45px_rgba(0,0,0,0.85)] text-xs text-neutral-100 overflow-hidden animate-[fadeIn_120ms_ease-out]"
          style={{
            top: menu.y + 6,
            left: menu.x + 6,
          }}
        >
          {/* Accent glow strip */}
          <div className="h-[2px] w-full bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500" />

          {/* Header */}
          <div className="px-3 py-2 border-b border-white/5 bg-white/2 text-[11px] text-neutral-300 flex items-center justify-between">
            <span className="truncate">{safeName}</span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-sky-400/80">
              Astrum
            </span>
          </div>

          {/* Items */}
          <button
            type="button"
            onClick={handleViewProfile}
            className="w-full text-left px-3 py-2.5 hover:bg-sky-500/10 hover:text-sky-200 flex items-center justify-between transition-colors"
          >
            <span>View Profile</span>
            <span className="text-[9px] text-neutral-500">ENTER</span>
          </button>

          <button
            type="button"
            onClick={handleAddFriend}
            disabled
            className="w-full text-left px-3 py-2.5 text-neutral-500 hover:bg-white/5 cursor-not-allowed flex items-center justify-between"
          >
            <span>Add Friend (soon)</span>
            <span className="text-[9px] uppercase tracking-[0.16em]">
              LOCKED
            </span>
          </button>

          <button
            type="button"
            onClick={handleWhisper}
            disabled
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
            <span>Report</span>
            <span className="text-[9px] uppercase tracking-[0.16em] text-red-400/90">
              ALERT
            </span>
          </button>
        </div>
      )}
    </>
  );
}
