"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import detectEthereumProvider from "@metamask/detect-provider"
import { ethers } from "ethers"
import { toast } from "react-hot-toast"
import authService, { type User } from "@/lib/auth-service"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoadingAuth: boolean
  authMethod: "metamask" | "email" | null
  walletAddress: string | null
  walletConnected: boolean
  showMetaMaskEmailModal: boolean
  setShowMetaMaskEmailModal: (show: boolean) => void
  connectWallet: () => Promise<boolean>
  loginWithEmail: (email: string, password: string) => Promise<boolean>
  signupWithEmail: (email: string, password: string, username?: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authMethod, setAuthMethod] = useState<"metamask" | "email" | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [showMetaMaskEmailModal, setShowMetaMaskEmailModal] = useState(false)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("openlearnx_jwt_token")
        const storedUser = localStorage.getItem("openlearnx_user")
        const storedMethod = localStorage.getItem("openlearnx_auth_method") as "metamask" | "email" | null

        if (storedToken) {
          // Verify token is still valid
          const verification = await authService.verifyToken(storedToken)
          
          if (verification.valid && verification.user) {
            setToken(storedToken)
            setUser(verification.user)
            setAuthMethod(storedMethod || "email")
            
            // If MetaMask, restore wallet address
            if (storedMethod === "metamask") {
              const storedWallet = localStorage.getItem("openlearnx_wallet")
              if (storedWallet) {
                setWalletAddress(storedWallet)
                setWalletConnected(true)
              }
            }
          } else {
            // Token expired or invalid
            authService.clearToken()
            setToken(null)
            setUser(null)
            setAuthMethod(null)
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        authService.clearToken()
      } finally {
        setIsLoadingAuth(false)
      }
    }

    initializeAuth()
  }, [])

  /**
   * Connect MetaMask wallet
   */
  const connectWallet = useCallback(async (): Promise<boolean> => {
    setIsLoadingAuth(true)

    try {
      const provider = await detectEthereumProvider()
      if (!provider) {
        toast.error("MetaMask not detected. Please install it.")
        return false
      }

      // Create ethers provider from MetaMask
      const ethProvider = new ethers.BrowserProvider(provider as any)
      
      // Request accounts
      const accounts = await ethProvider.send("eth_requestAccounts", [])
      if (accounts.length === 0) {
        toast.error("No MetaMask accounts found.")
        return false
      }

      const walletAddr = accounts[0].toLowerCase()

      // Get nonce from backend
      const nonceResponse = await authService.getNonce(walletAddr)
      if (!nonceResponse.success || !nonceResponse.message) {
        toast.error(nonceResponse.error || "Failed to get authentication nonce")
        return false
      }

      // Sign message with MetaMask
      const signer = await ethProvider.getSigner()
      let signature: string
      
      try {
        signature = await signer.signMessage(nonceResponse.message)
      } catch (signError: any) {
        if (signError.message?.includes("user rejected")) {
          toast.error("You rejected the signature request")
        } else {
          toast.error("Failed to sign message")
        }
        return false
      }

      // Verify signature with backend
      const verifyResponse = await authService.verifySignature(walletAddr, signature, nonceResponse.message)

      if (!verifyResponse.success || !verifyResponse.token || !verifyResponse.user) {
        toast.error(verifyResponse.error || "Authentication failed")
        return false
      }

      // Update state
      const { token: newToken, user: newUser } = verifyResponse
      setToken(newToken)
      setUser(newUser)
      setWalletAddress(walletAddr)
      setWalletConnected(true)
      setAuthMethod("metamask")

      // Store in localStorage
      authService.setToken(newToken)
      localStorage.setItem("openlearnx_user", JSON.stringify(newUser))
      localStorage.setItem("openlearnx_wallet", walletAddr)
      localStorage.setItem("openlearnx_auth_method", "metamask")

      toast.success("Connected to MetaMask! Now add your contact email")
      
      // Show email modal for contact information
      setShowMetaMaskEmailModal(true)
      return true
    } catch (error: any) {
      console.error("MetaMask connection error:", error)
      toast.error("Failed to connect MetaMask")
      return false
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  /**
   * Login with email and password
   */
  const loginWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoadingAuth(true)

    try {
      const response = await authService.login(email, password)

      if (!response.success || !response.token || !response.user) {
        toast.error(response.error || "Login failed")
        return false
      }

      // Update state
      const { token: newToken, user: newUser } = response
      setToken(newToken)
      setUser(newUser)
      setAuthMethod("email")
      setWalletConnected(false)
      setWalletAddress(null)

      // Store in localStorage
      authService.setToken(newToken)
      localStorage.setItem("openlearnx_user", JSON.stringify(newUser))
      localStorage.setItem("openlearnx_auth_method", "email")

      toast.success("Logged in successfully")
      return true
    } catch (error: any) {
      console.error("Email login error:", error)
      toast.error("Login failed. Please try again.")
      return false
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  /**
   * Signup with email and password
   */
  const signupWithEmail = useCallback(
    async (email: string, password: string, username?: string): Promise<boolean> => {
      setIsLoadingAuth(true)

      try {
        const response = await authService.signup(email, password, username)

        if (!response.success || !response.token || !response.user) {
          toast.error(response.error || "Signup failed")
          return false
        }

        // Update state
        const { token: newToken, user: newUser } = response
        setToken(newToken)
        setUser(newUser)
        setAuthMethod("email")
        setWalletConnected(false)
        setWalletAddress(null)

        // Store in localStorage
        authService.setToken(newToken)
        localStorage.setItem("openlearnx_user", JSON.stringify(newUser))
        localStorage.setItem("openlearnx_auth_method", "email")

        toast.success("Account created successfully")
        return true
      } catch (error: any) {
        console.error("Email signup error:", error)
        toast.error("Signup failed. Please try again.")
        return false
      } finally {
        setIsLoadingAuth(false)
      }
    },
    []
  )

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout()
      
      // Clear state
      setUser(null)
      setToken(null)
      setAuthMethod(null)
      setWalletAddress(null)
      setWalletConnected(false)

      // Clear storage
      authService.clearToken()
      localStorage.removeItem("openlearnx_auth_method")

      toast.success("Logged out successfully!")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Logout failed")
    }
  }, [])

  const value: AuthContextType = {
    user,
    token,
    isLoadingAuth,
    authMethod,
    walletAddress,
    walletConnected,
    showMetaMaskEmailModal,
    setShowMetaMaskEmailModal,
    connectWallet,
    loginWithEmail,
    signupWithEmail,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export default AuthProvider
