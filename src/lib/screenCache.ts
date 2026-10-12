// "Last seen" data for screens, so Wallet, Orders, Seller and Rider open
// instantly with what you saw last, then refresh quietly from the server.
//
// Safety rules:
// - Saved data is ONLY for showing. Every payment, withdrawal, checkout and
//   stock change is still checked live by the server.
// - Saved per account (the key includes the user id) and wiped on sign-out,
//   so the next person on the phone never sees your data.
// - Kept in memory (instant when switching tabs) and on the phone
//   (AsyncStorage), so it also survives closing the app and shows offline.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import { auth } from "./firebase";

const PREFIX = "cm.screen.v1.";
const MAX_SAVED_BYTES = 400 * 1024; // skip saving anything unusually large

type Entry = { data: unknown; savedAtMs: number };
const memory = new Map<string, Entry>();

function keyFor(name: string): string | null {
  const uid = auth.currentUser?.uid;
  return uid ? `${PREFIX}${uid}.${name}` : null;
}

function readNow(name: string): Entry | null {
  const key = keyFor(name);
  return key ? memory.get(key) ?? null : null;
}

async function readStored(name: string): Promise<Entry | null> {
  const key = keyFor(name);
  if (!key) return null;
  const inMemory = memory.get(key);
  if (inMemory) return inMemory;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry;
    if (!entry || typeof entry.savedAtMs !== "number") return null;
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

function save(name: string, data: unknown) {
  const key = keyFor(name);
  if (!key) return;
  const entry: Entry = { data, savedAtMs: Date.now() };
  memory.set(key, entry);
  try {
    const text = JSON.stringify(entry);
    if (text.length > MAX_SAVED_BYTES) return;
    AsyncStorage.setItem(key, text).catch(() => undefined);
  } catch {
    // not saveable: memory copy is enough
  }
}

/** Wipe every saved screen (all accounts). Called on sign-out. */
export async function clearScreenCache() {
  memory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // nothing saved
  }
}

type Options<T> = {
  /** Shape the data before saving (e.g. leave out a delivery code). */
  toStore?: (value: T) => unknown;
  /** Rebuild saved data (e.g. turn saved dates back into Dates). */
  fromStore?: (raw: any) => T;
};

/**
 * Like useState, but starts with the last saved value for this screen.
 * - setFresh(value): use for data that just came from the server (saves it).
 * - fromCache: true while what is shown is the saved copy, not yet refreshed.
 */
export function useScreenCache<T>(name: string, options: Options<T> = {}) {
  const opts = useRef(options);
  opts.current = options;

  const revive = (entry: Entry | null): T | null => {
    if (!entry) return null;
    try {
      return opts.current.fromStore ? opts.current.fromStore(entry.data) : (entry.data as T);
    } catch {
      return null;
    }
  };

  const first = readNow(name);
  const [value, setValue] = useState<T | null>(() => revive(first));
  const [fromCache, setFromCache] = useState<boolean>(first !== null);
  const [savedAtMs, setSavedAtMs] = useState<number | null>(first?.savedAtMs ?? null);
  const gotFresh = useRef(false);

  // Not in memory yet (app was closed): look on the phone.
  useEffect(() => {
    if (first) return;
    let alive = true;
    void readStored(name).then((entry) => {
      if (!alive || !entry || gotFresh.current) return;
      const v = revive(entry);
      if (v === null) return;
      setValue(v);
      setFromCache(true);
      setSavedAtMs(entry.savedAtMs);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const setFresh = useCallback(
    (next: T | null) => {
      gotFresh.current = true;
      setValue(next);
      setFromCache(false);
      if (next !== null) {
        save(name, opts.current.toStore ? opts.current.toStore(next) : next);
        setSavedAtMs(Date.now());
      }
    },
    [name],
  );

  return { value, setFresh, fromCache, savedAtMs };
}

export function savedAgo(savedAtMs: number | null): string {
  if (!savedAtMs) return "";
  const mins = Math.round((Date.now() - savedAtMs) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(savedAtMs).toLocaleDateString();
}
