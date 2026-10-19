'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Shield, Code, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

declare global {
  interface Window { ethereum?: any }
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
    if (!window.ethereum) { setError('MetaMask is not installed. Please install MetaMask to continue.'); return }
    setIsConnecting(true); setError('')
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length > 0) { setWalletAddress(accounts[0]); setStep('auth') }
    } catch (err: any) {
      setError('Failed to connect wallet: ' + err.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const getAuthMessage = async () => {
    if (!examCode.trim()) { setError('Please enter exam code'); return }
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/wallet-auth-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, exam_code: examCode.toUpperCase() }),
      })
      const data = await response.json()
      if (data.success) { setAuthMessage(data.message); setStep('join') }
      else setError(data.error || 'Failed to get authentication message')
    } catch {
      setError('Connection failed. Please check if the backend is running.')
    }
  }

  const signAndJoinExam = async () => {
    if (!studentName.trim()) { setError('Please enter your name'); return }
    setIsJoining(true); setError('')
    try {
      const signature = await window.ethereum.request({ method: 'personal_sign', params: [authMessage, walletAddress] })
      const response = await fetch('http://127.0.0.1:5000/api/exam/join-exam-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, exam_code: examCode.toUpperCase(), signature, student_name: studentName }),
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('exam_session', JSON.stringify({
          exam_code: examCode.toUpperCase(), student_name: studentName,
          wallet_address: walletAddress, blockchain_verified: true, exam_info: data.exam_info,
        }))
        router.push('/coding/exam')
      } else {
        setError(data.error || 'Failed to join exam')
      }
    } catch (err: any) {
      setError(err.code === 4001 ? 'Transaction was cancelled by user' : 'Failed to sign message or join exam')
    } finally {
      setIsJoining(false)
    }
  }

  const steps = ['connect', 'auth', 'join']

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto">
            <Wallet className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">Join with Wallet</h1>
          <p className="text-sm text-muted-foreground">Connect your wallet to join the blockchain-verified coding exam</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-primary text-primary-foreground'
                : (s === 'connect' && walletAddress) || (s === 'auth' && authMessage) ? 'bg-emerald-500 text-white'
                : 'bg-muted text-muted-foreground'
              }`}>{i + 1}</div>
              {i < steps.length - 1 && <div className="w-10 h-0.5 bg-border" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 */}
        {step === 'connect' && (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="font-semibold text-card-foreground">Connect Your Wallet</h2>
              <p className="text-sm text-muted-foreground mt-1">Connect MetaMask to verify your identity on the blockchain</p>
            </div>
            {walletAddress ? (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4" /><span className="font-medium text-sm">Wallet Connected</span>
                </div>
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-500">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</p>
                <Button onClick={() => setStep('auth')} className="w-full mt-2">Continue</Button>
              </div>
            ) : (
              <Button onClick={connectWallet} disabled={isConnecting} className="w-full gap-2" size="lg">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                {isConnecting ? 'Connecting…' : 'Connect MetaMask'}
              </Button>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 'auth' && (
          <div className="space-y-4">
            <div className="text-center">
              <Code className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="font-semibold text-card-foreground">Enter Exam Code</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter the exam code provided by your instructor</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-code-w">Exam Code</Label>
              <Input
                id="exam-code-w"
                value={examCode}
                onChange={e => setExamCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="text-center text-lg font-mono tracking-widest uppercase"
              />
            </div>
            <Button onClick={getAuthMessage} disabled={!examCode.trim()} className="w-full">
              Get Authentication Message
            </Button>
          </div>
        )}

        {/* Step 3 */}
        {step === 'join' && (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h2 className="font-semibold text-card-foreground">Sign &amp; Join Exam</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your name and sign the message to join</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name-w">Your Name</Label>
              <Input id="name-w" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Enter your full name" />
            </div>
            {authMessage && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">You will sign this message:</p>
                <div className="bg-background rounded border border-border p-2 text-xs font-mono text-foreground max-h-24 overflow-y-auto">{authMessage}</div>
              </div>
            )}
            <Button onClick={signAndJoinExam} disabled={isJoining || !studentName.trim()} className="w-full gap-2" size="lg">
              {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {isJoining ? 'Signing & Joining…' : 'Sign & Join Exam'}
            </Button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Blockchain Benefits</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            Tamper-proof identity verification
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Wallet-based authentication
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Code className="h-3.5 w-3.5 text-primary" />
            Permanent participation records
          </div>
        </div>
      </div>
    </div>
  )
}
