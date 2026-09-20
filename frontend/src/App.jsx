// src/App.jsx
import Compare from "./pages/Compare"
import { Routes, Route, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import Navbar          from "./components/Navbar"
import Footer          from "./components/Footer"
import PageTransition  from "./components/PageTransition"
import Home            from "./pages/Home"
import IndexPage       from "./pages/Index"
import RoutesPage      from "./pages/Routes"
import RoutePage       from "./pages/RoutePage"
import Search          from "./pages/Search"
import Analytics       from "./pages/Analytics"
import Backtest        from "./pages/Backtest"
import ApiDocs         from "./pages/ApiDocs"
import { fetchLatestIndex } from "./api"
import { gradients } from "./styles/theme"
import NotFound from "./pages/NotFound"
import { wakeServer } from "./api"

export default function App() {
  const location = useLocation()
  const [apix, setApix] = useState(null)

  useEffect(() => {
    fetchLatestIndex()
      .then(d => setApix(d?.apix_value))
      .catch(() => {})
  }, [])

    // Wake Render server on app load (free tier sleeps)
  useEffect(() => {
    wakeServer()
  }, [])

  return (
    <div style={{
      minHeight:"100vh",
      background:gradients.hero,
      position:"relative",
    }}>
      {/* Mesh gradient */}
      <div style={{
        position:"fixed", inset:0,
        background:gradients.mesh,
        pointerEvents:"none", zIndex:0,
      }} />

      <div style={{ position:"relative", zIndex:1 }}>
        <Navbar apix={apix} />

        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <PageTransition><Home /></PageTransition>
            } />
            <Route path="/index" element={
              <PageTransition><IndexPage /></PageTransition>
            } />
            <Route path="/routes" element={
              <PageTransition><RoutesPage /></PageTransition>
            } />
            <Route path="/route/:id" element={
              <PageTransition><RoutePage /></PageTransition>
            } />
            <Route path="/search" element={
              <PageTransition><Search /></PageTransition>
            } />
            <Route path="/analytics" element={
              <PageTransition><Analytics /></PageTransition>
            } />
            <Route path="/backtest" element={
              <PageTransition><Backtest /></PageTransition>
            } />
            <Route path="/api" element={
              <PageTransition><ApiDocs /></PageTransition>
            } />
            <Route path="/compare" element={
              <PageTransition><Compare /></PageTransition>
            } />
            <Route path="*" element={
              <PageTransition><NotFound /></PageTransition>
            } />
          </Routes>
        </AnimatePresence>

        <Footer />
      </div>
    </div>
  )
}