'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Smartphone,
  Monitor
} from "lucide-react";

interface ScanResult {
  success: boolean;
  message: string;
  medicationData?: any;
}

export default function ScanPage() {
  const params = useParams();
  const scanId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isMobile, setIsMobile] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
  }, []);

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this device');
      }

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);
      setCameraPermission('granted');

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

    } catch (err) {
      console.error('Camera access error:', err);
      setCameraPermission('denied');
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera access is not supported on this device.');
        } else {
          setError(`Camera access error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Simulate barcode scanning (replace with actual barcode scanning library)
  const simulateScan = () => {
    setIsLoading(true);
    
    // Simulate scanning delay
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for testing
      
      if (success) {
        setScanResult({
          success: true,
          message: 'Medication scanned successfully!',
          medicationData: {
            name: 'Test Medication',
            dosage: '500mg',
            lotNumber: 'LOT123456',
            expiryDate: '2025-12-31'
          }
        });
      } else {
        setScanResult({
          success: false,
          message: 'Could not read barcode. Please try again.'
        });
      }
      
      setIsLoading(false);
      stopCamera();
    }, 2000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-center">
              <Camera className="mr-2 h-6 w-6 text-blue-600" />
              Medication Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Scan ID: {scanId}
            </p>
          </CardContent>
        </Card>

        {/* Device Type Indicator */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2">
              {isMobile ? (
                <>
                  <Smartphone className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Mobile Device Detected</span>
                </>
              ) : (
                <>
                  <Monitor className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Desktop Device</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Camera Permission Section */}
        {cameraPermission === 'unknown' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Camera Access Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">Camera Permission</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        This app needs camera access to scan medication barcodes. 
                        {isMobile && ' On mobile devices, you may need to allow camera access in your browser settings.'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={requestCameraPermission}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Requesting Camera Access...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Allow Camera Access
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Camera Denied */}
        {cameraPermission === 'denied' && (
          <Card className="mb-6 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="text-lg font-medium text-red-900">Camera Access Denied</h3>
              </div>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">To enable camera access:</p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Click the camera icon in your browser's address bar</li>
                  <li>Select "Allow" for camera access</li>
                  <li>Refresh this page</li>
                </ul>
              </div>
              <Button 
                onClick={requestCameraPermission}
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Camera Active */}
        {cameraPermission === 'granted' && !scanResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Scan Medication Barcode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Video Preview */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 border-2 border-white border-dashed rounded-lg pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-32 h-32 border-2 border-white rounded-lg"></div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Position the medication barcode within the frame above
                  </p>
                  <Button 
                    onClick={simulateScan}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Scan Barcode
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scan Result */}
        {scanResult && (
          <Card className={`mb-6 ${scanResult.success ? 'border-green-200' : 'border-red-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                {scanResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                )}
                <h3 className={`text-lg font-medium ${scanResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {scanResult.success ? 'Scan Successful!' : 'Scan Failed'}
                </h3>
              </div>
              
              <p className={`mb-4 ${scanResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {scanResult.message}
              </p>

              {scanResult.success && scanResult.medicationData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Medication Details:</h4>
                  <div className="space-y-1 text-sm text-green-800">
                    <p><strong>Name:</strong> {scanResult.medicationData.name}</p>
                    <p><strong>Dosage:</strong> {scanResult.medicationData.dosage}</p>
                    <p><strong>Lot Number:</strong> {scanResult.medicationData.lotNumber}</p>
                    <p><strong>Expiry Date:</strong> {scanResult.medicationData.expiryDate}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <Button 
                  onClick={() => {
                    setScanResult(null);
                    setCameraPermission('unknown');
                    setError(null);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Scan Another Medication
                </Button>
                <Button 
                  onClick={() => window.close()}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hidden canvas for barcode processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
