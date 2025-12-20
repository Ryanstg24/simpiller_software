'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OCRService, { OCRResult, MedicationLabelData } from '@/lib/ocr';
import Image from 'next/image';

interface ScanSession {
  id: string;
  patient_id: string;
  medication_ids: string[];
  session_token: string;
  is_active: boolean;
  created_at: string;
  completed_at?: string;
  scheduled_time: string;
  
  // Joined data
  patients?: {
    first_name: string;
    last_name: string;
    timezone?: string;
  };
  medications?: {
    id: string;
    name: string;
    strength: string;
    format: string;
  };
}

export function ScanPageClient({ token }: { token: string }) {
  const [scanSession, setScanSession] = useState<ScanSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [labelData, setLabelData] = useState<MedicationLabelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  const [timeliness, setTimeliness] = useState<'on_time' | 'overdue' | 'missed' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showManualConfirmation, setShowManualConfirmation] = useState(false);
  const [autoCaptureTimeout, setAutoCaptureTimeout] = useState<NodeJS.Timeout | null>(null);
  const [autoCaptureStartTime, setAutoCaptureStartTime] = useState<number | null>(null);
  const [showNoLabelWarning, setShowNoLabelWarning] = useState(false);
  const [autoCaptureRetryCount, setAutoCaptureRetryCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Check if this is a test scan (starts with "test-")
        if (token.startsWith('test-')) {
          // Extract data from URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const medicationParam = urlParams.get('med') || 'Test Medication';
          const patientParam = urlParams.get('patient') || 'Test Patient';
          
          // Create a mock test session immediately
          // Extract timestamp from token for realistic test data
          const timestamp = token.replace('test-', '');
          const testDate = new Date(parseInt(timestamp));
          
          const testSession: ScanSession = {
            id: token,
            patient_id: 'test-patient',
            medication_ids: ['test-medication'],
            session_token: token,
            is_active: true,
            created_at: testDate.toISOString(),
            scheduled_time: testDate.toISOString(),
            patients: {
              first_name: patientParam.split(' ')[0] || 'Test',
              last_name: patientParam.split(' ').slice(1).join(' ') || 'Patient'
            },
            medications: {
              id: 'test-medication',
              name: medicationParam,
              strength: '500mg',
              format: 'tablet'
            }
          };
          setScanSession(testSession);
          // compute timeliness
          const diffMin = (Date.now() - testDate.getTime()) / 60000;
          setTimeliness(diffMin > 180 ? 'missed' : diffMin > 60 ? 'overdue' : 'on_time');
          setLoading(false);
          return;
        }

        // Load real session data
        const response = await fetch(`/api/scan/session/${token}`);
        if (!response.ok) {
          // Handle different error types more gracefully
          if (response.status === 410) {
            // Session expired - this is expected and not really an "error"
            setError('expired');
          } else if (response.status === 404) {
            // Session not found - also expected for old/invalid links
            setError('not_found');
          } else {
            // Actual server error
            setError('server_error');
          }
          setLoading(false);
          return;
        }
        const session: ScanSession = await response.json();
        setScanSession(session);
        // compute timeliness
        const sched = new Date(session.scheduled_time);
        const diffMin = (Date.now() - sched.getTime()) / 60000;
        setTimeliness(diffMin > 180 ? 'missed' : diffMin > 60 ? 'overdue' : 'on_time');
        setLoading(false);
      } catch (err) {
        setError('server_error');
        setLoading(false);
        console.error(err);
      }
    };
    
    loadSession();
  }, [token]);

  // Camera functions - ChatGPT's approach: Set camera active first, then use useEffect
  const startCamera = async () => {
    try {
      console.log('🎥 Starting camera...');
      setCameraError(null);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this device');
      }

      // iOS Safari specific constraints
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      };

      console.log('📹 Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('📹 Camera stream obtained:', stream);
      console.log('📹 Stream tracks:', stream.getTracks());
      
      // Store the stream and set camera active - this will trigger video element rendering
      streamRef.current = stream;
      setIsCameraActive(true);
      
      console.log('🎯 Camera active set to true, video element should render now');
      
    } catch (err) {
      console.error('Error accessing camera:', err);
      let errorMessage = 'Failed to access camera. Please ensure it is enabled and try again.';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access was denied. Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Camera access is not supported on this device.';
        }
      }
      
      setCameraError(errorMessage);
      setIsCameraActive(false);
    }
  };

  // ChatGPT's useEffect approach: Handle video element after it's rendered
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      console.log('🎯 Video element is now available, setting up stream...');
      
      const video = videoRef.current;
      const stream = streamRef.current;
      
      console.log('🎯 Video element found:', !!video);
      console.log('🎯 Video element tagName:', video.tagName);
      
      // ChatGPT's simple approach: Just set srcObject and play
      video.srcObject = stream;
      
      console.log('🎯 Video srcObject set:', !!video.srcObject);
      
      // ChatGPT's critical fix: Call play() immediately
      video.play().then(() => {
        console.log('✅ Video playing successfully!');
        
        // Start automatic capture if enabled
        if (autoCaptureEnabled) {
          startAutoCapture();
        }
      }).catch((err) => {
        console.error('❌ Video play failed:', err);
        setCameraError('Failed to start video playback. Please try again.');
      });
    }
  }, [isCameraActive]); // Run when isCameraActive changes

  // Improved automatic capture function with timeout and proper validation
  const startAutoCapture = () => {
    // Check if we've already reached max attempts
    if (autoCaptureRetryCount >= 3) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        console.log('[AUTO-CAPTURE] Max attempts already reached, showing manual confirmation');
      }
      setShowManualConfirmation(true);
      setScanComplete(true);
      setScanSession(prev => prev ? { ...prev, is_active: false } : null);
      return;
    }
    
    // Reset state (but don't reset retry count - that should persist across "Scan Now" clicks)
    setShowNoLabelWarning(false);
    setAutoCaptureStartTime(Date.now());
    
    // Set 30-second timeout
    const timeout = setTimeout(() => {
      const newRetryCount = autoCaptureRetryCount + 1;
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        console.log(`[AUTO-CAPTURE] Timeout reached - no label detected (attempt ${newRetryCount} of 3)`);
      }
      setAutoCaptureRetryCount(newRetryCount);
      setShowNoLabelWarning(true);
      stopCamera();
    }, 30000); // 30 seconds
    
    setAutoCaptureTimeout(timeout);
    
    const captureInterval = setInterval(async () => {
      if (!isCameraActive || !videoRef.current || !canvasRef.current) {
        clearInterval(captureInterval);
        clearTimeout(timeout);
        return;
      }
      if (timeliness === 'missed') {
        // stop capturing if window expired
        clearInterval(captureInterval);
        clearTimeout(timeout);
        return;
      }

      // Don't capture too frequently (max once every 2 seconds)
      const now = Date.now();
      if (now - lastCaptureTime < 2000) {
        return;
      }

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);
          
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          // Process the image for OCR
          const result = await OCRService.extractTextFromImage(imageDataUrl);
          const parsed = OCRService.parseMedicationLabel(result);
          
          // Check if we found any text (basic validation)
          if (result.text && result.text.trim().length > 0) {
            console.log('🔍 Auto-capture: Text detected, validating...');
            
            // Use proper validation (time + patient name)
            if (scanSession?.medications && scanSession?.patients) {
              const formattedTime = formatTime(scanSession.scheduled_time);
              const expectedMedication = {
                medicationName: scanSession.medications.name,
                dosage: `${scanSession.medications.strength} ${scanSession.medications.format}`,
                patientName: `${scanSession.patients.last_name}, ${scanSession.patients.first_name}`, // Last, First format to match label
                scheduledTime: formattedTime,
              };
              
              // Log expected values for debugging
              if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
                console.log('[AUTO-CAPTURE] Expected values:', JSON.stringify({
                  rawScheduledTime: scanSession.scheduled_time,
                  formattedTime: formattedTime,
                  expectedPatientName: expectedMedication.patientName,
                  expectedMedicationName: expectedMedication.medicationName
                }));
              }
              
              const validation = OCRService.validateMedicationLabel(parsed, expectedMedication);
              
              // Log validation attempt
              if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
                console.log('[AUTO-CAPTURE] Validation result:', JSON.stringify({
                  sessionToken: token,
                  medicationId: scanSession.medications.id,
                  expectedMedication: scanSession.medications.name,
                  scannedText: result.text,
                  validation,
                  confidence: result.confidence
                }));
              }
              
              // Check if validation passes
              const isSuccess = validation.isValid && validation.passedChecks === validation.requiredChecks;
              
              if (isSuccess) {
                console.log('✅ Auto-capture: Valid medication detected, processing...');
                setImageData(imageDataUrl);
                setOcrResult(result);
                setLabelData(parsed);
                setLastCaptureTime(now);
                clearInterval(captureInterval);
                clearTimeout(timeout);
                stopCamera();
                
                // Process the successful scan
                setIsProcessing(true);
                try {
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay for UX
                  
                  setScanSession(prev => prev ? { ...prev, is_active: false } : null);
                  setScanComplete(true);
                  setIsProcessing(false);
                  
                  // Log the successful scan
                  await logSuccessfulScan();
                  
                  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
                    console.log('[AUTO-CAPTURE] ✅ Scan SUCCESS:', JSON.stringify({
                      sessionToken: token,
                      medicationId: scanSession.medications.id,
                      expectedMedication: scanSession.medications.name,
                      validation: validation
                    }));
                  }
                } catch (error) {
                  console.error('Auto-process error:', error);
                  setScanSession(prev => prev ? { ...prev, is_active: false } : null);
                  setIsProcessing(false);
                }
              } else {
                // Validation failed, but we found text - continue trying
                console.log('❌ Auto-capture: Validation failed, continuing to scan...');
              }
            }
          } else {
            // No text detected - this is normal, continue scanning
            console.log('🔍 Auto-capture: No text detected, continuing to scan...');
          }
        }
      } catch (error) {
        console.error('Auto-capture error:', error);
      }
    }, 1000); // Check every second
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
    
    // Clear any pending timeout
    if (autoCaptureTimeout) {
      clearTimeout(autoCaptureTimeout);
      setAutoCaptureTimeout(null);
    }
  };

  // Handle retry for auto-capture
  const retryAutoCapture = () => {
    setShowNoLabelWarning(false);
    
    if (autoCaptureRetryCount >= 3) {
      // Max retries reached, show manual confirmation
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        console.log('[AUTO-CAPTURE] Max retries reached, showing manual confirmation');
      }
      setShowManualConfirmation(true);
      setScanComplete(true);
      setScanSession(prev => prev ? { ...prev, is_active: false } : null);
    } else {
      // Start camera and auto-capture again
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        console.log(`[AUTO-CAPTURE] Starting attempt ${autoCaptureRetryCount + 1} of 3`);
      }
      setIsCameraActive(true);
    }
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        setImageData(result);
        
        // Process the uploaded image with proper validation
        await processImage();
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!imageData || !scanSession) return;

    setIsProcessing(true);
    setOcrResult(null);
    setLabelData(null);

    try {
      // Process image with OCR
      const ocrData = await OCRService.extractTextFromImage(imageData);
      const parsedLabelData = OCRService.parseMedicationLabel(ocrData);
      setOcrResult(ocrData);
      setLabelData(parsedLabelData);

      // Get current medication
      const currentMedication = scanSession.medications;
      if (!currentMedication) {
        throw new Error('No medication found for current index');
      }

      // Always use strict validation - no test mode bypass
      // SIMPLIFIED: Only check time and patient name for better OCR success
      const expectedMedication = {
        medicationName: currentMedication.name,
        dosage: `${currentMedication.strength} ${currentMedication.format}`,
        patientName: `${scanSession.patients?.last_name}, ${scanSession.patients?.first_name}`, // Last, First format to match label
        scheduledTime: formatTime(scanSession.scheduled_time), // Add scheduled time for validation
      };
      const validation = OCRService.validateMedicationLabel(parsedLabelData, expectedMedication);

      // Log to Vercel for debugging
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        console.log('[SCAN] Scan validation result:', JSON.stringify({
          sessionToken: token,
          medicationId: scanSession.medications?.id || scanSession.medication_ids[0],
          expectedMedication: currentMedication.name,
          scannedText: ocrData.text,
          validation,
          isTestScan: token.startsWith('test-')
        }));
      }

      // Determine success based on STRICT validation - ALL checks must pass
      const isSuccess = validation.isValid && validation.passedChecks === validation.requiredChecks;
      
      if (isSuccess) {
        // Success - log the scan and mark as completed
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
          console.log('[SCAN] ✅ Scan SUCCESS:', JSON.stringify({
            sessionToken: token,
            medicationId: scanSession.medications?.id || scanSession.medication_ids[0],
            expectedMedication: currentMedication.name,
            validation: validation
          }));
        }
        setScanComplete(true);
        setScanSession(prev => prev ? { 
          ...prev, 
          is_active: false 
        } : null);
        await logSuccessfulScan();
      } else {
        // Failed validation
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
          console.log('[SCAN] ❌ Scan FAILED:', JSON.stringify({
            sessionToken: token,
            medicationId: scanSession.medications?.id || scanSession.medication_ids[0],
            expectedMedication: currentMedication.name,
            retryCount: newRetryCount,
            validation: validation
          }));
        }
        
        if (newRetryCount >= 3) {
          // After 3 failed attempts, show manual confirmation
          if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
            console.log('[SCAN] 🔄 Max retries reached, showing manual confirmation');
          }
          setShowManualConfirmation(true);
          setScanComplete(true);
          setScanSession(prev => prev ? { 
            ...prev, 
            is_active: false 
          } : null);
        } else {
          // Show retry message
          if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
            console.log('[SCAN] 🔄 Showing retry option, attempt:', newRetryCount);
          }
          setScanComplete(true);
          setScanSession(prev => prev ? { 
            ...prev, 
            is_active: false 
          } : null);
        }
      }

    } catch (error) {
      console.error('Error processing image:', error);
      setScanComplete(true);
      setScanSession(prev => prev ? { ...prev, is_active: false } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  const logSuccessfulScan = async () => {
    if (!scanSession) return;
    
    try {
      const response = await fetch('/api/scan/log-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanSessionId: scanSession.id,
          medicationId: scanSession.medications?.id || scanSession.medication_ids[0],
          patientId: scanSession.patient_id,
          scheduleId: null, // Will be determined by the API based on medication and time
          scanData: {
            ocrResult,
            labelData,
            imageData,
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (response.ok) {
        console.log('✅ Scan logged successfully');
      } else {
        console.error('❌ Failed to log scan:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error logging scan:', error);
    }
  };

  const resetScanState = () => {
    setImageData(null);
    setOcrResult(null);
    setLabelData(null);
    setScanComplete(false);
    setError(null);
    setIsCameraActive(false);
    setCameraError(null);
    setLastCaptureTime(0);
    setShowManualConfirmation(false);
    stopCamera();
  };

  const formatTime = (timeString: string) => {
    // Use EXACT same logic as Twilio SMS service
    // scheduled_time is stored as UTC ISO string from CRON job
    const patientTimezone = scanSession?.patients?.timezone || 'America/New_York';
    
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: patientTimezone
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading medication session...</p>
        </div>
      </div>
    );
  }

  if (error || !scanSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">No Medication to Take</h1>
          <p className="text-gray-600 mb-4">
            You don&apos;t have any medications scheduled at this time. This could mean:
          </p>
          <ul className="text-left text-gray-600 mb-6 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              You may have already taken your medication
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              The medication window has passed
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Your medication schedule has been updated
            </li>
          </ul>
          <p className="text-sm text-gray-500">
            If you have questions about your medication schedule, please contact your healthcare provider.
          </p>
        </div>
      </div>
    );
  }

  const currentMedication = scanSession.medications;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simplified Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Medication Scan</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Show warnings if needed */}
        {timeliness === 'missed' && (
          <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-4 py-3">Window expired. This dose is marked as missed. Scanning is disabled.</div>
        )}
        {timeliness === 'overdue' && (
          <div className="mb-6 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-4 py-3">Overdue window: you can still scan, but it will be recorded as overdue.</div>
        )}
        {token.startsWith('test-') && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              🧪 Test Mode - This is a demonstration scan
            </p>
          </div>
        )}

        {/* Tutorial Interface */}
        {!imageData && !isCameraActive && (
          <div className="space-y-6">
            {/* Personalized Greeting */}
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Hello, {scanSession?.patients?.first_name || 'Patient'} 👋
              </h1>
              <p className="text-gray-600 text-lg">
                It&apos;s time for your {timeliness === 'overdue' ? 'overdue' : 'scheduled'} meds. You&apos;ll scan the pouch label with your camera.
              </p>
            </div>
            
            {/* Instructions */}
            <div className="text-center">
              <p className="text-gray-700 text-base">
                This is what your pouch label looks like. Please fit the entire label in the box.
              </p>
            </div>
            
            {/* Example Label */}
            <div className="flex justify-center">
              <div className="relative border-2 border-dashed border-gray-400 rounded-lg p-4 bg-gray-50">
                <div className="w-64 h-40 flex items-center justify-center">
                  <img 
                    src="/simpiller_pack_example.jpeg" 
                    alt="Example medication pouch label"
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              </div>
            </div>
            
            {/* Scan Button */}
            <div className="space-y-3">
              <Button
                onClick={startCamera}
                disabled={timeliness === 'missed'}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Scan Now
              </Button>
            </div>
            
            {/* Alternative Option */}
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                If you can&apos;t scan, you can send a photo instead.
              </p>
              <label className="mt-2 inline-block text-blue-600 hover:text-blue-700 underline text-sm cursor-pointer">
                Send Photo Instead
                <input
                  type="file"
                  accept="image/*;capture=camera"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Debug info for test scans */}
            {token.startsWith('test-') && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Debug Info:</p>
                <p className="text-xs text-gray-500">Token: {token}</p>
                <p className="text-xs text-gray-500">Expected: {scanSession?.medications?.name}</p>
                <p className="text-xs text-gray-500">Patient: {scanSession?.patients?.first_name} {scanSession?.patients?.last_name}</p>
                <p className="text-xs text-gray-500">User Agent: {navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Other'}</p>
              </div>
            )}
          </div>
        )}

        {/* Camera Interface */}
        {isCameraActive && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
                style={{ 
                  minHeight: '400px',
                  backgroundColor: '#000',
                  width: '100%',
                  height: '400px'
                }}
                onLoadedMetadata={() => {
                  console.log('📺 Video metadata loaded in JSX');
                  console.log('📺 Video element dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
                onCanPlay={() => {
                  console.log('▶️ Video can play in JSX');
                  console.log('📺 Video ready state:', videoRef.current?.readyState);
                }}
                onError={(e) => {
                  console.error('❌ Video error in JSX:', e);
                }}
                onLoadStart={() => {
                  console.log('🔄 Video load started');
                }}
                onLoadedData={() => {
                  console.log('📊 Video data loaded');
                }}
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-dashed border-white rounded-lg w-64 h-40 relative">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-400"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-400"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400"></div>
                </div>
              </div>
              {/* Instructions overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black bg-opacity-70 text-white text-center py-2 px-4 rounded-lg">
                  <p className="text-sm">Fit the entire label in the box above</p>
                </div>
              </div>
              {/* Camera status indicator */}
              <div className="absolute top-4 right-4">
                <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                  📹 Live
                </div>
              </div>
            </div>
            
            {/* Auto-capture controls */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-green-800">
                  <strong>Auto-Capture:</strong> {autoCaptureEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <Button
                  onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                  className={`px-3 py-1 text-xs rounded ${
                    autoCaptureEnabled 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {autoCaptureEnabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
              <p className="text-xs text-green-700">
                Camera will automatically capture and process when your medication label is detected (30 second timeout)
              </p>
            </div>
            
            {/* Camera error display */}
            {cameraError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{cameraError}</p>
                <div className="mt-2">
                  <label className="inline-flex items-center p-2 border border-red-300 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                    <Camera className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm text-red-700">Try Native Camera Instead</span>
                    <input
                      type="file"
                      accept="image/*;capture=camera"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
            
            {/* No label detected warning */}
            {showNoLabelWarning ? (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="bg-yellow-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-yellow-800">No Medication Label Detected</h3>
                </div>
                <p className="text-yellow-700 mb-4">
                  The medication label was not detected after 30 seconds. Please check:
                </p>
                <ul className="text-yellow-700 mb-4 space-y-2">
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    <span><strong>Scan the whole label</strong> - Make sure the entire medication label is visible in the camera view</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    <span><strong>Correct label</strong> - Verify this is the right medication for this time</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    <span><strong>Correct time</strong> - Check that the time on the label matches your scheduled time</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    <span><strong>Correct name</strong> - Ensure the patient name on the label matches your name</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    <span><strong>Good lighting</strong> - Make sure the label is well-lit and clearly readable</span>
                  </li>
                </ul>
                <div className="flex space-x-3">
                  <Button
                    onClick={retryAutoCapture}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Try Again ({3 - autoCaptureRetryCount} attempts left)
                  </Button>
                  <Button
                    onClick={stopCamera}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-3 mt-4">
                <Button
                  onClick={stopCamera}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Image Preview */}
        {imageData && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Photo Preview</h3>
            <div className="relative">
              <Image 
                src={imageData} 
                alt="Captured medication label" 
                width={300}
                height={200}
                className="w-full max-w-sm mx-auto rounded-lg border border-gray-300"
              />
            </div>
            {isProcessing && autoCaptureEnabled && (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Processing your scan...</p>
              </div>
            )}
            
            <div className="flex space-x-3">
              {!autoCaptureEnabled && (
                <Button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Process Image'
                  )}
                </Button>
              )}
              <Button
                onClick={resetScanState}
                className={`${autoCaptureEnabled ? 'flex-1' : 'flex-1'} bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors`}
              >
                Retake
              </Button>
            </div>
          </div>
        )}

        {/* OCR Results - Hidden for production */}
        {/* {ocrResult && labelData && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Extracted Information</h3>
            <div className="space-y-2 text-sm">
              {labelData.medicationName && (
                <p><strong>Medication:</strong> {labelData.medicationName}</p>
              )}
              {labelData.dosage && (
                <p><strong>Dosage:</strong> {labelData.dosage}</p>
              )}
              {labelData.patientName && (
                <p><strong>Patient:</strong> {labelData.patientName}</p>
              )}
              {labelData.instructions && (
                <p><strong>Instructions:</strong> {labelData.instructions}</p>
              )}
              <p><strong>Confidence:</strong> {(ocrResult.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>
        )} */}

        {/* Scan Result - Full Page Success */}
        {scanComplete && !scanSession.is_active && (
          <div className="min-h-screen bg-green-50 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-4">
              {/* Large Success Icon */}
              <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              
              {/* Success Message */}
              <h1 className="text-3xl font-bold text-green-800 mb-4">
                Great Job! 🎉
              </h1>
              
              <p className="text-xl text-green-700 mb-2">
                Your medication has been verified successfully!
              </p>
              
              <p className="text-lg text-green-600 mb-8">
                Your compliance has been recorded. You&apos;re all set!
              </p>
              
              {/* Action Button */}
              <div className="space-y-4">
                <Button
                  onClick={() => window.close()}
                  className="w-full bg-green-600 text-white text-lg py-4 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
                >
                  ✅ All Done - Close This Page
                </Button>
              </div>
              
              {/* Helpful Info */}
              <div className="mt-8 p-4 bg-white rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">
                  <strong>What happens next?</strong><br/>
                  Your healthcare provider will see that you took your medication on time. Keep up the great work!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scan Failed - Keep existing design */}
        {scanComplete && scanSession.is_active && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4 mb-6">
            <div className="flex items-center mb-4">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Scan Failed</h3>
            </div>
            
            <div className="text-red-700">
                {showManualConfirmation ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="text-center">
                      <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-yellow-800 mb-2">Unable to Verify Medication</h3>
                      <p className="text-yellow-700 mb-4">
                        After 3 attempts, we couldn&apos;t automatically verify your medication. 
                        This is okay! Please let us know if you took your medication.
                      </p>
                      <p className="text-yellow-600 text-sm mb-6">
                        <strong>Don&apos;t worry:</strong> This happens sometimes due to lighting, camera angle, or label condition.
                      </p>
                      
                      <div className="space-y-3">
                        <Button
                          onClick={async () => {
                            // Log as manually confirmed
                            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
                              console.log('[SCAN] ✅ Manual confirmation: YES, took medication');
                            }
                            await logSuccessfulScan();
                            setScanSession(prev => prev ? { ...prev, is_active: false } : null);
                          }}
                          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium text-lg hover:bg-green-700 transition-colors"
                        >
                          ✅ Yes, I Took My Medication
                        </Button>
                        
                        <Button
                          onClick={() => {
                            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
                              console.log('[SCAN] ❌ Manual confirmation: NO, did not take medication');
                            }
                            window.close();
                          }}
                          className="w-full bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium text-lg hover:bg-gray-400 transition-colors"
                        >
                          ❌ No, I Haven&apos;t Taken It Yet
                        </Button>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-yellow-200">
                        <p className="text-yellow-600 text-xs">
                          Need help? Contact your healthcare provider or try again later.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">❌ Scan Failed</p>
                    <p>The scanned medication does not match your prescription.</p>
                    <p className="mt-2">Attempt {retryCount} of 3. Please try again with a clearer photo of the medication label.</p>
                    <div className="mt-4 flex space-x-3">
                      <Button
                        onClick={resetScanState}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={() => window.close()}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                      >
                        Close Tab
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
        )}

        {/* Manual Entry Fallback */}
        {/* This section is removed as per the new_code, as manual entry is not implemented */}
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
} 