"use client"

import { useState } from "react"
import { X, Download, Share2, Award, Calendar, User, BookOpen, Wallet, CheckCircle } from "lucide-react"
import { toast } from "react-hot-toast"

interface Certificate {
  certificate_id: string
  token_id?: string
  user_name: string
  course_title: string
  mentor_name: string
  completion_date: string
  wallet_id?: string
  verification_url?: string
  share_code?: string
  public_url?: string
  unique_url?: string
  message?: string
}

interface CertificateModalProps {
  isOpen: boolean
  onClose: () => void
  courseTitle: string
  courseMentor: string
  courseId: string
  userId: string
  walletId: string
}

export function CertificateModal({
  isOpen,
  onClose,
  courseTitle,
  courseMentor,
  courseId,
  userId,
  walletId
}: CertificateModalProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'completed'>('input')
  const [userName, setUserName] = useState('')
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleGenerateCertificate = async () => {
    if (!userName.trim()) {
      toast.error("Please enter your name")
      return
    }

    setLoading(true)
    setStep('generating')

    try {
      console.log('🎓 Generating certificate for STUDENT:', userName.trim())

      const response = await fetch('http://127.0.0.1:5000/api/certificate/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: userName.trim(),
          course_id: courseId,
          wallet_id: walletId,
          user_id: userId,
          course_title: courseTitle
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Certificate API response:', data)
        
        const certificateData = data.certificate
        
        const certificateWithWallet = {
          certificate_id: certificateData.certificate_id,
          token_id: certificateData.token_id,
          user_name: certificateData.user_name,
          course_title: certificateData.course_title,
          mentor_name: certificateData.mentor_name,
          completion_date: certificateData.completion_date,
          wallet_id: walletId,
          verification_url: certificateData.verification_url,
          share_code: certificateData.share_code,
          public_url: certificateData.public_url,
          unique_url: certificateData.unique_url,
          message: certificateData.message
        }
        
        console.log('🎯 Certificate data:', certificateWithWallet)
        console.log('🆔 Unique Certificate ID:', certificateWithWallet.certificate_id)
        
        setCertificate(certificateWithWallet)
        setStep('completed')
        toast.success(`Certificate generated for ${certificateWithWallet.user_name}! 🎉`)
      } else {
        const error = await response.json()
        console.error('❌ Certificate error:', error)
        toast.error(error.error || "Failed to generate certificate")
        setStep('input')
      }
    } catch (error) {
      console.error('❌ Certificate generation error:', error)
      toast.error("Failed to generate certificate. Please check your connection.")
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCertificate = async () => {
    if (!certificate) return
    
    try {
      const certificateHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate - ${certificate.user_name}</title>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
            
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .certificate { 
              background: white; 
              max-width: 800px; 
              width: 100%;
              margin: 0 auto; 
              padding: 60px; 
              border-radius: 20px; 
              box-shadow: 0 25px 50px rgba(0,0,0,0.15); 
              text-align: center; 
              position: relative;
              border: 8px solid #4f46e5;
            }
            
            .title { 
              font-family: 'Playfair Display', serif;
              font-size: 42px; 
              font-weight: 700; 
              color: #4f46e5; 
              margin: 20px 0; 
            }
            
            .subtitle { 
              font-size: 18px; 
              color: #6b7280; 
              margin-bottom: 30px; 
              font-weight: 500;
            }
            
            .student-name { 
              font-family: 'Playfair Display', serif;
              font-size: 48px; 
              color: #1f2937; 
              font-weight: 700; 
              margin: 40px 0; 
              padding: 20px 0;
              border-top: 3px solid #4f46e5;
              border-bottom: 3px solid #4f46e5;
              text-transform: capitalize;
            }
            
            .course-title { 
              font-family: 'Playfair Display', serif;
              font-size: 28px; 
              color: #1f2937; 
              margin: 20px 0; 
              font-weight: 600;
              font-style: italic;
            }
            
            .wallet-container { 
              background: #f3f4f6;
              border: 2px dashed #9333ea; 
              border-radius: 12px; 
              padding: 15px; 
              margin: 25px auto; 
              max-width: 500px;
            }
            
            .wallet-address { 
              font-size: 14px; 
              color: #7c3aed; 
              font-family: 'Courier New', monospace; 
              font-weight: 600;
              word-break: break-all;
            }
            
            .date { 
              font-size: 16px; 
              color: #374151; 
              margin: 20px 0;
              font-weight: 500;
            }
            
            .mentor-section {
              margin-top: 50px;
              padding-top: 30px;
              border-top: 2px solid #e5e7eb;
            }
            
            .mentor-name {
              font-size: 18px;
              color: #1f2937;
              font-weight: 600;
            }
            
            .cert-id {
              font-size: 14px;
              color: #9ca3af;
              margin-top: 20px;
              font-family: 'Courier New', monospace;
              background: #f9fafb;
              padding: 10px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            
            .trophy {
              font-size: 60px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="trophy">🏆</div>
            <h1 class="title">CERTIFICATE OF COMPLETION</h1>
            
            <div class="subtitle">This is to certify that</div>
            
            <div class="student-name">${certificate.user_name}</div>
            
            <div class="wallet-container">
              <div style="font-size: 14px; color: #374151; margin-bottom: 8px; font-weight: 600;">Blockchain Wallet Address</div>
              <div class="wallet-address">${certificate.wallet_id}</div>
            </div>
            
            <div class="subtitle">has successfully completed the course</div>
            <div class="course-title">"${certificate.course_title}"</div>
            
            <div class="date">✅ Completed on: ${new Date(certificate.completion_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
            
            <div class="mentor-section">
              <div style="width: 200px; height: 2px; background: #6b7280; margin: 0 auto 10px auto;"></div>
              <div class="mentor-name">${certificate.mentor_name}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">Course Instructor</div>
            </div>
            
            <div class="cert-id">
              <strong>Certificate ID: ${certificate.certificate_id}</strong><br>
              OpenLearnX Learning Platform<br>
              <span style="color: #7c3aed;">🔒 Blockchain Verified Completion</span>
            </div>
          </div>
        </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(certificateHTML)
        printWindow.document.close()
        
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 500)
        }
        
        toast.success("Certificate PDF download initiated! Use your browser's print dialog to save as PDF.")
      } else {
        toast.error("Popup blocked. Please allow popups and try again.")
      }
      
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error("Failed to generate PDF")
    }
  }

  const handleShareCertificate = async () => {
    if (!certificate) return
    
    const shareText = `🎓 I just completed "${certificate.course_title}" on OpenLearnX!\n\n👤 Student: ${certificate.user_name}\n🏆 Certificate ID: ${certificate.certificate_id}\n🔗 View: ${certificate.public_url || window.location.origin + certificate.unique_url}\n\n#OpenLearnX #Blockchain #Learning`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate of Completion - ${certificate.course_title}`,
          text: shareText,
          url: certificate.public_url || `${window.location.origin}${certificate.unique_url}`
        })
        
        // Track share
        try {
          await fetch(`http://127.0.0.1:5000/api/certificate/share/${certificate.certificate_id}`, {
            method: 'POST'
          })
        } catch (e) {
          console.log('Share tracking failed:', e)
        }
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        toast.success("Certificate details copied to clipboard!")
        
        // Track share
        try {
          await fetch(`http://127.0.0.1:5000/api/certificate/share/${certificate.certificate_id}`, {
            method: 'POST'
          })
        } catch (e) {
          console.log('Share tracking failed:', e)
        }
      } catch (error) {
        toast.error("Failed to copy certificate details")
      }
    }
  }

  const handleClose = () => {
    setStep('input')
    setUserName('')
    setCertificate(null)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Step 1: Name Input */}
        {step === 'input' && (
          <>
            <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Generate Certificate</h2>
                  <p className="text-gray-600">You've completed the course!</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h3>
                <p className="text-gray-600">
                  You have successfully completed <strong>"{courseTitle}"</strong>
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 mb-8">
                <h4 className="font-semibold text-gray-900 mb-4">Course Details:</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-gray-700">
                    <BookOpen className="w-4 h-4 mr-3 text-indigo-600" />
                    <span><strong>Course:</strong> {courseTitle}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <User className="w-4 h-4 mr-3 text-indigo-600" />
                    <span><strong>Instructor:</strong> {courseMentor}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Calendar className="w-4 h-4 mr-3 text-indigo-600" />
                    <span><strong>Completed:</strong> {new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-start text-gray-700">
                    <Wallet className="w-4 h-4 mr-3 mt-0.5 text-purple-600" />
                    <div>
                      <span><strong>Wallet:</strong></span>
                      <div className="font-mono text-xs text-purple-600 mt-1 break-all">
                        {walletId}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enter your full name for the certificate: *
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                  autoFocus
                  maxLength={50}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Your name will appear prominently on the certificate.
                  </p>
                  <span className="text-xs text-gray-400">
                    {userName.length}/50
                  </span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateCertificate}
                  disabled={!userName.trim() || loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                >
                  {loading ? 'Generating...' : 'Generate Certificate'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Generating */}
        {step === 'generating' && (
          <div className="px-8 py-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-6"></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating Your Certificate</h3>
            <p className="text-gray-600">Creating unique certificate ID and blockchain verification...</p>
            <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        )}

        {/* Step 3: Certificate Generated */}
        {step === 'completed' && certificate && (
          <>
            <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Certificate Ready!</h2>
                  <p className="text-gray-600">For: {certificate.user_name}</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-4 border-indigo-200 rounded-xl p-8 mb-8 text-center relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Verified</span>
                </div>
                
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">CERTIFICATE OF COMPLETION</h3>
                <p className="text-gray-600 mb-6">This is to certify that</p>
                
                <div className="mb-6">
                  <h4 className="text-4xl font-bold text-indigo-600 mb-3 border-b-2 border-indigo-300 pb-2 inline-block capitalize">
                    {certificate.user_name}
                  </h4>
                  <p className="text-sm text-gray-500 mt-2">Student</p>
                </div>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Blockchain Wallet Address:</p>
                  <div className="bg-purple-100 border-2 border-dashed border-purple-300 rounded-lg p-3 mx-auto max-w-md">
                    <p className="text-purple-700 font-mono text-sm break-all">
                      {certificate.wallet_id}
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-2">has successfully completed the course</p>
                <h5 className="text-xl font-semibold text-gray-900 mb-4 italic">"{certificate.course_title}"</h5>
                
                <div className="text-sm text-gray-500 mb-6">
                  <p>Completed on: {new Date(certificate.completion_date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>

                <div className="mt-8 pt-6 border-t border-indigo-200">
                  <div className="flex justify-center">
                    <div className="text-center">
                      <div className="w-32 h-0.5 bg-gray-400 mb-2 mx-auto"></div>
                      <p className="text-base font-semibold text-gray-700">
                        {certificate.mentor_name}
                      </p>
                      <p className="text-xs text-gray-500">Course Instructor</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-indigo-200">
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <p className="text-sm font-semibold text-gray-700 mb-2">🆔 Unique Certificate ID:</p>
                    <p className="text-lg font-mono font-bold text-indigo-600 bg-white px-3 py-2 rounded border">
                      {certificate.certificate_id}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    <strong>OpenLearnX Learning Platform</strong><br/>
                    <span className="text-purple-600">🔒 Blockchain Verified Completion</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={handleDownloadCertificate}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleShareCertificate}
                  className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  🎉 Your certificate with unique ID <strong>{certificate.certificate_id}</strong> has been generated!
                </p>
                {certificate.unique_url && (
                  <p className="text-xs text-gray-400 mt-2">
                    View at: <a href={certificate.unique_url} className="text-indigo-600 hover:underline">{certificate.unique_url}</a>
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
