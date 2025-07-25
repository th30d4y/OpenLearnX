import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export const MetaMaskConnect: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false)
  const { login } = useAuth()

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      if (!window.ethereum) {
        alert('MetaMask not installed!')
        return
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length > 0) {
        // Simplified login for now
        await login(accounts[0], '', '')
      }
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
    </button>
  )
}
