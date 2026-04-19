/**
 * MongoDB-based Authentication Service
 * Replaces Firebase with backend API calls to MongoDB
 */

import api from "./api"

export interface User {
  id: string
  email: string
  username?: string
  wallet_address?: string
  role?: string
  status?: string
  name?: string
  bio?: string
  avatar?: string
  created_at: string
  last_login: string
}

export interface AuthResponse {
  success: boolean
  message?: string
  token?: string
  user?: User
  error?: string
}

class AuthService {
  /**
   * Register a new user with email and password
   */
  async signup(email: string, password: string, username?: string): Promise<AuthResponse> {
    try {
      console.log("🔐 Signup request to:", api.defaults.baseURL + "/api/auth/register")
      const response = await api.post("/api/auth/register", {
        email,
        password,
        username: username || email.split("@")[0],
      })
      console.log("✅ Signup successful:", response.data)
      return response.data
    } catch (error: any) {
      console.error("❌ Signup error details:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      })
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Network error - unable to connect to server",
      }
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log("🔐 Login request to:", api.defaults.baseURL + "/api/auth/login")
      const response = await api.post("/api/auth/login", {
        email,
        password,
      })
      console.log("✅ Login successful:", response.data)
      return response.data
    } catch (error: any) {
      console.error("❌ Login error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Network error - unable to connect to server",
      }
    }
  }

  /**
   * Get nonce for wallet signature
   */
  async getNonce(walletAddress: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await api.post("/api/auth/nonce", {
        wallet_address: walletAddress,
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Failed to get nonce",
      }
    }
  }

  /**
   * Verify wallet signature for authentication
   */
  async verifySignature(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<AuthResponse> {
    try {
      const response = await api.post("/api/auth/verify", {
        wallet_address: walletAddress,
        signature,
        message,
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Verification failed",
      }
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<{ valid: boolean; user?: User }> {
    try {
      const response = await api.post(
        "/api/auth/verify-token",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return response.data
    } catch (error: any) {
      return {
        valid: false,
      }
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(token: string): Promise<User | null> {
    try {
      const response = await api.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return response.data.user || null
    } catch (error) {
      return null
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    token: string,
    data: Partial<User>
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await api.put("/api/auth/profile", data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Update failed",
      }
    }
  }

  /**
   * Store token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem("openlearnx_jwt_token", token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem("openlearnx_jwt_token")
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    localStorage.removeItem("openlearnx_jwt_token")
    localStorage.removeItem("openlearnx_user")
    localStorage.removeItem("openlearnx_wallet")
    delete api.defaults.headers.common["Authorization"]
  }
}

export const authService = new AuthService()
export default authService
