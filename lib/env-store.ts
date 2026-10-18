"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_ENVIRONMENT, normalizeEnvironment, type Environment } from "./environment";

const STORAGE_KEY = "airpay-env";

const listeners = new Set<() => void>();
let current: Environment | null = null;

function read(): Environment {
  if (typeof window === "undefined") return DEFAULT_ENVIRONMENT;
  if (current === null) {
    current = normalizeEnvironment(window.localStorage.getItem(STORAGE_KEY));
  }
  return current;
}

function emit() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    current = normalizeEnvironment(event.newValue);
    emit();
  });
}

/** Current environment, readable outside React (e.g. the oRPC client). */
export function getEnvironment(): Environment {
  return read();
}

export function setEnvironment(next: Environment) {
  current = next;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Live environment value for client components. */
export function useEnvironment(): Environment {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_ENVIRONMENT);
}
