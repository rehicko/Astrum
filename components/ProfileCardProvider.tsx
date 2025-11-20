// components/ProfileCardProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { MiniProfileCard } from "./MiniProfileCard";

export type ProfileCardPayload = {
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

  // 🔹 New rank-related fields (optional in payload so old callers still compile)
  level?: number | null;
  xp?: number | null;
  highestTitle?: string | null;
  displayTitle?: string | null;
  showTitle?: boolean | null;
};

type ProfileCardContextValue = {
  openProfileCard: (payload: ProfileCardPayload) => void;
  closeProfileCard: () => void;
};

const ProfileCardContext = createContext<ProfileCardContextValue | undefined>(
  undefined
);

export function ProfileCardProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ProfileCardPayload | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById("astrum-profile-card-root");
    setPortalEl(el);
  }, []);

  const openProfileCard = (payload: ProfileCardPayload) => {
    setCurrent(payload);
  };

  const closeProfileCard = () => {
    setCurrent(null);
  };

  const ctxValue: ProfileCardContextValue = {
    openProfileCard,
    closeProfileCard,
  };

  return (
    <ProfileCardContext.Provider value={ctxValue}>
      {children}
      {portalEl && current && (
        <MiniProfileCard
          portalEl={portalEl}
          data={{
            // base fields
            userId: current.userId,
            displayName: current.displayName,
            classicName: current.classicName,
            classicRealm: current.classicRealm,
            classicRegion: current.classicRegion,
            classicFaction: current.classicFaction,
            classicClass: current.classicClass,
            classicRace: current.classicRace,
            classicLevel: current.classicLevel,
            joinedAt: current.joinedAt,
            anchorX: current.anchorX,
            anchorY: current.anchorY,
            // rank fields with safe defaults so the card always has them
            level: current.level ?? null,
            xp: current.xp ?? null,
            highestTitle: current.highestTitle ?? null,
            displayTitle: current.displayTitle ?? null,
            showTitle: current.showTitle ?? true,
          }}
          onClose={closeProfileCard}
        />
      )}
    </ProfileCardContext.Provider>
  );
}

// default export as well, just in case we ever import it that way
export default ProfileCardProvider;

export function useProfileCard() {
  const ctx = useContext(ProfileCardContext);
  if (!ctx) {
    throw new Error(
      "useProfileCard must be used within a ProfileCardProvider"
    );
  }
  return ctx;
}
