"use client";

import { useEffect, useRef, useState } from "react";
import { eventsStreamUrl, getOutboxEvents, isDemoMode } from "./api";

export type StreamEvent = {
  id: string;
  type: "outbox" | "mismatch";
  data: string;
  receivedAt: string;
};

const MAX_EVENTS = 30;

export function useEventStream() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const idCounter = useRef(0);

  function pushEvent(type: StreamEvent["type"], data: string) {
    idCounter.current += 1;
    setEvents((prev) =>
      [{ id: String(idCounter.current), type, data, receivedAt: new Date().toISOString() }, ...prev].slice(
        0,
        MAX_EVENTS
      )
    );
  }

  useEffect(() => {
    // Demo mode: no real backend to stream from. Simulate occasional
    // events so the page demonstrates its own layout/behavior instead of
    // sitting empty -- clearly distinguishable from real data below.
    if (isDemoMode()) {
      setConnected(true);
      const interval = setInterval(() => {
        const type: StreamEvent["type"] = Math.random() > 0.5 ? "outbox" : "mismatch";
        pushEvent(type, JSON.stringify({ demo: true, note: "simulated -- no live backend connected" }));
      }, 4000);
      return () => clearInterval(interval);
    }

    // Polling fallback for browsers without EventSource (very old, or a
    // restrictive environment that blocks it). Real SSE is the common path.
    if (typeof EventSource === "undefined") {
      setUsingFallback(true);
      setConnected(true);
      const interval = setInterval(async () => {
        try {
          const outbox = await getOutboxEvents();
          if (outbox[0]) pushEvent("outbox", JSON.stringify(outbox[0]));
        } catch {
          setConnected(false);
        }
      }, 5000);
      return () => clearInterval(interval);
    }

    const source = new EventSource(eventsStreamUrl());
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("outbox", (e: MessageEvent) => pushEvent("outbox", e.data));
    source.addEventListener("mismatch", (e: MessageEvent) => pushEvent("mismatch", e.data));

    return () => source.close();
  }, []);

  return { events, connected, usingFallback };
}
