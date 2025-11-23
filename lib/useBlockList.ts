// lib/useBlockList.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export type BlockEntry = {
  blockedUserId: string;
  blockedDisplayName: string | null;
  createdAt: string;
};

export type UseBlockListResult = {
  entries: BlockEntry[];
  blockedIds: string[];
  loading: boolean;
  error: string | null;
  blockUser: (targetUserId: string | null) => Promise<void>;
  unblockUser: (targetUserId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useBlockList(): UseBlockListResult {
  const supabase = useMemo(() => createClient(), []);
  // undefined = still resolving session, null = no user, string = logged in
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  const [entries, setEntries] = useState<BlockEntry[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load current user id once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        console.warn("useBlockList getSession error:", error);
        setError(error.message);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(data.session?.user.id ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setBlockedIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("user_blocks")
      .select(
        `
          blocked_id,
          created_at,
          blocked_profile:profiles!user_blocks_blocked_id_fkey (
            display_name
          )
        `
      )
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("useBlockList refresh error:", error);
      setError(error.message);
      setEntries([]);
      setBlockedIds([]);
      setLoading(false);
      return;
    }

    const mapped: BlockEntry[] =
      (data as any[] | null)?.map((row) => ({
        blockedUserId: row.blocked_id,
        blockedDisplayName: row.blocked_profile?.display_name ?? null,
        createdAt: row.created_at,
      })) ?? [];

    setEntries(mapped);
    setBlockedIds(mapped.map((e) => e.blockedUserId));
    setLoading(false);
  }, [supabase, userId]);

  // Initial load once we know whether there *is* a user
  useEffect(() => {
    if (userId === undefined) {
      // still resolving auth
      return;
    }

    if (userId === null) {
      // not signed in
      setEntries([]);
      setBlockedIds([]);
      setLoading(false);
      return;
    }

    void refresh();
  }, [userId, refresh]);

  const blockUser = useCallback(
    async (targetUserId: string | null) => {
      if (!userId || !targetUserId) return;

      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: userId,
        blocked_id: targetUserId,
      });

      if (error) {
        console.error("blockUser error:", error);
        setError(error.message);
        return;
      }

      // Optimistic: mark as blocked in local list.
      setBlockedIds((prev) =>
        prev.includes(targetUserId) ? prev : [...prev, targetUserId]
      );
      // We don't know their name from here, so Settings will show it correctly
      // after the next refresh (or if it was already loaded).
    },
    [supabase, userId]
  );

  const unblockUser = useCallback(
    async (targetUserId: string | null) => {
      if (!userId || !targetUserId) return;

      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", targetUserId);

      if (error) {
        console.error("unblockUser error:", error);
        setError(error.message);
        return;
      }

      // Optimistic: remove from local state so Settings updates immediately.
      setEntries((prev) =>
        prev.filter((entry) => entry.blockedUserId !== targetUserId)
      );
      setBlockedIds((prev) =>
        prev.filter((id) => id !== targetUserId)
      );
    },
    [supabase, userId]
  );

  return {
    entries,
    blockedIds,
    loading,
    error,
    blockUser,
    unblockUser,
    refresh,
  };
}
