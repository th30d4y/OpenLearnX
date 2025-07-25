import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { TestingPage } from './pages/TestingPage'
import { DashboardPage } from './pages/DashboardPage'
import { CertificatesPage } from './pages/CertificatesPage'

function App() {
  return (
    <>
      <nav style={{
        background: '#f4f7fb', padding: '1rem', marginBottom: '2rem',
        display: 'flex', gap: '1.5rem', borderBottom: '1px solid #eef'
      }}>
        <Link to="/">Home</Link>
        <Link to="/test">Testing</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/certificates">Certificates</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<TestingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
      </Routes>
    </>
  )
}

export default App
