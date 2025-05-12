
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";

const InsuranceCardScan: React.FC = () => {
  const navigate = useNavigate();
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start the camera
  const startCamera = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera. Please check permissions.");
      setCapturing(false);
    }
  };

  // Capture image from camera
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL("image/jpeg");
        setImageSrc(imageDataUrl);
        
        // Stop the camera stream
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        setCapturing(false);
      }
    }
  };

  // Reset the camera
  const resetCamera = () => {
    setImageSrc(null);
    startCamera();
  };

  // Process the captured image
  const processImage = async () => {
    if (!imageSrc) return;
    
    setProcessing(true);
    toast.info("Processing insurance card...");
    
    try {
      // Convert data URL to blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      
      // Upload to Supabase
      const fileName = `insurance-card-${Date.now()}.jpg`;
      const filePath = `insurance-cards/${fileName}`;
      
      // Create storage bucket if it doesn't exist
      const { error: storageError } = await supabase.storage.createBucket('insurance-cards', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      }).catch(() => ({ error: null })); // Ignore error if bucket already exists

      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('insurance-cards')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('insurance-cards')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      
      // Call the edge function to process the insurance card
      const { data, error } = await supabase.functions.invoke('process-insurance-card', {
        body: { image_url: publicUrl }
      });
      
      if (error) {
        throw new Error(`Processing failed: ${error.message}`);
      }

      if (data && data.patient) {
        toast.success("Insurance card processed successfully!");

        // Create the patient using extracted data
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .insert([data.patient])
          .select();

        if (patientError) {
          throw new Error(`Patient creation failed: ${patientError.message}`);
        }

        // Navigate to the mode selection page
        navigate("/");
      } else {
        throw new Error("Could not extract patient data from the insurance card");
      }
    } catch (error) {
      console.error("Error processing insurance card:", error);
      toast.error(`Could not process insurance card: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-uber-gray-50 flex flex-col">
      <div className="bg-uber-black text-white p-4 text-center shadow-md">
        <h1 className="text-2xl font-bold">Scan Health Insurance Card</h1>
        <p className="text-sm text-uber-gray-300">Position your card within the frame</p>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-white overflow-hidden">
          {/* Camera or captured image view */}
          <div className="relative aspect-[1.586] w-full bg-uber-gray-900 flex items-center justify-center overflow-hidden">
            {capturing ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="w-full h-full object-cover"
              />
            ) : imageSrc ? (
              <img 
                src={imageSrc} 
                alt="Captured insurance card" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-uber-gray-500">
                <Camera size={48} className="mx-auto mb-2" />
                <p>Press the button below to start the camera</p>
              </div>
            )}
            
            {/* Canvas for image capture (hidden) */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay for card alignment */}
            {capturing && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white border-dashed rounded-md"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-opacity-70 text-xs">
                  Align card within the frame
                </div>
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="p-4 space-y-4">
            {!capturing && !imageSrc && (
              <Button
                onClick={startCamera}
                className="w-full bg-uber-black hover:bg-uber-gray-800"
                size="lg"
              >
                <Camera className="mr-2" size={18} />
                Start Camera
              </Button>
            )}
            
            {capturing && (
              <Button
                onClick={captureImage}
                className="w-full bg-uber-red hover:bg-red-700"
                size="lg"
              >
                Capture
              </Button>
            )}
            
            {imageSrc && (
              <div className="flex flex-col gap-3">
                <Button
                  onClick={processImage}
                  className="w-full bg-uber-black hover:bg-uber-gray-800"
                  size="lg"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>Process Card</>
                  )}
                </Button>
                
                <Button
                  onClick={resetCamera}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={processing}
                >
                  <RotateCw className="mr-2" size={18} />
                  Retake Photo
                </Button>
              </div>
            )}
          </div>
        </Card>
        
        <p className="text-sm text-uber-gray-600 mt-6 text-center max-w-md">
          Please ensure the card details are clearly visible. All information will be processed securely.
        </p>
      </div>
    </div>
  );
};

export default InsuranceCardScan;
