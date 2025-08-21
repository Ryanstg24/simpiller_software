'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, CheckCircle, XCircle, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { useMedicationScanning } from '@/hooks/use-medication-scanning';
import type { ScanSessionResponse, ScanSubmissionRequest } from '@/types/medication-scanning';
import OCRService, { type MedicationLabelData } from '@/lib/ocr';

interface ScanPageProps {
  params: {
    token: string;
  };
}

export default function ScanPage({ params }: ScanPageProps) {
  const { token } = params;
  const { getScanSession, submitMedicationScan, loading, error } = useMedicationScanning();
  
  const [session, setSession] = useState<ScanSessionResponse | null>(null);
  const [currentMedicationIndex, setCurrentMedicationIndex] = useState(0);
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('camera');
  const [imageData, setImageData] = useState<string>('');
  const [manualMedicationName, setManualMedicationName] = useState('');
  const [manualDosage, setManualDosage] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrResult, setOcrResult] = useState<MedicationLabelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      const sessionData = await getScanSession(token);
      if (sessionData) {
        setSession(sessionData);
      }
    };
    
    loadSession();
  }, [token, getScanSession]);

  // Camera setup
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setScanMethod('manual');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
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
    if (!imageData || !session) return;

    setIsProcessing(true);
    setOcrResult(null);
    setScanResult(null);

    try {
      // Process image with OCR
      const ocrData = await OCRService.extractTextFromImage(imageData);
      const labelData = OCRService.parseMedicationLabel(ocrData);
      setOcrResult(labelData);

      // Get current medication
      const currentMedication = session.medications[currentMedicationIndex];
      if (!currentMedication) {
        throw new Error('No medication found for current index');
      }

      // Validate against expected medication
      const expectedMedication = {
        medicationName: currentMedication.medication_name,
        dosage: currentMedication.dosage,
        patientName: session.patientName,
      };

      const validation = OCRService.validateMedicationLabel(labelData, expectedMedication);

      // Submit scan to server
      const scanData: ScanSubmissionRequest = {
        sessionToken: token,
        medicationId: currentMedication.id,
        imageData,
        scanMethod,
        ocrResult: ocrData,
        labelData,
        validation,
      };

      const result = await submitMedicationScan(scanData);
      setScanResult(result);

      // If successful, move to next medication or complete
      if (validation.isValid) {
        if (currentMedicationIndex < session.medications.length - 1) {
          setCurrentMedicationIndex(prev => prev + 1);
          resetScanState();
        } else {
          // All medications scanned successfully
          console.log('All medications scanned successfully!');
        }
      }

    } catch (error) {
      console.error('Error processing image:', error);
      setScanResult({
        success: false,
        error: 'Failed to process image. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanState = () => {
    setImageData('');
    setManualMedicationName('');
    setManualDosage('');
    setScanResult(null);
    setOcrResult(null);
    setScanMethod('camera');
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

  if (error || !session) {
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

  const currentMedication = session.medications[currentMedicationIndex];
  const progress = ((currentMedicationIndex + 1) / session.medications.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Medication Scan</h1>
              <p className="text-sm text-gray-600">{session.patientName}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="text-lg font-semibold text-blue-600">
                {currentMedicationIndex + 1} of {session.medications.length}
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
            Scan: {currentMedication.medication_name}
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Dosage:</strong> {currentMedication.dosage}</p>
            <p><strong>Scheduled Time:</strong> {formatTime(session.scheduledTime)}</p>
            <p><strong>Instructions:</strong> Take as prescribed</p>
          </div>
        </div>

        {/* Scan Method Selection */}
        {!imageData && !showCamera && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">How would you like to scan?</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setScanMethod('camera');
                  startCamera();
                }}
                className="w-full flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Camera className="h-5 w-5 text-blue-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Use Camera</div>
                  <div className="text-sm text-gray-600">Take a photo of the medication label</div>
                </div>
              </button>
              
              <label className="w-full flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <Upload className="h-5 w-5 text-green-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Upload Photo</div>
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
          </div>
        )}

        {/* Camera Interface */}
        {showCamera && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white rounded-lg w-64 h-40"></div>
              </div>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={captureImage}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Capture
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  setScanMethod('manual');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {imageData && !showCamera && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Photo Preview</h3>
            <img 
              src={imageData} 
              alt="Medication label" 
              className="w-full rounded-lg mb-4"
            />
            <div className="flex space-x-3">
              <button
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
              </button>
              <button
                onClick={resetScanState}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </button>
            </div>
          </div>
        )}

        {/* OCR Results */}
        {ocrResult && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Extracted Information</h3>
            <div className="space-y-2 text-sm">
              {ocrResult.medicationName && (
                <p><strong>Medication:</strong> {ocrResult.medicationName}</p>
              )}
              {ocrResult.dosage && (
                <p><strong>Dosage:</strong> {ocrResult.dosage}</p>
              )}
              {ocrResult.patientName && (
                <p><strong>Patient:</strong> {ocrResult.patientName}</p>
              )}
              {ocrResult.instructions && (
                <p><strong>Instructions:</strong> {ocrResult.instructions}</p>
              )}
              <p><strong>Confidence:</strong> {(ocrResult.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className={`bg-white rounded-lg shadow-sm border p-4 mb-6 ${
            scanResult.success ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className="flex items-center mb-4">
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <h3 className="text-lg font-medium text-gray-900">
                {scanResult.success ? 'Scan Successful!' : 'Scan Failed'}
              </h3>
            </div>
            
            {scanResult.success ? (
              <div className="text-green-700">
                <p>Medication verified successfully. Your compliance has been recorded.</p>
                {currentMedicationIndex < session.medications.length - 1 && (
                  <p className="mt-2 font-medium">Please scan your next medication.</p>
                )}
              </div>
            ) : (
              <div className="text-red-700">
                <p>{scanResult.error || 'The scanned medication does not match your prescription.'}</p>
                <p className="mt-2">Please try again with a clearer photo of the medication label.</p>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Fallback */}
        {scanMethod === 'manual' && !imageData && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={manualMedicationName}
                  onChange={(e) => setManualMedicationName(e.target.value)}
                  placeholder="Enter medication name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage
                </label>
                <input
                  type="text"
                  value={manualDosage}
                  onChange={(e) => setManualDosage(e.target.value)}
                  placeholder="e.g., 10mg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  // Handle manual entry submission
                  console.log('Manual entry:', { manualMedicationName, manualDosage });
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Submit Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
} 