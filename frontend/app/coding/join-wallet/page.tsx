'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Shield, Code, AlertCircle, CheckCircle } from 'lucide-react'

declare global {
  interface Window {
    ethereum?: any
  }
}

export default function JoinExamWallet() {
  const [examCode, setExamCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'connect' | 'auth' | 'join'>('connect')
  const [authMessage, setAuthMessage] = useState('')
  const router = useRouter()

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    setIsConnecting(true)
    setError('')

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        setStep('auth')
      }
    } catch (error: any) {
      setError('Failed to connect wallet: ' + error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const getAuthMessage = async () => {
    if (!examCode.trim()) {
      setError('Please enter exam code')
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/wallet-auth-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          exam_code: examCode.toUpperCase()
        })
      })

      const data = await response.json()

      if (data.success) {
        setAuthMessage(data.message)
        setStep('join')
      } else {
        setError(data.error || 'Failed to get authentication message')
      }
    } catch (error) {
      setError('Connection failed. Please check if the backend is running.')
    }
  }

  const signAndJoinExam = async () => {
    if (!studentName.trim()) {
      setError('Please enter your name')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      // Sign the message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [authMessage, walletAddress]
      })

      // Join exam with signature
      const response = await fetch('http://127.0.0.1:5000/api/exam/join-exam-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          exam_code: examCode.toUpperCase(),
          signature: signature,
          student_name: studentName
        })
      })

      const data = await response.json()

      if (data.success) {
        // Store session data
        localStorage.setItem('exam_session', JSON.stringify({
          exam_code: examCode.toUpperCase(),
          student_name: studentName,
          wallet_address: walletAddress,
          blockchain_verified: true,
          exam_info: data.exam_info
        }))

        // Redirect to exam interface
        router.push('/coding/exam')
      } else {
        setError(data.error || 'Failed to join exam')
      }
    } catch (error: any) {
      if (error.code === 4001) {
        setError('Transaction was cancelled by user')
      } else {
        setError('Failed to sign message or join exam')
      }
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join with Wallet</h1>
          <p className="text-gray-600">Connect your wallet to join the blockchain-verified coding exam</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'connect' ? 'bg-blue-600 text-white' : 
              walletAddress ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className="w-12 h-1 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'auth' ? 'bg-blue-600 text-white' : 
              authMessage ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className="w-12 h-1 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'join' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Connect Wallet */}
        {step === 'connect' && (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">Connect MetaMask to verify your identity on the blockchain</p>
            </div>

            {walletAddress ? (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Wallet Connected</span>
                </div>
                <p className="text-sm text-green-700 mt-1 font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
                <button
                  onClick={() => setStep('auth')}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                >
                  Continue
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Connecting...
                  </div>
                ) : (
                  <>
                    <Wallet className="inline h-5 w-5 mr-2" />
                    Connect MetaMask
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Step 2: Get Auth Message */}
        {step === 'auth' && (
          <div className="space-y-6">
            <div className="text-center">
              <Code className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Enter Exam Code</h2>
              <p className="text-gray-600 mb-6">Enter the exam code provided by your instructor</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Code
              </label>
              <input
                type="text"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-widest uppercase"
              />
            </div>

            <button
              onClick={getAuthMessage}
              disabled={!examCode.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg"
            >
              Get Authentication Message
            </button>
          </div>
        )}

        {/* Step 3: Sign and Join */}
        {step === 'join' && (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Sign & Join Exam</h2>
              <p className="text-gray-600 mb-6">Enter your name and sign the message to join</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {authMessage && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">You will sign this message:</p>
                <div className="bg-white p-3 rounded border text-xs font-mono text-gray-800 max-h-32 overflow-y-auto">
                  {authMessage}
                </div>
              </div>
            )}

            <button
              onClick={signAndJoinExam}
              disabled={isJoining || !studentName.trim()}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
            >
              {isJoining ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Signing & Joining...
                </div>
              ) : (
                <>
                  <Shield className="inline h-5 w-5 mr-2" />
                  Sign & Join Exam
                </>
              )}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Features */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Blockchain Benefits:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-500 mr-2" />
              Tamper-proof identity verification
            </div>
            <div className="flex items-center">
              <Wallet className="h-4 w-4 text-blue-500 mr-2" />
              Wallet-based authentication
            </div>
            <div className="flex items-center">
              <Code className="h-4 w-4 text-purple-500 mr-2" />
              Permanent participation records
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
