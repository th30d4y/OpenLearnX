import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const authService = {
  async getNonce(walletAddress: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/nonce`, {
      wallet_address: walletAddress
    })
    return response.data
  },

  async verifySignature(walletAddress: string, signature: string, message: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/verify`, {
      wallet_address: walletAddress,
      signature,
      message
    })
    return response.data
  },

  async getProfile(token: string) {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  }
}
