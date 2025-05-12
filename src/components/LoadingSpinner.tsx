
import React from "react";
import { useAppContext } from "@/context/AppContext";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "md", className = "" }) => {
  const { mode } = useAppContext();
  
  // Determine spinner size based on prop
  const spinnerSizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4"
  };
  
  // If it's a fullscreen spinner
  if (!className) {
    return (
      <div className="fixed inset-0 bg-uber-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`bg-white p-6 rounded-lg shadow-lg flex flex-col items-center ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
          <div className={`${spinnerSizeClasses[size]} rounded-full border-uber-gray-200 border-t-uber-black animate-spin mb-4`}></div>
          <p className={`text-uber-black ${mode === "accessibility" ? "text-xl" : "text-base"}`}>
            Processing...
          </p>
        </div>
      </div>
    );
  }
  
  // If it's an inline spinner
  return (
    <div className={`${spinnerSizeClasses[size]} rounded-full border-uber-gray-200 border-t-uber-black animate-spin ${className}`}></div>
  );
};

export default LoadingSpinner;
