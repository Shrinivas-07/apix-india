// src/hooks/useLiveData.js
// Custom React hook for WebSocket live data
// Connects to backend WebSocket and streams live updates

import { useState, useEffect, useRef, useCallback } from "react"

const WS_URL = "wss://apix-india-api.onrender.com/ws/live"
// Replace with your actual Render URL — change https:// to wss://

export default function useLiveData() {
  const [data,       setData]       = useState(null)
  const [connected,  setConnected]  = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error,      setError]      = useState(null)

  const wsRef      = useRef(null)
  const pingRef    = useRef(null)
  const retryRef   = useRef(null)
  const retryCount = useRef(0)

  const connect = useCallback(() => {
    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      console.log("[WS] Connecting...")
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[WS] Connected")
        setConnected(true)
        setError(null)
        retryCount.current = 0

        // Send ping every 30 seconds to keep connection alive
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping")
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === "pong" || msg.type === "keepalive") return

          if (msg.type === "update") {
            setData(msg)
            setLastUpdate(new Date())
          }

          if (msg.type === "error") {
            console.warn("[WS] Server error:", msg.message)
          }
        } catch (e) {
          console.warn("[WS] Parse error:", e)
        }
      }

      ws.onclose = (event) => {
        console.log("[WS] Disconnected:", event.code)
        setConnected(false)
        clearInterval(pingRef.current)

        // Reconnect with exponential backoff
        const delay = Math.min(
          1000 * Math.pow(2, retryCount.current), 30000
        )
        retryCount.current++
        console.log(`[WS] Reconnecting in ${delay}ms...`)
        retryRef.current = setTimeout(connect, delay)
      }

      ws.onerror = (e) => {
        console.warn("[WS] Error — falling back to polling")
        setError("WebSocket unavailable — using polling")
        ws.close()
      }

    } catch (e) {
      console.warn("[WS] Could not connect:", e)
      setError("Could not connect to live feed")
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      // Cleanup on unmount
      clearInterval(pingRef.current)
      clearTimeout(retryRef.current)
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted")
      }
    }
  }, [connect])

  return { data, connected, lastUpdate, error }
}