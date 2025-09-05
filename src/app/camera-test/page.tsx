'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OCRService, { OCRResult, MedicationLabelData } from '@/lib/ocr';
import Image from 'next/image';

export default function CameraTestPage() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [labelData, setLabelData] = useState<MedicationLabelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera functions
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
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Force video to load and play - iOS Safari specific
        const video = videoRef.current;
        
        // Wait for metadata to load before playing
        video.onloadedmetadata = () => {
          console.log('📺 Video metadata loaded');
          console.log('📺 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
          video.play().then(() => {
            console.log('▶️ Video started playing');
          }).catch((playError) => {
            console.error('❌ Video play error:', playError);
            // Try to play again after a short delay
            setTimeout(() => {
              video.play().catch(console.error);
            }, 100);
          });
        };
        
        video.oncanplay = () => {
          console.log('▶️ Video can play');
        };
        
        video.onerror = (e) => {
          console.error('❌ Video error:', e);
        };

        // Force load the video
        video.load();
      }
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
    if (!imageData) return;
    
    setIsProcessing(true);
    try {
      console.log('🔍 Starting OCR processing...');
      
      // Create a test medication validation
      const testMedication = 'VALACYCLOVIR HYDROCHLORID,VENLAFAXINE HCL ER';
      
      const result = await OCRService.extractTextFromImage(imageData);
      console.log('📄 OCR Result:', result);
      
      setOcrResult(result);
      
      // Parse the medication label
      const parsed = OCRService.parseMedicationLabel(result);
      console.log('💊 Parsed medication data:', parsed);
      
      setLabelData(parsed);
      
      // Simulate validation
      const validation = {
        isValid: parsed.medicationNames?.some(med => 
          testMedication.toLowerCase().includes(med.toLowerCase())
        ) || false,
        confidence: result.confidence / 100,
        expectedMedication: testMedication,
        foundMedication: parsed.medicationName
      };
      
      console.log('✅ Validation result:', validation);
      
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTest = () => {
    setImageData(null);
    setOcrResult(null);
    setLabelData(null);
    setIsCameraActive(false);
    setCameraError(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">📱 Camera Test Page</h1>
          <p className="text-gray-600 mb-4">
            Test the camera functionality for medication scanning
          </p>
          
          {/* Device Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Device:</strong> {navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Other'} | 
              <strong> HTTPS:</strong> {location.protocol === 'https:' ? 'Yes' : 'No'} |
              <strong> User Agent:</strong> {navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}
            </p>
          </div>
        </div>

        {/* Scan Method Selection */}
        {!imageData && !isCameraActive && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">How would you like to test?</h3>
            <div className="space-y-3">
              <Button
                onClick={startCamera}
                className="w-full flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Camera className="h-5 w-5 text-blue-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Live Camera Preview</div>
                  <div className="text-sm text-gray-600">See live camera feed and capture</div>
                </div>
              </Button>
              
              <label className="w-full flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <Camera className="h-5 w-5 text-purple-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Native Camera</div>
                  <div className="text-sm text-gray-600">Use iOS camera app (fallback)</div>
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
            
            {/* iOS Safari specific note */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>iOS Safari Users:</strong> Try &quot;Live Camera Preview&quot; first. If the camera doesn&apos;t show, 
                use &quot;Native Camera&quot; which opens the iOS camera app.
              </p>
            </div>
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
                  transform: 'scaleX(-1)', // Mirror the video for better UX
                  minHeight: '256px',
                  backgroundColor: '#000'
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
                📸 Capture & Test
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
            <div className="flex space-x-3 mt-4">
              <Button
                onClick={processImage}
                disabled={isProcessing}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    🔍 Test OCR
                  </>
                )}
              </Button>
              <Button
                onClick={resetTest}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* OCR Results */}
        {ocrResult && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">OCR Results</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Extracted Text:</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {ocrResult.text}
                </div>
                <p className="text-xs text-gray-500 mt-1">Confidence: {ocrResult.confidence}%</p>
              </div>

              {labelData && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Parsed Medication Data:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Medication:</span>
                      <span className="text-sm font-medium">{labelData.medicationName}</span>
                    </div>
                    {labelData.dosage && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Dosage:</span>
                        <span className="text-sm font-medium">{labelData.dosage}</span>
                      </div>
                    )}
                    {labelData.instructions && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Instructions:</span>
                        <span className="text-sm font-medium">{labelData.instructions}</span>
                      </div>
                    )}
                    {labelData.prescriber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Prescriber:</span>
                        <span className="text-sm font-medium">{labelData.prescriber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Test Instructions */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Instructions</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. <strong>Live Camera Preview:</strong> Should show live video feed with scanning overlay</p>
            <p>2. <strong>Native Camera:</strong> Opens iOS camera app for photo capture</p>
            <p>3. <strong>Upload Photo:</strong> Choose from photo library</p>
            <p>4. <strong>OCR Test:</strong> Processes image and extracts medication data</p>
            <p>5. <strong>Check Console:</strong> Open Safari Developer Tools to see detailed logs</p>
          </div>
        </div>
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
