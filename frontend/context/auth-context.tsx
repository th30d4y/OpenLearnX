"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import detectEthereumProvider from "@metamask/detect-provider"
import { ethers } from "ethers"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import type { AuthNonceRequest, AuthNonceResponse, AuthVerifyRequest, AuthVerifyResponse, User } from "@/lib/types"
import { auth } from "@/lib/firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth"

interface AuthContextType {
  user: User | null // MetaMask user
  firebaseUser: FirebaseUser | null // Firebase user
  token: string | null // JWT token from backend (only for MetaMask users)
  isLoadingAuth: boolean
  authMethod: "metamask" | "firebase" | null
  connectWallet: () => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  signupWithEmail: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null) // For MetaMask user
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null) // For Firebase user
  const [token, setToken] = useState<string | null>(null) // JWT token
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authMethod, setAuthMethod] = useState<"metamask" | "firebase" | null>(null)

  useEffect(() => {
    // Check for MetaMask token
    const storedToken = localStorage.getItem("openlearnx_jwt_token")
    const storedUser = localStorage.getItem("openlearnx_user")
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
        setAuthMethod("metamask")
      } catch (error) {
        console.error("Failed to parse stored MetaMask user or token:", error)
        localStorage.removeItem("openlearnx_jwt_token")
        localStorage.removeItem("openlearnx_user")
      }
    }

    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setFirebaseUser(currentUser)
        setAuthMethod("firebase")
      } else {
        setFirebaseUser(null)
        if (authMethod !== "metamask") {
          // Only clear if not already MetaMask authenticated
          setAuthMethod(null)
        }
      }
      setIsLoadingAuth(false)
    })

    return () => unsubscribe()
  }, [authMethod])

  const logout = useCallback(async () => {
    setUser(null)
    setFirebaseUser(null)
    setToken(null)
    setAuthMethod(null)
    localStorage.removeItem("openlearnx_jwt_token")
    localStorage.removeItem("openlearnx_user")
    try {
      await signOut(auth) // Sign out from Firebase
    } catch (error) {
      console.error("Error signing out from Firebase:", error)
    }
    toast.success("Logged out successfully!")
  }, [])

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

      const walletAddress = accounts[0]

      // 1. Request Nonce
      const nonceResponse = await api.post<AuthNonceResponse>("/api/auth/nonce", {
        wallet_address: walletAddress,
      } as AuthNonceRequest)
      const { nonce, message } = nonceResponse.data

      // 2. Sign Message
      const signer = await ethProvider.getSigner()
      const signature = await signer.signMessage(message)

      // 3. Verify Signature
      const verifyResponse = await api.post<AuthVerifyResponse>("/api/auth/verify", {
        wallet_address: walletAddress,
        signature,
        message,
      } as AuthVerifyRequest)

      if (verifyResponse.data.success) {
        const { token: newToken, user: newUser } = verifyResponse.data
        setToken(newToken)
        setUser(newUser)
        setFirebaseUser(null) // Clear Firebase user if MetaMask logs in
        setAuthMethod("metamask")
        localStorage.setItem("openlearnx_jwt_token", newToken)
        localStorage.setItem("openlearnx_user", JSON.stringify(newUser))
        toast.success(`Welcome, ${newUser.wallet_address.slice(0, 6)}...${newUser.wallet_address.slice(-4)}!`)
      } else {
        toast.error("MetaMask authentication failed. Please try again.")
        logout()
      }
    } catch (error: any) {
      console.error("MetaMask authentication error:", error)
      toast.error(error.message || "Failed to connect wallet or authenticate.")
      logout()
    } finally {
      setIsLoadingAuth(false)
    }
  }, [logout])

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoadingAuth(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Firebase user is set by onAuthStateChanged listener
      setUser(null) // Clear MetaMask user if Firebase logs in
      setToken(null) // Clear JWT token
      toast.success("Logged in with email!")
    } catch (error: any) {
      console.error("Firebase login error:", error)
      toast.error(error.message || "Failed to login with email.")
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  const signupWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoadingAuth(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      // Firebase user is set by onAuthStateChanged listener
      setUser(null) // Clear MetaMask user if Firebase logs in
      setToken(null) // Clear JWT token
      toast.success("Signed up and logged in with email!")
    } catch (error: any) {
      console.error("Firebase signup error:", error)
      toast.error(error.message || "Failed to sign up with email.")
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  const contextValue = React.useMemo(
    () => ({
      user,
      firebaseUser,
      token,
      isLoadingAuth,
      authMethod,
      connectWallet,
      loginWithEmail,
      signupWithEmail,
      logout,
    }),
    [user, firebaseUser, token, isLoadingAuth, authMethod, connectWallet, loginWithEmail, signupWithEmail, logout],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
