
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { PlusCircle, Upload, Wine } from "lucide-react";
import { toast } from "sonner";
import { useWineGlassSimulation } from "@/hooks/useWineGlassSimulation";

const ModeSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useAppContext();
  const { isHovering, handleMouseEnter, handleMouseLeave } = useWineGlassSimulation();
  
  const handleModeSelection = (mode: "standard" | "accessibility") => {
    setMode(mode);
    
    if (mode === "accessibility") {
      toast.info("Fine Wine Aged Mode activated.");
      navigate("/accessibility-mode");
    } else {
      navigate("/upload");
    }
  };
  
  return (
    <div className="min-h-screen bg-uber-white flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 fade-in">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-uber-black mb-4">
              MediTake
            </h1>
            <p className="text-uber-gray-600">
              Your healthcare journey made simple
            </p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => handleModeSelection("standard")}
              className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-3"
              size="lg"
            >
              <Upload size={20} />
              Continue in Standard Mode
            </Button>
            
            <Button
              variant="wine-hover"
              onClick={() => handleModeSelection("accessibility")}
              className="w-full h-14 text-base flex items-center justify-center gap-3"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Wine 
                size={20} 
                className={`transition-transform duration-300 ${isHovering ? 'rotate-45 -translate-y-1' : ''}`} 
              />
              Continue in Fine Wine Aged Mode
            </Button>
            
            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-uber-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-uber-gray-500 text-sm">or</span>
              </div>
            </div>
            
            <Button 
              variant="create-patient" 
              onClick={() => navigate("/new-patient")}
              className="w-full h-14 text-base flex items-center justify-center gap-3"
            >
              <PlusCircle size={20} />
              Create New Patient
            </Button>

            <Button 
              variant="outline" 
              onClick={() => navigate("/welcome")}
              className="w-full h-14 text-base flex items-center justify-center gap-3"
            >
              Scan Another Insurance Card
            </Button>
          </div>
        </div>
      </div>
      
      <footer className="py-6 text-center text-uber-gray-500 text-sm border-t border-uber-gray-100">
        <p>© 2025 MediTake Healthcare</p>
      </footer>
    </div>
  );
};

export default ModeSelection;
