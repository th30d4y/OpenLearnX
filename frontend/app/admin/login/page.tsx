'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [adminToken, setAdminToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    
    // Check if already authenticated
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('admin_token')
      if (token === 'admin-secret-key') {
        try {
          // Verify token with API
          const response = await fetch('http://127.0.0.1:5000/api/admin/courses', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (response.ok) {
            console.log('Existing token valid, redirecting to dashboard')
            window.location.href = '/admin'
            return
          } else {
            // Token invalid, remove it
            localStorage.removeItem('admin_token')
          }
        } catch (error) {
          console.error('Token verification failed:', error)
          localStorage.removeItem('admin_token')
        }
      }
    }
    
    setTimeout(checkExistingAuth, 200)
  }, [router])

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    setError('')
    
    if (!adminToken.trim()) {
      setError('Please enter admin token')
      return
    }

    setIsLoading(true)
    
    try {
      console.log('Attempting login with token:', adminToken)
      
      // Test API connection first
      const testResponse = await fetch('http://127.0.0.1:5000/api/admin/courses', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      
      if (testResponse.ok) {
        console.log('API accepts token, saving to localStorage')
        
        // Clear any existing token first
        localStorage.removeItem('admin_token')
        
        // Save new token
        localStorage.setItem('admin_token', adminToken)
        
        // Verify it was saved
        const savedToken = localStorage.getItem('admin_token')
        console.log('Token saved verification:', savedToken)
        
        if (savedToken === adminToken) {
          console.log('✅ Token saved successfully, redirecting...')
          
          // Use window.location for reliable redirect
          setTimeout(() => {
            window.location.href = '/admin'
          }, 100)
        } else {
          setError('Failed to save authentication. Please try again.')
        }
      } else {
        console.log('API rejected token')
        setError('Invalid admin credentials. Please contact administrator.')
        setAdminToken('')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Connection failed. Make sure backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isClient) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">OL</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              OpenLearnX Admin
            </h1>
            <p className="text-gray-600 text-sm">
              Enter your admin credentials to manage courses
            </p>
          </div>
          
          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Token
              </label>
              <input
                type="password"
                placeholder="Enter admin token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                autoComplete="off"
              />
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
                ⚠️ {error}
              </div>
            )}
            
            {/* Login Button */}
            <button 
              type="submit"
              disabled={isLoading || !adminToken.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                '🔐 Login to Admin Panel'
              )}
            </button>
          </form>
          
          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                🔒 Secure access only - Contact administrator for credentials
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500">
            Welcome back, <span className="font-medium text-gray-700">5t4l1n</span>! 👋
          </p>
        </div>
      </div>
    </div>
  )
}
