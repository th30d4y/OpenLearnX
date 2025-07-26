'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Shield, 
  Monitor, 
  Copy, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Eye,
  Lock,
  Maximize
} from 'lucide-react'

export default function SecurityCheckPage() {
  const router = useRouter()
  const params = useParams()
  const examCode = params.examCode as string

  const [securityChecks, setSecurityChecks] = useState({
    fullScreen: false,
    noVirtualBox: false,
    copyPasteBlocked: false,
    focusDetection: false
  })
  
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [securityPassed, setSecurityPassed] = useState(false)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [focusLostCount, setFocusLostCount] = useState(0)
  const [warningMessage, setWarningMessage] = useState('')

  useEffect(() => {
    // Check for virtual machine detection
    detectVirtualMachine()
    
    // Block copy/paste
    blockCopyPaste()
    
    // Setup fullscreen detection
    setupFullScreenDetection()
    
    // Setup focus detection
    setupFocusDetection()
    
    // Block right-click
    blockRightClick()
    
    // Block developer tools
    blockDevTools()

    return () => {
      // Cleanup event listeners
      document.removeEventListener('contextmenu', handleRightClick)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [])

  // ✅ VIRTUAL MACHINE DETECTION
  const detectVirtualMachine = () => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL).toLowerCase()
          
          const vmIndicators = [
            'virtualbox', 'vmware', 'parallels', 'qemu', 
            'virtual', 'vm', 'hyper-v', 'kvm'
          ]
          
          const isVM = vmIndicators.some(indicator => 
            renderer.includes(indicator) || vendor.includes(indicator)
          )
          
          if (isVM) {
            setWarningMessage('❌ Virtual machines are not allowed for this exam')
            return
          }
        }
      }
      
      // Additional VM detection checks
      if (
        navigator.hardwareConcurrency < 2 ||
        screen.width < 1024 ||
        screen.height < 768 ||
        navigator.deviceMemory && navigator.deviceMemory < 2
      ) {
        setWarningMessage('⚠️ Your system may not meet the minimum requirements')
      }
      
      setSecurityChecks(prev => ({ ...prev, noVirtualBox: true }))
    } catch (error) {
      console.error('VM detection failed:', error)
      setSecurityChecks(prev => ({ ...prev, noVirtualBox: true }))
    }
  }

  // ✅ BLOCK COPY/PASTE
  const blockCopyPaste = () => {
    const preventCopyPaste = (e: Event) => {
      e.preventDefault()
      setWarningMessage('⚠️ Copy/Paste is disabled during the exam')
      setTimeout(() => setWarningMessage(''), 3000)
    }

    document.addEventListener('copy', preventCopyPaste)
    document.addEventListener('paste', preventCopyPaste)
    document.addEventListener('cut', preventCopyPaste)
    document.addEventListener('drag', preventCopyPaste)
    document.addEventListener('drop', preventCopyPaste)
    document.addEventListener('selectstart', preventCopyPaste)
    
    // Disable text selection
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    
    setSecurityChecks(prev => ({ ...prev, copyPasteBlocked: true }))
  }

  // ✅ FULLSCREEN DETECTION
  const setupFullScreenDetection = () => {
    const checkFullScreen = () => {
      const isFS = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      
      setIsFullScreen(isFS)
      setSecurityChecks(prev => ({ ...prev, fullScreen: isFS }))
      
      if (!isFS && securityPassed) {
        setWarningMessage('⚠️ You must stay in fullscreen mode during the exam')
        setTimeout(() => {
          router.push('/coding')
        }, 3000)
      }
    }

    document.addEventListener('fullscreenchange', checkFullScreen)
    document.addEventListener('webkitfullscreenchange', checkFullScreen)
    document.addEventListener('mozfullscreenchange', checkFullScreen)
    document.addEventListener('MSFullscreenChange', checkFullScreen)
  }

  // ✅ FOCUS DETECTION
  const setupFocusDetection = () => {
    let focusLost = false

    const handleWindowBlur = () => {
      if (securityPassed) {
        focusLost = true
        setFocusLostCount(prev => prev + 1)
        setWarningMessage('⚠️ You switched tabs/windows. This is being monitored.')
        
        if (focusLostCount >= 2) {
          alert('Multiple focus violations detected. Exam will be terminated.')
          router.push('/coding')
        }
      }
    }

    const handleWindowFocus = () => {
      if (focusLost) {
        focusLost = false
        setTimeout(() => setWarningMessage(''), 3000)
      }
    }

    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    
    setSecurityChecks(prev => ({ ...prev, focusDetection: true }))
  }

  // ✅ BLOCK RIGHT-CLICK
  const blockRightClick = () => {
    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault()
      setWarningMessage('⚠️ Right-click is disabled during the exam')
      setTimeout(() => setWarningMessage(''), 2000)
    }

    document.addEventListener('contextmenu', handleRightClick)
  }

  // ✅ BLOCK DEVELOPER TOOLS
  const blockDevTools = () => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J')
      ) {
        e.preventDefault()
        setWarningMessage('⚠️ Developer tools are not allowed during the exam')
        setTimeout(() => setWarningMessage(''), 3000)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Detect if dev tools are open
    let devtools = { open: false, orientation: null }
    const threshold = 160

    setInterval(() => {
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        if (!devtools.open) {
          devtools.open = true
          setWarningMessage('⚠️ Developer tools detected. Please close them.')
        }
      } else {
        devtools.open = false
      }
    }, 500)
  }

  // ✅ ENTER FULLSCREEN
  const enterFullScreen = async () => {
    try {
      const element = document.documentElement
      
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen()
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen()
      }
    } catch (error) {
      setWarningMessage('❌ Failed to enter fullscreen. Please try again.')
    }
  }

  // ✅ CHECK ALL SECURITY MEASURES
  useEffect(() => {
    const allChecksPassed = Object.values(securityChecks).every(check => check === true)
    setSecurityPassed(allChecksPassed && agreementAccepted)
  }, [securityChecks, agreementAccepted])

  // ✅ PROCEED TO EXAM
  const proceedToExam = () => {
    if (securityPassed && isFullScreen) {
      // Store security session
      sessionStorage.setItem('exam_security_passed', 'true')
      sessionStorage.setItem('exam_start_time', new Date().toISOString())
      
      router.push(`/coding/exam/${examCode}`)
    } else {
      setWarningMessage('❌ Please complete all security requirements')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Shield className="h-6 w-6 text-red-400" />
            <span>Exam Security Check</span>
          </h1>
          <p className="text-gray-400">Exam Code: {examCode}</p>
        </div>
      </div>

      {/* Warning Message */}
      {warningMessage && (
        <div className="bg-red-900 border-b border-red-600 p-3 text-center">
          <p className="text-red-300">{warningMessage}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-8">
        {/* Security Requirements */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Security Requirements</h2>
          
          <div className="space-y-4">
            {/* Fullscreen Check */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Maximize className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="font-medium">Fullscreen Mode</h3>
                  <p className="text-sm text-gray-400">Required for exam security</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {securityChecks.fullScreen ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <button
                    onClick={enterFullScreen}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                  >
                    Enter Fullscreen
                  </button>
                )}
              </div>
            </div>

            {/* VM Detection */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Monitor className="h-5 w-5 text-purple-400" />
                <div>
                  <h3 className="font-medium">System Verification</h3>
                  <p className="text-sm text-gray-400">Checking for virtual machines</p>
                </div>
              </div>
              {securityChecks.noVirtualBox ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              )}
            </div>

            {/* Copy/Paste Block */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Copy className="h-5 w-5 text-red-400" />
                <div>
                  <h3 className="font-medium">Copy/Paste Protection</h3>
                  <p className="text-sm text-gray-400">Disabled for exam integrity</p>
                </div>
              </div>
              {securityChecks.copyPasteBlocked ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              )}
            </div>

            {/* Focus Detection */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Eye className="h-5 w-5 text-green-400" />
                <div>
                  <h3 className="font-medium">Focus Monitoring</h3>
                  <p className="text-sm text-gray-400">Tab switching will be tracked</p>
                </div>
              </div>
              {securityChecks.focusDetection ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              )}
            </div>
          </div>
        </div>

        {/* Agreement */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Exam Agreement</h2>
          
          <div className="bg-gray-900 p-4 rounded mb-4 max-h-40 overflow-y-auto">
            <div className="text-sm text-gray-300 space-y-2">
              <p>By proceeding with this exam, I agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Stay in fullscreen mode throughout the exam</li>
                <li>Not switch tabs, windows, or applications</li>
                <li>Not use copy/paste or external resources</li>
                <li>Not use virtual machines or emulators</li>
                <li>Not open developer tools or inspect elements</li>
                <li>Accept monitoring of my focus and activity</li>
                <li>Understand that violations may result in exam termination</li>
              </ul>
              <p className="text-yellow-400 font-medium mt-4">
                Violations: {focusLostCount}/2 (3rd violation = automatic termination)
              </p>
            </div>
          </div>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={agreementAccepted}
              onChange={(e) => setAgreementAccepted(e.target.checked)}
              className="rounded"
            />
            <span>I have read and agree to all terms above</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={proceedToExam}
            disabled={!securityPassed || !isFullScreen}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-3 rounded-lg flex items-center space-x-2 font-medium"
          >
            <Lock className="h-5 w-5" />
            <span>Start Secure Exam</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => router.push('/coding')}
            className="bg-gray-600 hover:bg-gray-700 px-8 py-3 rounded-lg"
          >
            Cancel
          </button>
        </div>

        {/* Status */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-2">
            {securityPassed ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-400 font-medium">All security checks passed</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-400 font-medium">
                  Complete all requirements to proceed
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
