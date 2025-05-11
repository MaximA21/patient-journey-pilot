
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Camera, AlertTriangle } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const AccessibilityMode: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  
  const handleStartCamera = async () => {
    try {
      // Show warning dialog instead of immediately requesting camera
      setShowWarning(true);
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };
  
  const handleProceed = async () => {
    try {
      // Close the warning dialog
      setShowWarning(false);
      
      // Request camera access
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      // If access granted, navigate to camera view
      navigate("/accessibility-camera");
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Unable to access camera. Please make sure you've granted permission."
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-uber-white flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Fine Wine Aged Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center mb-4">
              This mode is designed for users who prefer a simpler, more accessible experience.
            </p>
            
            <div className="space-y-4 text-uber-gray-700">
              <p>
                <strong>• Camera-Based Assistance:</strong> We'll use your device's camera to help you read and identify your medications.
              </p>
              <p>
                <strong>• Clear Visual Guidance:</strong> Larger text and high contrast displays make information easier to read.
              </p>
              <p>
                <strong>• Simplified Navigation:</strong> Fewer steps and clearer instructions to complete your tasks.
              </p>
              <p>
                <strong>• Voice Assistance:</strong> Get help through audio guidance (coming soon).
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleStartCamera}
              className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-3"
              size="lg"
            >
              <Camera size={20} />
              Start Camera Assistance
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={20} className="text-amber-600" />
              Limited Availability Notice
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <div className="space-y-4 py-3">
              <p className="font-medium text-uber-gray-800">
                Due to token constraints, the Fine Wine Aged Mode is only available locally.
              </p>
              <p className="text-uber-gray-600">
                Please reach out to a developer or check out our GitHub repository if you want to fully test this mode.
              </p>
            </div>
          </DialogDescription>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowWarning(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProceed}
              className="bg-uber-black text-white"
            >
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <footer className="py-6 text-center text-uber-gray-500 text-sm border-t border-uber-gray-100">
        <p>© 2025 MediTake Healthcare</p>
      </footer>
    </div>
  );
};

export default AccessibilityMode;
