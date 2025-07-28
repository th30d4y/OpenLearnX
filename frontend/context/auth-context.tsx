"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import detectEthereumProvider from "@metamask/detect-provider"
import { ethers } from "ethers"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import { auth } from "@/lib/firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth"

interface User {
  id: string
  wallet_address: string
  name?: string
  bio?: string
  avatar?: string
  created_at: string
  last_login: string
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  token: string | null
  isLoadingAuth: boolean
  authMethod: "metamask" | "firebase" | null
  walletAddress: string | null
  walletConnected: boolean
  connectWallet: () => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  signupWithEmail: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authMethod, setAuthMethod] = useState<"metamask" | "firebase" | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletConnected, setWalletConnected] = useState(false)

  // Initialize auth state
  useEffect(() => {
    const storedToken = localStorage.getItem("openlearnx_jwt_token")
    const storedUser = localStorage.getItem("openlearnx_user")
    const storedWallet = localStorage.getItem("openlearnx_wallet")
    
    if (storedToken && storedUser && storedWallet) {
      try {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
        setWalletAddress(storedWallet)
        setWalletConnected(true)
        setAuthMethod("metamask")
      } catch (error) {
        localStorage.clear()
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && authMethod !== "metamask") {
        setFirebaseUser(currentUser)
        setAuthMethod("firebase")
      } else if (!currentUser && authMethod === "firebase") {
        setFirebaseUser(null)
        setAuthMethod(null)
      }
      setIsLoadingAuth(false)
    })

    return () => unsubscribe()
  }, [authMethod])

  const connectWallet = useCallback(async () => {
    setIsLoadingAuth(true)
    
    try {
      const provider = await detectEthereumProvider()
      if (!provider) {
        toast.error("MetaMask not detected. Please install it.")
        return
      }

      const ethProvider = new ethers.BrowserProvider(provider as any)
      const accounts = await ethProvider.send("eth_requestAccounts", [])
      if (accounts.length === 0) {
        toast.error("No accounts connected.")
        return
      }

      const walletAddr = accounts[0]

      // Get nonce from backend
      const nonceResponse = await api.post("/api/auth/nonce", {
        wallet_address: walletAddr,
      })
      
      if (!nonceResponse.data.success) {
        throw new Error(nonceResponse.data.error || "Failed to get nonce")
      }

      const { message } = nonceResponse.data

      // Sign message
      const signer = await ethProvider.getSigner()
      const signature = await signer.signMessage(message)

      // Verify signature
      const verifyResponse = await api.post("/api/auth/verify", {
        wallet_address: walletAddr,
        signature,
        message,
      })

      if (verifyResponse.data.success) {
        const { token, user } = verifyResponse.data
        
        // Update states
        setToken(token)
        setUser(user)
        setWalletAddress(walletAddr)
        setWalletConnected(true)
        setFirebaseUser(null)
        setAuthMethod("metamask")
        
        // Store in localStorage
        localStorage.setItem("openlearnx_jwt_token", token)
        localStorage.setItem("openlearnx_user", JSON.stringify(user))
        localStorage.setItem("openlearnx_wallet", walletAddr)
        
        toast.success(`Welcome! 🦊`)
        
        // ✅ CRITICAL: Redirect to dashboard after successful login
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1000)
        
      } else {
        throw new Error("Authentication failed")
      }
    } catch (error: any) {
      console.error("MetaMask error:", error)
      toast.error(error.message || "Failed to connect MetaMask")
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoadingAuth(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setUser(null)
      setToken(null)
      setWalletAddress(null)
      setWalletConnected(false)
      toast.success("Logged in with email!")
    } catch (error: any) {
      toast.error(error.message || "Email login failed")
      throw error
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  const signupWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoadingAuth(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      toast.success("Account created!")
    } catch (error: any) {
      toast.error(error.message || "Signup failed")
      throw error
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
    setFirebaseUser(null)
    setToken(null)
    setWalletAddress(null)
    setWalletConnected(false)
    setAuthMethod(null)
    localStorage.clear()
    
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Logout error:", error)
    }
    
    toast.success("Logged out!")
  }, [])

  const value = {
    user,
    firebaseUser,
    token,
    isLoadingAuth,
    authMethod,
    walletAddress,
    walletConnected,
    connectWallet,
    loginWithEmail,
    signupWithEmail,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// ✅ CRITICAL: Default export to fix the "invalid element type" error
export default AuthProvider
