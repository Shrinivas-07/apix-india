// frontend/src/api.js
// All API calls to our backend go through this file
// Change BACKEND_URL to your Render URL

const BACKEND_URL = "https://apix-india-api.onrender.com"
// ↑ IMPORTANT: Replace with your actual Render URL

export async function fetchLatestIndex() {
  const res = await fetch(`${BACKEND_URL}/api/index/latest`)
  if (!res.ok) throw new Error("Failed to fetch latest index")
  return res.json()
}

export async function fetchIndexHistory(days = 30) {
  const res = await fetch(`${BACKEND_URL}/api/index/history?days=${days}`)
  if (!res.ok) throw new Error("Failed to fetch history")
  return res.json()
}

export async function fetchRoutes() {
  const res = await fetch(`${BACKEND_URL}/api/routes`)
  if (!res.ok) throw new Error("Failed to fetch routes")
  return res.json()
}

export async function fetchRouteDetail(origin, destination) {
  const res = await fetch(`${BACKEND_URL}/api/route/${origin}/${destination}`)
  if (!res.ok) throw new Error("Failed to fetch route detail")
  return res.json()
}

export async function fetchStats() {
  const res = await fetch(`${BACKEND_URL}/api/stats`)
  if (!res.ok) throw new Error("Failed to fetch stats")
  return res.json()
}