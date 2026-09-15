// src/App.jsx — router shell
import { Routes, Route } from "react-router-dom"
import { useState, useEffect } from "react"
import Navbar from "./components/Navbar"
import Home      from "./pages/Home"
import IndexPage from "./pages/Index"
import Routes_   from "./pages/Routes"
import RoutePage from "./pages/RoutePage"
import Search    from "./pages/Search"
import Analytics from "./pages/Analytics"
import Backtest  from "./pages/Backtest"
import ApiDocs   from "./pages/ApiDocs"
import { fetchLatestIndex } from "./api"
import { gradients } from "./styles/theme"

export default function App() {
  const [apix, setApix] = useState(null)

  useEffect(() => {
    fetchLatestIndex()
      .then(d => setApix(d?.apix_value))
      .catch(() => {})
  }, [])

  return (
    <div style={{
      minHeight: "100vh",
      background: gradients.hero,
      position: "relative",
    }}>
      {/* Mesh gradient overlay */}
      <div style={{
        position: "fixed", inset: 0,
        background: gradients.mesh,
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar apix={apix} />
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/index"     element={<IndexPage />} />
          <Route path="/routes"    element={<Routes_ />} />
          <Route path="/route/:id" element={<RoutePage />} />
          <Route path="/search"    element={<Search />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/backtest"  element={<Backtest />} />
          <Route path="/api"       element={<ApiDocs />} />
        </Routes>
      </div>
    </div>
  )
}