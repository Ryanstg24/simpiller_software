'use client';

import { useState, useRef, useEffect } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Send, 
  CheckCircle, 
  XCircle,
  Camera,
  Upload,
  AlertTriangle,
  Loader2,
  FlaskConical,
  Smartphone,
  Video,
  Image as ImageIcon
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import Image from 'next/image';

interface TestOCRResponse {
  success: boolean;
  message: string;
  testMode: boolean;
  scanLink: string;
  pillBottle: {
    medicationName: string;
    dosage: string;
    patientName: string;
    scheduledTime: string;
    scanMethod: 'single_image' | 'multiple_images' | 'video_capture';
  };
  ocrResults?: {
    extractedText: string;
    confidence: number;
    parsedData: any;
  };
}

export default function OCRPBTestPage() {
  const userInfo = useUserDisplay();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestOCRResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    medicationName: 'Lisinopril',
    dosage: '10mg',
    patientName: 'John Doe',
    scheduledTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    scanMethod: 'single_image' as 'single_image' | 'multiple_images' | 'video_capture',
    testDescription: 'Testing pill bottle OCR with cylindrical label scanning',
  });

  // Image capture state
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStep, setCaptureStep] = useState<'left' | 'middle' | 'right' | 'complete'>('left');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if user is on mobile
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser or requires HTTPS connection.');
      }
      
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
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(error => {
              console.error('Video play error:', error);
            });
          }
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError(error instanceof Error ? error.message : 'Failed to access camera');
      setIsCapturing(false);
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
    setIsCapturing(false);
    setCaptureStep('left');
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    setCapturedImages(prev => [...prev, imageDataUrl]);
    
    // Move to next step
    if (captureStep === 'left') {
      setCaptureStep('middle');
    } else if (captureStep === 'middle') {
      setCaptureStep('right');
    } else if (captureStep === 'right') {
      setCaptureStep('complete');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newImages.push(result);
        if (newImages.length === files.length) {
          setCapturedImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('🚀 OCR PB Test submitted!');
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestData = {
        medicationName: formData.medicationName,
        dosage: formData.dosage,
        patientName: formData.patientName,
        scheduledTime: formData.scheduledTime,
        scanMethod: formData.scanMethod,
        testDescription: formData.testDescription,
        capturedImages: capturedImages,
      };
      
      console.log('📤 Sending request to /api/ocr-pb/test with data:', requestData);
      
      const response = await fetch('/api/ocr-pb/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 Response received:', response.status, response.statusText);
      const data = await response.json();
      console.log('📋 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process OCR test');
      }

      setResult(data);
    } catch (err) {
      console.error('💥 Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      medicationName: 'Lisinopril',
      dosage: '10mg',
      patientName: 'John Doe',
      scheduledTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      scanMethod: 'single_image',
      testDescription: 'Testing pill bottle OCR with cylindrical label scanning',
    });
    setCapturedImages([]);
    setResult(null);
    setError(null);
    setCaptureStep('left');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCaptureStepText = () => {
    switch (captureStep) {
      case 'left': return 'Capture Left Side';
      case 'middle': return 'Capture Middle';
      case 'right': return 'Capture Right Side';
      case 'complete': return 'All Images Captured';
      default: return 'Start Capture';
    }
  };

  const getCaptureStepDescription = () => {
    switch (captureStep) {
      case 'left': return 'Position the pill bottle so the left side of the label is visible';
      case 'middle': return 'Rotate the bottle to show the middle section of the label';
      case 'right': return 'Rotate the bottle to show the right side of the label';
      case 'complete': return 'All three angles captured. You can now process the images.';
      default: return 'Start capturing images of the pill bottle label';
    }
  };

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/ocr-pb-test" />
        
        <div className="flex-1 overflow-auto">
          <Header 
            title="OCR PB Testing" 
            subtitle="Test pill bottle OCR functionality for cylindrical labels"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            <div className="max-w-4xl mx-auto">
              {/* Page Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-black">OCR Pill Bottle Testing Console</h1>
                <p className="text-gray-600 mt-2">
                  Test pill bottle OCR functionality for cylindrical labels. This tool helps develop scanning methods for curved surfaces.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Test Configuration */}
                <div className="space-y-6">
                  {/* Test Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FlaskConical className="mr-2 h-5 w-5 text-black" />
                        Test Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="medicationName" className="text-black">Expected Medication Name</Label>
                          <Input
                            id="medicationName"
                            value={formData.medicationName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('medicationName', e.target.value)}
                            placeholder="Lisinopril"
                            required
                            className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                          />
                        </div>

                        <div>
                          <Label htmlFor="dosage" className="text-black">Expected Dosage</Label>
                          <Input
                            id="dosage"
                            value={formData.dosage}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('dosage', e.target.value)}
                            placeholder="10mg"
                            required
                            className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                          />
                        </div>

                        <div>
                          <Label htmlFor="patientName" className="text-black">Expected Patient Name</Label>
                          <Input
                            id="patientName"
                            value={formData.patientName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('patientName', e.target.value)}
                            placeholder="John Doe"
                            required
                            className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                          />
                        </div>

                        <div>
                          <Label htmlFor="scheduledTime" className="text-black">Expected Scheduled Time</Label>
                          <Input
                            id="scheduledTime"
                            type="datetime-local"
                            value={formData.scheduledTime}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('scheduledTime', e.target.value)}
                            required
                            className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                          />
                        </div>

                        <div>
                          <Label htmlFor="scanMethod" className="text-black">Scan Method</Label>
                          <select
                            id="scanMethod"
                            value={formData.scanMethod}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('scanMethod', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                          >
                            <option value="single_image">Single Image (Front View)</option>
                            <option value="multiple_images">Multiple Images (Left, Middle, Right)</option>
                            <option value="video_capture">Video Capture (Rotating)</option>
                          </select>
                          <p className="text-sm text-gray-500 mt-1">
                            Choose the scanning method to test
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="testDescription" className="text-black">Test Description</Label>
                          <Input
                            id="testDescription"
                            value={formData.testDescription}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('testDescription', e.target.value)}
                            placeholder="Describe what you're testing..."
                            className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button 
                            type="submit" 
                            disabled={isLoading || capturedImages.length === 0}
                            className="flex-1 bg-black hover:bg-gray-800 text-white"
                          >
                            {isLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Run OCR Test
                              </>
                            )}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={handleReset}
                          >
                            Reset
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Image Capture Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Camera className="mr-2 h-5 w-5 text-black" />
                        Image Capture
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Camera Section */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Camera className="h-4 w-4 text-blue-600" />
                          <Label className="text-sm font-medium">Camera Capture</Label>
                        </div>
                        
                        {!isCapturing && (
                          <Button
                            onClick={startCamera}
                            className="w-full"
                            disabled={isLoading}
                            size="sm"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Start Camera
                          </Button>
                        )}

                        {isCapturing && (
                          <div className="space-y-3">
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
                            
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                {getCaptureStepText()}
                              </p>
                              <p className="text-xs text-gray-500 mb-3">
                                {getCaptureStepDescription()}
                              </p>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                onClick={captureImage}
                                className="flex-1"
                                variant="default"
                                size="sm"
                                disabled={captureStep === 'complete'}
                              >
                                <Camera className="mr-2 h-4 w-4" />
                                {captureStep === 'complete' ? 'Complete' : 'Capture'}
                              </Button>
                              <Button
                                onClick={stopCamera}
                                className="flex-1"
                                variant="outline"
                                size="sm"
                              >
                                Stop
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
                          multiple
                          onChange={handleFileUpload}
                          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">
                          Upload multiple images for different angles of the pill bottle
                        </p>
                      </div>

                      {/* Captured Images Preview */}
                      {capturedImages.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Captured Images ({capturedImages.length})</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {capturedImages.map((image, index) => (
                              <div key={index} className="relative">
                                <Image 
                                  src={image} 
                                  alt={`Captured image ${index + 1}`}
                                  width={150}
                                  height={100}
                                  className="w-full rounded-lg border border-gray-300"
                                />
                                <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                  {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Results */}
                <div className="space-y-6">
                  {/* Error Display */}
                  {error && (
                    <Card className="border-red-200">
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <XCircle className="h-5 w-5 text-red-500 mr-2" />
                          <h3 className="text-lg font-medium text-red-900">Error</h3>
                        </div>
                        <p className="text-red-700 mt-2">{error}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Results Display */}
                  {result && (
                    <Card className="border-green-200">
                      <CardContent className="p-6">
                        <div className="flex items-center mb-4">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <h3 className="text-lg font-medium text-green-900">Test Complete!</h3>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Status:</p>
                            <p className="text-green-700">{result.message}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700">Test Mode:</p>
                            <p className="text-gray-900">{result.testMode ? 'Enabled' : 'Disabled'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700">Scan Method:</p>
                            <p className="text-gray-900 capitalize">{result.pillBottle.scanMethod.replace('_', ' ')}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700">Scan Link:</p>
                            <a 
                              href={result.scanLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {result.scanLink}
                            </a>
                          </div>
                          
                          {result.testMode && (
                            <div className="bg-gray-50 p-4 rounded-md">
                              <p className="text-sm font-medium text-gray-700 mb-2">Test Configuration:</p>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Medication:</strong> {result.pillBottle.medicationName}</p>
                                <p><strong>Dosage:</strong> {result.pillBottle.dosage}</p>
                                <p><strong>Patient:</strong> {result.pillBottle.patientName}</p>
                                <p><strong>Time:</strong> {new Date(result.pillBottle.scheduledTime).toLocaleString()}</p>
                                <p><strong>Method:</strong> {result.pillBottle.scanMethod.replace('_', ' ')}</p>
                              </div>
                            </div>
                          )}

                          {result.ocrResults && (
                            <div className="bg-blue-50 p-4 rounded-md">
                              <p className="text-sm font-medium text-gray-700 mb-2">OCR Results:</p>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Confidence:</strong> {(result.ocrResults.confidence * 100).toFixed(1)}%</p>
                                <p><strong>Extracted Text:</strong></p>
                                <div className="bg-white p-2 rounded border text-xs font-mono max-h-20 overflow-y-auto">
                                  {result.ocrResults.extractedText}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Mobile Instructions */}
                  {isMobile && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-base">
                          <Smartphone className="mr-2 h-4 w-4" />
                          Mobile Testing Instructions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="font-medium text-blue-900 mb-1">Pill Bottle Scanning Tips</div>
                            <div className="space-y-1 text-xs">
                              <div className="p-1 bg-blue-100 rounded">
                                <strong>Multiple Images:</strong> Capture left, middle, and right sides of the label
                              </div>
                              <div className="p-1 bg-blue-100 rounded">
                                <strong>Lighting:</strong> Ensure good lighting on the curved surface
                              </div>
                              <div className="p-1 bg-blue-100 rounded">
                                <strong>Distance:</strong> Keep the bottle at a consistent distance
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p><strong>1.</strong> Allow camera permissions when prompted</p>
                            <p><strong>2.</strong> Use the back camera for better image quality</p>
                            <p><strong>3.</strong> Rotate the pill bottle slowly to capture different angles</p>
                            <p><strong>4.</strong> Ensure text is clear and readable in each capture</p>
                            <p><strong>5.</strong> Test different lighting conditions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </ProtectedRoute>
  );
}
