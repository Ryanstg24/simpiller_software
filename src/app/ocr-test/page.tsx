'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle, XCircle, AlertTriangle, Loader2, FlaskConical, Smartphone } from 'lucide-react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OCRService, { OCRResult, MedicationLabelData } from '@/lib/ocr';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useUserDisplay } from '@/hooks/use-user-display';

export default function OCRTestPage() {
  const userInfo = useUserDisplay();
  const [imageData, setImageData] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [labelData, setLabelData] = useState<MedicationLabelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(false);

  // Expected medication data for validation
  const [expectedMedication, setExpectedMedication] = useState({
    medicationName: '',
    dosage: '',
    patientName: '',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if user is on mobile
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    // Check browser compatibility for camera
    const checkCameraSupport = () => {
      const supported = typeof navigator !== 'undefined' && 
                       navigator.mediaDevices && 
                       typeof navigator.mediaDevices.getUserMedia === 'function' && 
                       (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
      setIsCameraSupported(supported);
    };
    
    checkMobile();
    checkCameraSupport();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsCameraActive(true);
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser or requires HTTPS connection.');
      }
      
      // Check if we're on HTTPS (required for camera access)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS connection. Please use HTTPS or localhost.');
      }
      
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Fix for play() interrupted error - wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(error => {
              console.error('Video play error:', error);
              // Don't show error for interrupted play requests
              if (error.name !== 'AbortError') {
                setCameraError('Failed to start video playback. Please try again.');
              }
            });
          }
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('HTTPS') || error.message.includes('not supported')) {
          setCameraError(
            'Camera access requires HTTPS connection or is not supported in this browser.\n\n' +
            'Please ensure you are using:\n' +
            '• HTTPS connection\n' +
            '• A modern browser (Chrome, Firefox, Safari, Edge)\n' +
            '• Or use the file upload option instead'
          );
        } else if (error.name === 'NotAllowedError') {
          if (isMobile) {
            // Mobile-specific permission instructions
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);
            
            if (isIOS) {
              setCameraError(
                'Camera access denied. To enable camera:\n\n' +
                '1. Tap the camera icon in your browser\'s address bar\n' +
                '2. Select "Allow"\n' +
                '3. Or go to Settings → Safari → Camera → Allow\n' +
                '4. Refresh the page and try again'
              );
            } else if (isAndroid) {
              setCameraError(
                'Camera access denied. To enable camera:\n\n' +
                '1. Tap the camera icon in your browser\'s address bar\n' +
                '2. Select "Allow"\n' +
                '3. Or go to Settings → Apps → [Your Browser] → Permissions → Camera → Allow\n' +
                '4. Refresh the page and try again'
              );
            } else {
              setCameraError(
                'Camera access denied. Please allow camera permissions in your browser settings and try again.'
              );
            }
          } else {
            setCameraError(
              'Camera access denied. Please allow camera permissions in your browser settings and try again.'
            );
          }
        } else if (error.name === 'NotFoundError') {
          setCameraError('No camera found on your device.');
        } else if (error.name === 'NotReadableError') {
          setCameraError('Camera is already in use by another application.');
        } else {
          setCameraError('Failed to access camera. Please check your device settings.');
        }
      } else {
        setCameraError('Failed to access camera. Please check your device settings.');
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setImageData(imageDataUrl);
    
    // Stop camera after capture
    stopCamera();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageData(result);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessImage = async () => {
    if (!imageData) {
      alert('No image data available. Please select an image first.');
      return;
    }

    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      alert('Invalid image format. Please select a valid image file.');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Starting OCR processing...');
      console.log('Image data length:', imageData.length);
      console.log('Image data format:', imageData.substring(0, 50));
      
      // Test Tesseract availability
      try {
        const TesseractModule = await import('tesseract.js');
        console.log('Tesseract module loaded:', TesseractModule);
        const Tesseract = TesseractModule.default || TesseractModule;
        console.log('Tesseract object:', Tesseract);
      } catch (importError) {
        console.error('Failed to import Tesseract:', importError);
        throw new Error('OCR library failed to load. Please refresh the page.');
      }
      
      const result = await OCRService.extractTextFromImage(imageData);
      console.log('OCR result:', result);
      setOcrResult(result);

      const parsed = OCRService.parseMedicationLabel(result);
      console.log('Parsed label data:', parsed);
      setLabelData(parsed);
    } catch (error) {
      console.error('OCR processing error:', error);
      
      // Show more detailed error information
      let errorMessage = 'Failed to process image. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid image data')) {
          errorMessage = 'Invalid image format. Please select a valid image file.';
        } else if (error.message.includes('Failed to load')) {
          errorMessage = 'OCR library failed to load. Please refresh the page and try again.';
        } else if (error.message.includes('OCR engine failed to initialize')) {
          errorMessage = 'OCR engine failed to initialize. Please refresh the page and try again.';
        } else if (error.message.includes('OCR extraction failed')) {
          errorMessage = 'OCR text extraction failed. The image may be unclear or contain no readable text.';
        } else {
          errorMessage = `OCR Error: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setImageData(null);
    setOcrResult(null);
    setLabelData(null);
    setCameraError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin']}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-72">
          <Header title="OCR Test" />
          <main className="py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">OCR Test Page</h1>
                <p className="text-gray-600">
                  Test OCR functionality for medication label scanning
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left Column - Image Input */}
                <div className="space-y-4">
                  {/* Image Input Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-base">
                        <FlaskConical className="mr-2 h-4 w-4" />
                        Image Input
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Camera Section */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Camera className="h-4 w-4 text-blue-600" />
                          <Label className="text-sm font-medium">Camera Capture</Label>
                        </div>
                        
                        {!isCameraActive && !imageData && (
                          <div className="space-y-2">
                            {isCameraSupported ? (
                              <Button
                                onClick={startCamera}
                                className="w-full sm:w-auto"
                                disabled={isProcessing}
                                size="sm"
                              >
                                <Camera className="mr-2 h-4 w-4" />
                                Start Camera
                              </Button>
                            ) : (
                              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                <div className="flex items-start">
                                  <AlertTriangle className="h-3 w-3 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-yellow-700">
                                    <div className="font-medium mb-1">Camera Not Available</div>
                                    <div className="text-xs">
                                      {typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' 
                                        ? 'Camera access requires HTTPS connection. Please use HTTPS or localhost.'
                                        : 'Camera access is not supported in this browser. Please use file upload instead.'
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {cameraError && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-start">
                              <AlertTriangle className="h-3 w-3 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-red-700 flex-1">
                                <div className="font-medium mb-1">Camera Access Required</div>
                                <div className="whitespace-pre-line text-xs leading-relaxed">
                                  {cameraError}
                                </div>
                                {isMobile && (
                                  <div className="mt-2 p-1 bg-red-100 rounded text-xs">
                                    <strong>Quick Fix:</strong> Look for a camera icon in your browser's address bar and tap "Allow"
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex space-x-2">
                              <Button
                                onClick={startCamera}
                                size="sm"
                                className="text-xs"
                              >
                                Try Again
                              </Button>
                              <Button
                                onClick={() => setCameraError(null)}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        )}

                        {isCameraActive && (
                          <div className="space-y-2">
                            <div className="relative">
                              <video
                                ref={videoRef}
                                className="w-full max-w-sm mx-auto rounded-lg border border-gray-300"
                                autoPlay
                                playsInline
                                muted
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="border-2 border-white rounded-lg p-2 bg-black bg-opacity-50">
                                  <div className="w-32 h-20 border-2 border-white rounded"></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={captureImage}
                                className="flex-1"
                                variant="default"
                                size="sm"
                              >
                                <Camera className="mr-2 h-4 w-4" />
                                Capture
                              </Button>
                              <Button
                                onClick={stopCamera}
                                className="flex-1"
                                variant="outline"
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* File Upload Section */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Upload className="h-4 w-4 text-green-600" />
                          <Label className="text-sm font-medium">File Upload</Label>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          onClick={() => {
                            setImageData('/label_test.jpg');
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Load Test Image (label_test.jpg)
                        </Button>
                      </div>

                      {/* Display Captured/Uploaded Image */}
                      {imageData && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Preview</Label>
                          <div className="relative">
                            <img
                              src={imageData}
                              alt="Captured medication label"
                              className="w-full max-w-sm mx-auto rounded-lg border border-gray-300"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleProcessImage}
                              disabled={isProcessing}
                              className="flex-1"
                              size="sm"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <FlaskConical className="mr-2 h-4 w-4" />
                                  Process Image
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleReset}
                              variant="outline"
                              className="flex-1"
                              size="sm"
                            >
                              Reset
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Expected Data Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-base">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Expected Medication Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">Medication Name</Label>
                        <Input
                          value={expectedMedication.medicationName}
                          onChange={(e) => setExpectedMedication(prev => ({ ...prev, medicationName: e.target.value }))}
                          placeholder="e.g., Lisinopril"
                          className="mt-1 text-gray-900"
                          size={20}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-900">Dosage</Label>
                        <Input
                          value={expectedMedication.dosage}
                          onChange={(e) => setExpectedMedication(prev => ({ ...prev, dosage: e.target.value }))}
                          placeholder="e.g., 10mg"
                          className="mt-1 text-gray-900"
                          size={20}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-900">Patient Name</Label>
                        <Input
                          value={expectedMedication.patientName}
                          onChange={(e) => setExpectedMedication(prev => ({ ...prev, patientName: e.target.value }))}
                          placeholder="e.g., John Doe"
                          className="mt-1 text-gray-900"
                          size={20}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Results */}
                <div className="space-y-4">
                  {/* OCR Raw Results */}
                  {ocrResult && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-base">
                          <FlaskConical className="mr-2 h-4 w-4" />
                          OCR Raw Results
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-900">Extracted Text:</Label>
                            <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm font-mono whitespace-pre-wrap text-gray-900 max-h-32 overflow-y-auto">
                              {ocrResult.text}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-900">Confidence:</Label>
                            <div className="mt-1 text-sm text-gray-900">
                              {(ocrResult.confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Parsed Label Data */}
                  {labelData && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-base">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Parsed Label Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm text-gray-900">
                          {labelData.medicationName && (
                            <div>
                              <strong>Medication:</strong> {labelData.medicationName}
                            </div>
                          )}
                          {labelData.dosage && (
                            <div>
                              <strong>Dosage:</strong> {labelData.dosage}
                            </div>
                          )}
                          {labelData.patientName && (
                            <div>
                              <strong>Patient:</strong> {labelData.patientName}
                            </div>
                          )}
                          {labelData.instructions && (
                            <div>
                              <strong>Instructions:</strong> {labelData.instructions}
                            </div>
                          )}
                          {labelData.pharmacy && (
                            <div>
                              <strong>Pharmacy:</strong> {labelData.pharmacy}
                            </div>
                          )}
                          {labelData.prescriber && (
                            <div>
                              <strong>Prescriber:</strong> {labelData.prescriber}
                            </div>
                          )}
                          <div>
                            <strong>Confidence:</strong> {(labelData.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Validation Results */}
                  {labelData && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-base">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Validation Results
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const validation = OCRService.validateMedicationLabel(labelData, expectedMedication);
                          return (
                            <div className="space-y-2">
                              <div className={`flex items-center ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                                {validation.isValid ? (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                <span className="font-medium text-sm">
                                  {validation.isValid ? 'Valid Match' : 'Invalid Match'}
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm text-gray-900">
                                <div>
                                  <strong>Overall Score:</strong> {validation.score}/{Object.keys(validation.matches).length}
                                </div>
                                <div>
                                  <strong>Confidence:</strong> {(validation.confidence * 100).toFixed(1)}%
                                </div>
                                
                                <div className="mt-2 space-y-1">
                                  <div className={`flex items-center ${validation.matches.medicationName ? 'text-green-600' : 'text-red-600'}`}>
                                    {validation.matches.medicationName ? '✓' : '✗'} Medication Name
                                  </div>
                                  <div className={`flex items-center ${validation.matches.dosage ? 'text-green-600' : 'text-red-600'}`}>
                                    {validation.matches.dosage ? '✓' : '✗'} Dosage
                                  </div>
                                  <div className={`flex items-center ${validation.matches.patientName ? 'text-green-600' : 'text-red-600'}`}>
                                    {validation.matches.patientName ? '✓' : '✗'} Patient Name
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Mobile Instructions */}
              {isMobile && (
                <Card className="mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-base">
                      <Smartphone className="mr-2 h-4 w-4" />
                      Mobile Testing Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="font-medium text-blue-900 mb-1">📱 Camera Permissions</div>
                        <div className="space-y-1 text-xs">
                          <div className="mb-1 p-1 bg-blue-100 rounded">
                            <strong>⚠️ Important:</strong> Camera access requires HTTPS connection or localhost
                          </div>
                          <p><strong>iOS (Safari):</strong></p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>Ensure you're using HTTPS or localhost</li>
                            <li>Tap the camera icon in the address bar</li>
                            <li>Select "Allow" when prompted</li>
                            <li>Or go to Settings → Safari → Camera → Allow</li>
                          </ul>
                          <p className="mt-1"><strong>Android (Chrome):</strong></p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>Ensure you're using HTTPS or localhost</li>
                            <li>Tap the camera icon in the address bar</li>
                            <li>Select "Allow" when prompted</li>
                            <li>Or go to Settings → Apps → Chrome → Permissions → Camera</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p><strong>1.</strong> Allow camera permissions when prompted</p>
                        <p><strong>2.</strong> Use the back camera for better image quality</p>
                        <p><strong>3.</strong> Hold the medication label steady and well-lit</p>
                        <p><strong>4.</strong> Ensure text is clear and readable in the preview</p>
                        <p><strong>5.</strong> If camera access is denied, check your device settings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </ProtectedRoute>
  );
} 