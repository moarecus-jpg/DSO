import { useEffect, useRef } from "react";

function chatWsUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/chat`;
}

/**
 * Live chat socket. Calls onEvent for chat.message / chat.room / chat.ready.
 * Returns { connectedRef } via callback onStatus optional.
 */
export function useChatSocket({ enabled = true, onEvent, onStatus } = {}) {
  const onEventRef = useRef(onEvent);
  const onStatusRef = useRef(onStatus);
  onEventRef.current = onEvent;
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!enabled) return undefined;

    let ws = null;
    let closed = false;
    let retryTimer = null;
    let pingTimer = null;
    let attempt = 0;

    function setStatus(connected) {
      onStatusRef.current?.(connected);
    }

    function cleanupSocket() {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        ws = null;
      }
    }

    function connect() {
      if (closed) return;
      cleanupSocket();
      ws = new WebSocket(chatWsUrl());

      ws.onopen = () => {
        attempt = 0;
        setStatus(true);
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data?.type === "pong") return;
        onEventRef.current?.(data);
      };

      ws.onclose = () => {
        setStatus(false);
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        if (closed) return;
        attempt += 1;
        const delay = Math.min(1000 * 2 ** Math.min(attempt, 4), 15000);
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      };
    }

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      cleanupSocket();
      setStatus(false);
    };
  }, [enabled]);
}
