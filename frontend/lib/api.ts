import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000"

console.log("🌐 API Base URL:", API_BASE_URL)

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("openlearnx_jwt_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log("📤 API Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
    })
    return config
  },
  (error) => {
    console.error("❌ Request interceptor error:", error)
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (response) => {
    console.log("📥 API Response:", {
      status: response.status,
      url: response.config.url,
    })
    return response
  },
  (error) => {
    console.error("❌ API Response error:", {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      code: error.code,
    })
    return Promise.reject(error)
  },
)

export default api