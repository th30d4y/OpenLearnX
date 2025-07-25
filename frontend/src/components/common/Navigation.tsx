import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { MetaMaskConnect } from '../auth/MetaMaskConnect'

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/test', label: 'Take Test' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/certificates', label: 'Certificates' },
  ]

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-primary-600">
            OpenLearnX
          </Link>

          <div className="flex items-center space-x-6">
            {user && (
              <>
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === item.path
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-primary-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
            
            {!user && <MetaMaskConnect />}
          </div>
        </div>
      </div>
    </nav>
  )
}
