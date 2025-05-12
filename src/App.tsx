
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import ModeSelection from "./pages/ModeSelection";
import DocumentUpload from "./pages/DocumentUpload";
import SuccessPage from "./pages/SuccessPage";
import NewPatient from "./pages/NewPatient";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AccessibilityMode from "./pages/AccessibilityMode";
import AccessibilityCamera from "./pages/AccessibilityCamera";
import MedicalHistoryOnboarding from "./pages/MedicalHistoryOnboarding";
import InsuranceCardScan from "./pages/InsuranceCardScan";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/welcome" element={<InsuranceCardScan />} />
              <Route path="/" element={<Navigate to="/welcome" replace />} />
              <Route path="/mode-selection" element={<ProtectedRoute><ModeSelection /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><DocumentUpload /></ProtectedRoute>} />
              <Route path="/success" element={<ProtectedRoute><SuccessPage /></ProtectedRoute>} />
              <Route path="/new-patient" element={<ProtectedRoute><NewPatient /></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
              <Route path="/patients/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
              <Route path="/medical-history/:id" element={<ProtectedRoute><MedicalHistoryOnboarding /></ProtectedRoute>} />
              <Route path="/accessibility-mode" element={<ProtectedRoute><AccessibilityMode /></ProtectedRoute>} />
              <Route path="/accessibility-camera" element={<ProtectedRoute><AccessibilityCamera /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
