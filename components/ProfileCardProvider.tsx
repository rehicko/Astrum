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
          data={current}
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
