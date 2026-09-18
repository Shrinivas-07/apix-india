// src/main.jsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, useLocation } from "react-router-dom"
import { useEffect } from "react"
import "./index.css"
import App from "./App.jsx"

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top:0, behavior:"smooth" })
  }, [pathname])
  return null
}

function Root() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <App />
    </BrowserRouter>
  )
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
)