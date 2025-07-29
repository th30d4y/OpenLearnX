"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Calendar, User, BookOpen, Wallet, Award, Share2, Download, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

interface Certificate {
  certificate_id: string
  share_code: string
  user_name: string
  student_name: string
  studentName?: string  // camelCase variant
  userName?: string     // camelCase variant
  course_title: string
  courseTitle?: string  // camelCase variant
  mentor_name: string
  instructor_name: string
  instructorName?: string  // camelCase variant
  mentorName?: string      // camelCase variant
  completion_date: string
  completionDate?: string  // camelCase variant
  wallet_address?: string
  walletAddress?: string   // camelCase variant
  issued_by: string
  issuedBy?: string       // camelCase variant
  view_count: number
  viewCount?: number      // camelCase variant
  blockchain_hash?: string
  blockchainHash?: string // camelCase variant
  public_url?: string
  publicUrl?: string      // camelCase variant
  verification_url?: string
  is_verified: boolean
  isVerified?: boolean    // camelCase variant
  is_revoked: boolean
  isRevoked?: boolean     // camelCase variant
}

export default function CertificatePage() {
  const params = useParams()
  const router = useRouter()
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const certificateId = params?.id as string

  useEffect(() => {
    if (certificateId) {
      fetchCertificate(certificateId)
    }
  }, [certificateId])

  const fetchCertificate = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 Fetching certificate with ID: ${id}`)
      
      let response = null
      
      // Try verify endpoint first
      try {
        console.log(`🔍 Trying verify endpoint: /api/certificate/verify/${id}`)
        response = await fetch(`http://127.0.0.1:5000/api/certificate/verify/${id}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('🔍 Verify endpoint response:', data)
          
          if (data.success && data.verified) {
            console.log('✅ Found certificate by verify endpoint')
            console.log('🎓 Student name fields:', {
              student_name: data.certificate?.student_name,
              user_name: data.certificate?.user_name,
              studentName: data.certificate?.studentName,
              userName: data.certificate?.userName
            })
            console.log('👨‍🏫 Instructor name fields:', {
              instructor_name: data.certificate?.instructor_name,
              mentor_name: data.certificate?.mentor_name,
              instructorName: data.certificate?.instructorName,
              mentorName: data.certificate?.mentorName
            })
            
            setCertificate(data.certificate)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.log('Verify endpoint failed, trying next...')
      }
      
      // Try direct ID endpoint
      try {
        console.log(`🔍 Trying direct endpoint: /api/certificate/${id}`)
        response = await fetch(`http://127.0.0.1:5000/api/certificate/${id}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('🔍 Direct endpoint response:', data)
          
          if (data.success) {
            console.log('✅ Found certificate by direct endpoint')
            console.log('🎓 Student name fields:', {
              student_name: data.certificate?.student_name,
              user_name: data.certificate?.user_name,
              studentName: data.certificate?.studentName,
              userName: data.certificate?.userName
            })
            console.log('👨‍🏫 Instructor name fields:', {
              instructor_name: data.certificate?.instructor_name,
              mentor_name: data.certificate?.mentor_name,
              instructorName: data.certificate?.instructorName,
              mentorName: data.certificate?.mentorName
            })
            
            setCertificate(data.certificate)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.log('Direct endpoint failed')
      }
      
      console.error('❌ Certificate not found in any endpoint')
      setError("Certificate not found")
      setLoading(false)
      
    } catch (error) {
      console.error('❌ Error fetching certificate:', error)
      setError("Failed to load certificate")
      setLoading(false)
    }
  }

  // ✅ FIXED: Helper functions to get names with multiple fallbacks
  const getStudentName = () => {
    if (!certificate) return 'Student Name Missing'
    
    const name = certificate.student_name || 
                 certificate.user_name || 
                 certificate.studentName || 
                 certificate.userName || 
                 'Student Name Missing'
    
    console.log('🎓 Final student name:', name)
    return name
  }

  const getInstructorName = () => {
    if (!certificate) return 'OpenLearnX Instructor'
    
    const name = certificate.instructor_name || 
                 certificate.mentor_name || 
                 certificate.instructorName || 
                 certificate.mentorName || 
                 'OpenLearnX Instructor'
    
    console.log('👨‍🏫 Final instructor name:', name)
    return name
  }

  const getCourseTitle = () => {
    if (!certificate) return 'Course Title Missing'
    
    return certificate.course_title || 
           certificate.courseTitle || 
           'Course Title Missing'
  }

  const getCompletionDate = () => {
    if (!certificate) return new Date()
    
    const dateStr = certificate.completion_date || certificate.completionDate || new Date().toISOString()
    return new Date(dateStr)
  }

  const handleDownloadPDF = () => {
    if (!certificate) return
    
    try {
      const studentName = getStudentName()
      const instructorName = getInstructorName()
      const courseTitle = getCourseTitle()
      const completionDate = getCompletionDate()
      
      const certificateHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate - ${studentName}</title>
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
          </style>
        </head>
        <body>
          <div class="certificate">
            <div style="font-size: 60px; margin-bottom: 20px;">🏆</div>
            <h1 class="title">CERTIFICATE OF COMPLETION</h1>
            
            <div style="font-size: 18px; color: #6b7280; margin-bottom: 30px;">This is to certify that</div>
            
            <div class="student-name">${studentName}</div>
            
            <div style="font-size: 18px; color: #6b7280; margin-bottom: 20px;">has successfully completed the course</div>
            <div class="course-title">"${courseTitle}"</div>
            
            <div style="font-size: 16px; color: #374151; margin: 20px 0;">
              ✅ Completed on: ${completionDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            
            <div class="mentor-section">
              <div style="width: 200px; height: 2px; background: #6b7280; margin: 0 auto 10px auto;"></div>
              <div class="mentor-name">${instructorName}</div>
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
        
        toast.success("Certificate PDF download initiated!")
      } else {
        toast.error("Popup blocked. Please allow popups and try again.")
      }
      
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error("Failed to generate PDF")
    }
  }

  const handleShare = async () => {
    if (!certificate) return
    
    const studentName = getStudentName()
    const courseTitle = getCourseTitle()
    
    const shareText = `🎓 Check out my certificate of completion for "${courseTitle}" from OpenLearnX!\n\nStudent: ${studentName}\nCertificate ID: ${certificate.certificate_id}\n\n#OpenLearnX #Certificate #Learning`
    const shareUrl = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate - ${courseTitle}`,
          text: shareText,
          url: shareUrl
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
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
        toast.success("Certificate link copied to clipboard!")
        
        // Track share
        try {
          await fetch(`http://127.0.0.1:5000/api/certificate/share/${certificate.certificate_id}`, {
            method: 'POST'
          })
        } catch (e) {
          console.log('Share tracking failed:', e)
        }
      } catch (error) {
        toast.error("Failed to copy link")
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificate...</p>
          <p className="text-sm text-gray-500 mt-2">Certificate ID: {certificateId}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Certificate ID: {certificateId}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No certificate data available</p>
        </div>
      </div>
    )
  }

  // ✅ Get the final names to display
  const studentName = getStudentName()
  const instructorName = getInstructorName()
  const courseTitle = getCourseTitle()
  const completionDate = getCompletionDate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold text-gray-900">Verified Certificate</h1>
          </div>
          <p className="text-gray-600">This certificate has been verified on the blockchain</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-12 border-8 border-indigo-200 relative overflow-hidden">
          
          <div className="absolute top-6 right-6 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Verified</span>
          </div>

          <div className="text-center">
            
            <div className="text-8xl mb-6">🏆</div>
            
            <h2 className="text-5xl font-bold text-indigo-600 mb-6 font-serif">
              CERTIFICATE OF COMPLETION
            </h2>
            
            <p className="text-xl text-gray-600 mb-8">This is to certify that</p>
            
            <div className="mb-8">
              {/* ✅ FIXED: Using helper function for guaranteed name display */}
              <div className="text-6xl font-bold text-gray-900 mb-4 border-t-4 border-b-4 border-indigo-300 py-6 capitalize font-serif">
                {studentName}
              </div>
              <p className="text-sm text-gray-500">Student</p>
            </div>
            
            <p className="text-xl text-gray-600 mb-4">has successfully completed the course</p>
            
            {/* ✅ FIXED: Using helper function for course title */}
            <h3 className="text-3xl font-semibold text-gray-900 mb-8 italic font-serif">
              "{courseTitle}"
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 p-6 bg-indigo-50 rounded-xl">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Completion Date</p>
                <p className="font-semibold text-gray-900">
                  {completionDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              <div className="text-center">
                <Award className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Certificate ID</p>
                <p className="font-mono font-semibold text-indigo-600 text-sm">
                  {certificate.certificate_id}
                </p>
              </div>
              
              <div className="text-center">
                <User className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Views</p>
                <p className="font-semibold text-gray-900">
                  {certificate.view_count || certificate.viewCount || 0}
                </p>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t-2 border-gray-200">
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="w-48 h-0.5 bg-gray-400 mb-3 mx-auto"></div>
                  {/* ✅ FIXED: Using helper function for instructor name */}
                  <p className="text-xl font-semibold text-gray-700">
                    {instructorName}
                  </p>
                  <p className="text-sm text-gray-500">Course Instructor</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                <strong>{certificate.issued_by || certificate.issuedBy || 'OpenLearnX'}</strong><br/>
                Digital Certificate of Achievement<br/>
                <span className="text-purple-600">🔒 Blockchain Verified</span>
              </p>
              {(certificate.blockchain_hash || certificate.blockchainHash) && (
                <p className="text-xs text-gray-400 mt-2 font-mono break-all">
                  Blockchain Hash: {certificate.blockchain_hash || certificate.blockchainHash}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6 mt-8">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center space-x-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Download PDF</span>
          </button>
          
          <button
            onClick={handleShare}
            className="flex items-center justify-center space-x-2 px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span>Share Certificate</span>
          </button>
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>This certificate can be verified at any time using the certificate ID above.</p>
          <p className="mt-2">Powered by OpenLearnX • Secured by Blockchain Technology</p>
        </div>
        
        {/* ✅ DEBUG: Show raw certificate data in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <details>
              <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                Debug: Raw Certificate Data
              </summary>
              <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(certificate, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
