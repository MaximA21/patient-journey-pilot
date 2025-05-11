import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { ChevronRight, Save, AlertTriangle, CheckCircle, X, Edit } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Question, MedicalHistoryForm } from "@/types/medicalHistory";

const CONFIDENCE_THRESHOLD = 0.7; // Questions below this confidence need review
const SPECIFIC_FORM_ID = "34c4ba3c-efa9-4dcb-9991-3bbbec7dda99";
const FORM_NAME = "bogen1";

const MedicalHistoryOnboarding: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const { mode } = useAppContext();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [medicalHistoryForm, setMedicalHistoryForm] = useState<MedicalHistoryForm | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [questionsToReview, setQuestionsToReview] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchMedicalHistoryForm();
  }, [patientId]);
  
  const fetchMedicalHistoryForm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Fetching medical history form with id: ${SPECIFIC_FORM_ID}`);
      
      // Use maybeSingle() instead of single() to handle cases where the row might not exist
      const { data: formData, error: formError } = await supabase
        .from('medical_history_form')
        .select('*')
        .eq('id', SPECIFIC_FORM_ID)
        .maybeSingle();
      
      if (formError) {
        console.error("Error fetching specific medical history form:", formError);
        setError(`Failed to fetch medical history form: ${formError.message}`);
        throw new Error(`Failed to fetch medical history form: ${formError.message}`);
      }
      
      if (!formData) {
        console.log("Form not found, creating a new one with empty questions");
        // If the form doesn't exist, create it
        await createMedicalHistoryForm();
        return; // This will trigger a re-fetch
      }
      
      console.log("Successfully fetched medical history form:", formData);
      processFormData(formData);
      
    } catch (error) {
      console.error("Error fetching medical history:", error);
      setError("Failed to load medical history");
      toast.error("Failed to load medical history");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to create the medical history form if it doesn't exist
  const createMedicalHistoryForm = async () => {
    try {
      console.log(`Creating new medical history form with id: ${SPECIFIC_FORM_ID}`);
      
      // Create an empty form with the specific ID
      const { data, error } = await supabase
        .from('medical_history_form')
        .insert({
          id: SPECIFIC_FORM_ID,
          name: FORM_NAME,
          questions: []
        })
        .select();
      
      if (error) {
        console.error("Error creating medical history form:", error);
        setError(`Failed to create medical history form: ${error.message}`);
        throw new Error(`Failed to create medical history form: ${error.message}`);
      }
      
      console.log("Successfully created medical history form:", data);
      
      // If successful, re-fetch the form
      fetchMedicalHistoryForm();
    } catch (error) {
      console.error("Error creating medical history form:", error);
      setError(`Failed to create medical history form: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to create medical history form");
    }
  };
  
  // Process form data and set up the component state
  const processFormData = (formData: any) => {
    // Initialize the medical history form with proper typing
    const form: MedicalHistoryForm = {
      id: formData.id,
      name: formData.name || FORM_NAME,
      questions: Array.isArray(formData.questions) 
        ? formData.questions.map((q: any) => ({
            id: q.id || String(Math.random()),
            text: q.text || "Unknown question",
            answer: q.answer,
            confidence: typeof q.confidence === 'number' ? q.confidence : 0,
            answerType: q.answerType || "string",
            description: q.description,
            source: q.source
          }))
        : []
    };
    
    console.log("Processed medical history form:", form);
    console.log("Total questions:", form.questions.length);
    
    // Filter questions that need review (null answers or low confidence)
    const toReview = form.questions.filter(q => 
      q.answer === null || 
      q.confidence < CONFIDENCE_THRESHOLD
    );
    
    console.log(`Questions that need review: ${toReview.length}`, toReview);
    
    // Initialize user answers with existing answers
    const initialAnswers: Record<string, any> = {};
    toReview.forEach(q => {
      initialAnswers[q.id] = q.answer !== null ? q.answer : "";
    });
    
    setMedicalHistoryForm(form);
    setQuestionsToReview(toReview);
    setUserAnswers(initialAnswers);
  };
  
  const handleAnswerChange = (questionId: string, value: any) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  const handleSaveAnswers = async () => {
    try {
      if (!medicalHistoryForm) return;
      
      setIsSaving(true);
      
      // Update questions with user answers
      const updatedQuestions = [...medicalHistoryForm.questions];
      
      Object.entries(userAnswers).forEach(([questionId, answer]) => {
        const questionIndex = updatedQuestions.findIndex(q => q.id === questionId);
        if (questionIndex !== -1) {
          updatedQuestions[questionIndex] = {
            ...updatedQuestions[questionIndex],
            answer: answer,
            confidence: 1.0, // User-provided answers have 100% confidence
            source: "user-input"
          };
        }
      });
      
      // Convert questions to a format compatible with the database's JSON field
      const databaseQuestions = updatedQuestions.map(q => ({
        ...q,
        // Ensure all properties have appropriate types for JSON storage
        id: q.id,
        text: q.text,
        answer: q.answer,
        confidence: q.confidence,
        answerType: q.answerType,
        description: q.description || null,
        source: q.source || null
      }));
      
      console.log("Saving updated questions:", databaseQuestions);
      
      // Save updated questions to database - using the specific form ID
      const { error } = await supabase
        .from('medical_history_form')
        .update({
          questions: databaseQuestions
        })
        .eq('id', SPECIFIC_FORM_ID);
      
      if (error) {
        console.error("Error saving answers:", error);
        throw new Error(`Failed to save answers: ${error.message}`);
      }
      
      toast.success("Medical history updated successfully");
      
      // Navigate back to patient detail
      setTimeout(() => {
        navigate(`/patients/${patientId}`);
      }, 1000);
      
    } catch (error) {
      console.error("Error saving answers:", error);
      toast.error("Failed to save answers");
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderInputForQuestion = (question: Question) => {
    const answerType = question.answerType?.toLowerCase() || "string";
    
    switch (answerType) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch 
              id={`question-${question.id}`}
              checked={userAnswers[question.id] === true}
              onCheckedChange={(checked) => handleAnswerChange(question.id, checked)}
            />
            <span className="text-sm text-gray-500">
              {userAnswers[question.id] ? "Yes" : "No"}
            </span>
          </div>
        );
        
      case "text":
      case "string":
      default:
        return question.text.includes("history") || question.text.toLowerCase().includes("describe") ? (
          <Textarea
            id={`question-${question.id}`}
            value={userAnswers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={`Enter ${question.text.toLowerCase()}`}
            className="mt-1 w-full"
          />
        ) : (
          <Input
            id={`question-${question.id}`}
            value={userAnswers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={`Enter ${question.text.toLowerCase()}`}
            className="mt-1 w-full"
          />
        );
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-uber-gray-50 flex flex-col">
        <Header title="Medical History Review" showBackButton />
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-uber-gray-50 flex flex-col">
        <Header title="Error" showBackButton />
        <div className="flex-grow p-4 flex flex-col items-center justify-center">
          <Card className="w-full max-w-lg mx-auto">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle size={48} className="text-red-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Medical History Error</h2>
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              <Button
                onClick={() => fetchMedicalHistoryForm()}
                className="mb-4 bg-uber-black text-white w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate(`/patients/${patientId}`)}
                variant="outline"
                className="w-full"
              >
                Return to Patient Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!medicalHistoryForm) {
    return (
      <div className="min-h-screen bg-uber-gray-50 flex flex-col">
        <Header title="No Medical History" showBackButton />
        <div className="flex-grow p-4 flex flex-col items-center justify-center">
          <Card className="w-full max-w-lg mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">No Medical History Found</h2>
              <p className="text-gray-600 mb-6">
                No medical history information is available for this patient.
              </p>
              <Button
                onClick={() => navigate(`/patients/${patientId}`)}
                className="bg-uber-black text-white w-full"
              >
                Return to Patient Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Make sure questionsToReview is defined and properly checked
  if (!questionsToReview || questionsToReview.length === 0) {
    return (
      <div className="min-h-screen bg-uber-gray-50 flex flex-col">
        <Header title="Medical History Complete" showBackButton />
        <div className="flex-grow p-4 flex flex-col items-center justify-center">
          <Card className="w-full max-w-lg mx-auto">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle size={48} className="text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">All Questions Answered</h2>
              <p className="text-gray-600 mb-6">
                All medical history questions have been answered with high confidence.
              </p>
              <Button
                onClick={() => navigate(`/patients/${patientId}`)}
                className="bg-uber-black text-white w-full"
              >
                Return to Patient Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen bg-uber-gray-50 flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Complete Medical History" showBackButton />
      
      <main className="flex-grow p-4">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-amber-500" />
                <div>
                  <h3 className="font-medium text-lg">Please Review Your Medical History</h3>
                  <p className="text-gray-600">
                    {questionsToReview.length} question{questionsToReview.length !== 1 ? 's' : ''} need{questionsToReview.length === 1 ? 's' : ''} your review.
                    Some information was extracted from your documents but needs confirmation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            {questionsToReview.map((question, index) => (
              <Card key={question.id} className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-lg">{question.text}</h4>
                    <span className="flex items-center">
                      <Edit size={16} className="text-gray-400 mr-1" />
                      <span className="text-sm text-gray-500">Review needed</span>
                    </span>
                  </div>
                  
                  {question.description && (
                    <p className="text-gray-600 mb-4 text-sm">{question.description}</p>
                  )}
                  
                  {question.answer !== null && question.confidence < CONFIDENCE_THRESHOLD && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm flex items-start">
                        <AlertTriangle size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Suggested answer:</span>{" "}
                          {question.answer}{" "}
                          <span className="text-gray-500">
                            (confidence: {Math.round(question.confidence * 100)}%)
                          </span>
                        </span>
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <label htmlFor={`question-${question.id}`} className="text-sm font-medium text-gray-700 mb-1 block">
                      Your answer:
                    </label>
                    {renderInputForQuestion(question)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="sticky bottom-4 mt-6 flex justify-end">
            <div className="bg-white p-4 rounded-lg shadow-lg w-full">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/patients/${patientId}`)}
                  className="border-gray-300"
                >
                  Skip for Now
                </Button>
                <Button
                  onClick={handleSaveAnswers}
                  className="bg-uber-black text-white hover:bg-uber-gray-900 flex items-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Answers
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MedicalHistoryOnboarding;
