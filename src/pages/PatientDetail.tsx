
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Mail, MapPin, Calendar, Heart, FileText, ClipboardList, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Question } from "@/types/medicalHistory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CONFIDENCE_THRESHOLD = 0.7; // Questions below this confidence need review

interface Patient {
  id: string;
  name: string;
  surname: string;
  birthdate: string;
  gender: number;
  email: string;
  phone: string;
  street: string;
  city: string;
  plz: number;
  country: string;
  height: number;
  weight: number;
  insurance_provider: string;
  insurance_number: number;
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { mode } = useAppContext();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [medicalHistoryNeeded, setMedicalHistoryNeeded] = useState(false);
  const [medicalHistoryQuestions, setMedicalHistoryQuestions] = useState<Question[]>([]);
  const [latestFormId, setLatestFormId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPatientDetails() {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setPatient(data);

        // Fetch medical history information
        await fetchMedicalHistory();
      } catch (error) {
        console.error("Error fetching patient details:", error);
        toast.error("Error fetching patient details");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatientDetails();
  }, [id]);

  const fetchMedicalHistory = async () => {
    try {
      // Get the most recent medical history form for this patient
      // Using order by id descending and limit 1 to ensure we get the latest form only
      const { data, error } = await supabase
        .from('medical_history_form')
        .select('*')
        .order('id', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Error fetching medical history forms:", error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log("No medical history forms found");
        setMedicalHistoryNeeded(true);
        return;
      }
      
      const latestForm = data[0];
      console.log("Latest medical history form:", latestForm);
      
      if (latestForm && latestForm.id) {
        setLatestFormId(latestForm.id);
      }
      
      if (latestForm && latestForm.questions && Array.isArray(latestForm.questions)) {
        // Map the questions from JSON to our Question type
        const typedQuestions: Question[] = latestForm.questions.map((q: any) => ({
          id: q.id || String(Math.random()),
          text: q.text || "Unknown question",
          answer: q.answer,
          confidence: typeof q.confidence === 'number' ? q.confidence : 0,
          answerType: q.answerType || "string",
          description: q.description,
          source: q.source
        }));
        
        console.log("Typed questions:", typedQuestions);
        
        // Check if there are questions that need review
        const questionsNeedingReview = typedQuestions.filter(q => 
          q.answer === null || q.confidence < CONFIDENCE_THRESHOLD
        );
        
        console.log("Questions needing review:", questionsNeedingReview.length);
        console.log("Specific questions needing review:", questionsNeedingReview);
        
        setMedicalHistoryQuestions(typedQuestions);
        setMedicalHistoryNeeded(questionsNeedingReview.length > 0);
      } else {
        console.warn("Medical history data is not in expected format:", latestForm);
        setMedicalHistoryNeeded(true); // If data format is incorrect, we need to fix it
      }
    } catch (error) {
      console.error("Error checking medical history:", error);
      setMedicalHistoryNeeded(true); // If error occurred, we need to review the medical history
    }
  };

  const getGenderLabel = (gender: number) => {
    const genders = ["Female", "Male", "Non-binary", "Other"];
    return genders[gender] || "Not specified";
  };

  const navigateToMedicalHistory = () => {
    if (latestFormId) {
      navigate(`/medical-history/${id}?formId=${latestFormId}`);
    } else {
      // If no form ID is available, navigate without it
      // The medical history page will show an appropriate message
      navigate(`/medical-history/${id}`);
    }
  };

  const getSourceLabel = (source: string | null) => {
    if (!source) return "Not specified";
    if (source.toLowerCase().includes("ai") || source.toLowerCase().includes("openai")) {
      return "AI Generated";
    }
    if (source.toLowerCase().includes("user")) {
      return "User Input";
    }
    return source;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return "Very High";
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.5) return "Medium";
    if (confidence > 0) return "Low";
    return "None";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-uber-gray-50 flex flex-col">
        <Header title="Patient Details" showBackButton />
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-uber-gray-50 flex flex-col">
        <Header title="Patient Not Found" showBackButton />
        <div className="flex-grow flex items-center justify-center flex-col p-4">
          <div className="text-center">
            <h2 className="text-2xl font-medium text-uber-gray-800 mb-4">Patient not found</h2>
            <p className="text-uber-gray-600 mb-6">The patient you're looking for doesn't exist or has been removed.</p>
            <Button 
              onClick={() => navigate("/patients")}
              className="bg-uber-black text-white hover:bg-uber-gray-800"
            >
              Return to Patients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-uber-gray-50 flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Patient Details" showBackButton />
      
