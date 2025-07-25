import React, { useState } from 'react'
import detectEthereumProvider from '@metamask/detect-provider'
import { ethers } from 'ethers'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth'
import toast from 'react-hot-toast'

export const MetaMaskConnect: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false)
  const { login } = useAuth()

  const connectWallet = async () => {
    setIsConnecting(true)

    try {
      const provider = await detectEthereumProvider()
      
      if (!provider) {
        throw new Error('MetaMask not installed. Please install MetaMask to continue.')
      }

      const ethereum = provider as any
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.')
      }

      const address = accounts[0]
      
      // Get nonce from backend
      const { nonce, message } = await authService.getNonce(address)
      
      // Sign message with MetaMask
      const web3Provider = new ethers.providers.Web3Provider(ethereum)
      const signer = web3Provider.getSigner()
      const signature = await signer.signMessage(message)
      
      // Verify signature and login
      await login(address, signature, message)
      
      toast.success('Successfully connected to MetaMask!')
      
    } catch (error: any) {
      console.error('MetaMask connection failed:', error)
      toast.error(error.message || 'Failed to connect to MetaMask')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting...
        </div>
      ) : (
        'Connect MetaMask'
      )}
    </button>
  )
}
