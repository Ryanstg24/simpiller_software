'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OCRService, { OCRResult, MedicationLabelData } from '@/lib/ocr';
import Image from 'next/image';

interface ScanSession {
  id: string;
  patient_id: string;
  medication_id: string;
  scan_token: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  
  // Joined data
  patients?: {
    first_name: string;
    last_name: string;
  };
  medications?: {
    medication_name: string;
    dosage: string;
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
            medication_id: 'test-medication',
            scan_token: token,
            status: 'pending',
            created_at: testDate.toISOString(),
            patients: {
              first_name: patientParam.split(' ')[0] || 'Test',
              last_name: patientParam.split(' ').slice(1).join(' ') || 'Patient'
            },
            medications: {
              medication_name: medicationParam,
              dosage: '500mg'
            }
          };
          setScanSession(testSession);
          setLoading(false);
          return;
        }

        // Load real session data
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scan/session/${token}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const session: ScanSession = await response.json();
        setScanSession(session);
        setLoading(false);
      } catch (err) {
        setError('Failed to load medication session.');
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

  // Automatic capture function
  const startAutoCapture = () => {
    const captureInterval = setInterval(async () => {
      if (!isCameraActive || !videoRef.current || !canvasRef.current) {
        clearInterval(captureInterval);
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
          
          // Process the image for medication detection
          const result = await OCRService.extractTextFromImage(imageDataUrl);
          const parsed = OCRService.parseMedicationLabel(result);
          
          // Check if we found medication names
          if (parsed.medicationNames && parsed.medicationNames.length > 0) {
            console.log('🔍 Auto-capture: Found medication:', parsed.medicationName);
            
            // Get expected medication from session data
            const expectedMedication = scanSession?.medications?.medication_name || '';
            
            if (expectedMedication) {
              const isValid = parsed.medicationNames.some(med => 
                expectedMedication.toLowerCase().includes(med.toLowerCase()) ||
                med.toLowerCase().includes(expectedMedication.toLowerCase())
              );
              
              if (isValid && result.confidence > 30) {
                console.log('✅ Auto-capture: Valid medication detected, capturing...');
                setImageData(imageDataUrl);
                setOcrResult(result);
                setLabelData(parsed);
                setLastCaptureTime(now);
                clearInterval(captureInterval);
                stopCamera();
              }
            }
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
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImageData(imageDataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageData(e.target?.result as string);
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

      // For test scans, create a more realistic validation
      let validation;
      if (token.startsWith('test-')) {
        // For test scans, simulate a realistic validation
        const scannedText = ocrData.text.toLowerCase();
        const expectedMedicationName = currentMedication.medication_name.toLowerCase();
        
        // Check if the scanned text contains the expected medication name or similar
        const isMatch = scannedText.includes(expectedMedicationName) || 
                       scannedText.includes('medication') || 
                       scannedText.includes('tablet') ||
                       scannedText.includes('capsule') ||
                       scannedText.includes('mg') ||
                       scannedText.includes('prescription');
        
        validation = {
          isValid: isMatch,
          confidence: isMatch ? 0.85 : 0.25,
          matchedFields: isMatch ? ['medicationName'] : [],
          errors: isMatch ? [] : ['Medication name not found in scanned text']
        };
      } else {
        // For real scans, use the actual validation
        const expectedMedication = {
          medicationName: currentMedication.medication_name,
          dosage: currentMedication.dosage,
          patientName: scanSession.patients?.first_name + ' ' + scanSession.patients?.last_name,
        };
        validation = OCRService.validateMedicationLabel(parsedLabelData, expectedMedication);
      }

      console.log('Scan validation result:', {
        sessionToken: token,
        medicationId: scanSession.medication_id,
        expectedMedication: currentMedication.medication_name,
        scannedText: ocrData.text,
        validation,
        isTestScan: token.startsWith('test-')
      });

      // Determine success based on validation
      const isSuccess = validation.isValid && validation.confidence > 0.5;
      
      setScanComplete(true);
      setScanSession(prev => prev ? { 
        ...prev, 
        status: isSuccess ? 'completed' : 'failed' 
      } : null);

    } catch (error) {
      console.error('Error processing image:', error);
      setScanComplete(true);
      setScanSession(prev => prev ? { ...prev, status: 'failed' } : null);
    } finally {
      setIsProcessing(false);
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
    stopCamera();
  };

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
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
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Session Error</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Invalid or expired session'}
          </p>
          <p className="text-sm text-gray-500">
            Please check your medication reminder link or contact your healthcare provider.
          </p>
        </div>
      </div>
    );
  }

  const currentMedication = scanSession.medications;
  const progress = 100; // Assuming a single scan for now

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Medication Scan</h1>
              <p className="text-sm text-gray-600">{scanSession.patients?.first_name + ' ' + scanSession.patients?.last_name}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="text-lg font-semibold text-blue-600">
                100%
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Current Medication Info */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Scan: {currentMedication?.medication_name}
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Dosage:</strong> {currentMedication?.dosage}</p>
            <p><strong>Scheduled Time:</strong> {formatTime(scanSession.created_at)}</p>
            <p><strong>Instructions:</strong> Take as prescribed</p>
          </div>
          {token.startsWith('test-') && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
              <p className="text-xs text-yellow-800">
                🧪 Test Mode - This is a demonstration scan
              </p>
            </div>
          )}
        </div>

        {/* Scan Method Selection */}
        {!imageData && !isCameraActive && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">How would you like to scan your medication?</h3>
            <div className="space-y-3">
              <Button
                onClick={startCamera}
                className="w-full flex items-center p-3 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors bg-blue-50"
              >
                <Camera className="h-5 w-5 text-blue-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">📱 Live Camera Preview</div>
                  <div className="text-sm text-gray-600">Recommended: See live camera feed and capture automatically</div>
                </div>
              </Button>
              
              <label className="w-full flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <Camera className="h-5 w-5 text-purple-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">📷 Native Camera (Fallback)</div>
                  <div className="text-sm text-gray-600">Use iOS camera app if live preview doesn&apos;t work</div>
                </div>
                <input
                  type="file"
                  accept="image/*;capture=camera"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
              <label className="w-full flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <Upload className="h-5 w-5 text-green-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">📁 Upload Photo</div>
                  <div className="text-sm text-gray-600">Choose from your photo library</div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
            </div>
            
            {/* Instructions */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>📱 For best results:</strong> Use &quot;Live Camera Preview&quot; first. It will automatically capture when your medication is detected.
              </p>
              <p className="text-xs text-blue-700 mt-2">
                <strong>Fallback:</strong> If the live camera doesn&apos;t work, try &quot;Native Camera&quot; which opens your phone&apos;s camera app.
              </p>
            </div>
            
            {/* Debug info for test scans */}
            {token.startsWith('test-') && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Debug Info:</p>
                <p className="text-xs text-gray-500">Token: {token}</p>
                <p className="text-xs text-gray-500">Expected: {scanSession?.medications?.medication_name}</p>
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
                <div className="border-2 border-white rounded-lg w-48 h-32 relative">
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
                  <p className="text-sm">Position medication label within the frame</p>
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
                {autoCaptureEnabled 
                  ? 'Camera will automatically capture when your medication is detected'
                  : 'Click "Capture & Scan" to manually capture'
                }
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
            
            <div className="flex space-x-3 mt-4">
              <Button
                onClick={captureImage}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                📸 Capture & Scan
              </Button>
              <Button
                onClick={stopCamera}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </Button>
            </div>
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
            <div className="flex space-x-3">
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
              <Button
                onClick={resetScanState}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Retake
              </Button>
            </div>
          </div>
        )}

        {/* OCR Results */}
        {ocrResult && labelData && (
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
        )}

        {/* Scan Result */}
        {scanComplete && (
          <div className={`bg-white rounded-lg shadow-sm border p-4 mb-6 ${
            scanSession.status === 'completed' ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className="flex items-center mb-4">
              {scanSession.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <h3 className="text-lg font-medium text-gray-900">
                {scanSession.status === 'completed' ? 'Scan Successful!' : 'Scan Failed'}
              </h3>
            </div>
            
            {scanSession.status === 'completed' ? (
              <div className="text-green-700">
                <p>Medication verified successfully. Your compliance has been recorded.</p>
                <p className="mt-2 font-medium">Thank you for your scan!</p>
              </div>
            ) : (
              <div className="text-red-700">
                <p>{scanSession.status === 'failed' ? 'Failed to process image. Please try again.' : 'The scanned medication does not match your prescription.'}</p>
                <p className="mt-2">Please try again with a clearer photo of the medication label.</p>
              </div>
            )}
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