      <main className="flex-grow p-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`font-semibold text-uber-black ${mode === "accessibility" ? "text-2xl" : "text-xl"}`}>
              {patient?.name} {patient?.surname}
            </h2>
            <Button 
              onClick={() => navigate("/upload")}
              className="bg-uber-black text-white hover:bg-uber-gray-800"
            >
              <FileText size={16} className="mr-2" />
              Upload Documents
            </Button>
          </div>
          
          {medicalHistoryNeeded && (
            <Card className="bg-amber-50 border border-amber-200 mb-6">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <AlertTriangle size={20} className="text-amber-500 mr-3" />
                  <div>
                    <h3 className="font-medium text-uber-gray-900">Medical history needs review</h3>
                    <p className="text-sm text-uber-gray-700">Some information is missing or has low confidence</p>
                  </div>
                </div>
                <Button 
                  onClick={navigateToMedicalHistory}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Complete History <ChevronRight size={16} className="ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-5">
            {/* Personal Information */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <User size={20} className="text-uber-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Full Name</p>
                        <p className="font-medium">{patient.name} {patient.surname}</p>
                      </div>
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Gender</p>
                        <p className="font-medium">{getGenderLabel(patient.gender)}</p>
                      </div>
                      <div className="py-2 flex items-center gap-2">
                        <Calendar size={16} className="text-uber-gray-500" />
                        <div>
                          <p className="text-sm text-uber-gray-500">Date of Birth</p>
                          <p className="font-medium">{new Date(patient.birthdate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Contact Information */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Phone size={20} className="text-uber-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                      <div className="py-2 flex items-center gap-2">
                        <Phone size={16} className="text-uber-gray-500" />
                        <div>
                          <p className="text-sm text-uber-gray-500">Phone</p>
                          <p className="font-medium">{patient.phone}</p>
                        </div>
                      </div>
                      <div className="py-2 flex items-center gap-2">
                        <Mail size={16} className="text-uber-gray-500" />
                        <div>
                          <p className="text-sm text-uber-gray-500">Email</p>
                          <p className="font-medium">{patient.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <MapPin size={20} className="text-uber-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg">Address</h3>
                    <div className="mt-3">
                      <p className="font-medium">{patient.street}</p>
                      <p className="font-medium">{patient.plz} {patient.city}</p>
                      <p className="font-medium">{patient.country}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Heart size={20} className="text-uber-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Height</p>
                        <p className="font-medium">{patient.height} cm</p>
                      </div>
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Weight</p>
                        <p className="font-medium">{patient.weight} kg</p>
                      </div>
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Insurance Provider</p>
                        <p className="font-medium">{patient.insurance_provider}</p>
                      </div>
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Insurance Number</p>
                        <p className="font-medium">{patient.insurance_number}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Medical History */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <ClipboardList size={20} className="text-uber-gray-600 mt-1" />
                  <div className="w-full">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-lg">Medical History</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={navigateToMedicalHistory}
                        className="text-sm"
                      >
                        {medicalHistoryNeeded ? "Complete" : "View/Edit"}
                      </Button>
                    </div>
                    
                    {medicalHistoryQuestions.length > 0 ? (
                      <div className="mt-3">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Question</TableHead>
                              <TableHead>Answer</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Confidence</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {medicalHistoryQuestions.map(question => (
                              <TableRow key={question.id} className={question.confidence < CONFIDENCE_THRESHOLD ? "bg-amber-50" : ""}>
                                <TableCell>{question.text}</TableCell>
                                <TableCell>{question.answer !== null ? String(question.answer) : "No answer"}</TableCell>
                                <TableCell>{getSourceLabel(question.source)}</TableCell>
                                <TableCell>
                                  {question.confidence > 0 && (
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      question.confidence >= CONFIDENCE_THRESHOLD 
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-amber-100 text-amber-800"
                                    }`}>
                                      {getConfidenceLabel(question.confidence)}
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        
                        {medicalHistoryNeeded && (
                          <div className="text-amber-600 text-sm mt-4 flex items-center">
                            <AlertTriangle size={14} className="mr-1" />
                            Some information needs review - click "Complete" to address items with low confidence
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-uber-gray-500 mt-2">
                        No medical history information available yet.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDetail;
