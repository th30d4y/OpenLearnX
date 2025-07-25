import React, { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  id: string
  walletAddress: string
  totalTests: number
  certificates: number
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (address: string, signature: string, message: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading] = useState(false)

  const login = async (address: string, signature: string, message: string) => {
    setUser({
      id: '1',
      walletAddress: address,
      totalTests: 0,
      certificates: 0
    })
    setToken('mock-token')
  }

  const logout = () => {
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
