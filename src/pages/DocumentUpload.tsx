
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext, Document } from "@/context/AppContext";
import { uploadDocument, processDocument } from "@/lib/supabase";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Upload, X, ImagePlus, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Constants for Supabase URLs - using full URLs to avoid env variables
const SUPABASE_URL = "https://rkjqdxywsdikcywxggde.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJranFkeHl3c2Rpa2N5d3hnZ2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIwOTAsImV4cCI6MjA2MjQ0ODA5MH0.mR6mCEhgr_K_WEoZ2v_5j8AdG1jxh3pp1Nk7A4mKx44";

// Hardcoded patient ID as requested
const FIXED_PATIENT_ID = "0ea5b69f-95cd-4dae-80f7-199922da2924";

const DocumentUpload: React.FC = () => {
  const { mode, addUploadedDocument } = useAppContext();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{id: number, url: string}>>([]);
  const [processingComplete, setProcessingComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract patient ID from URL search params or use fixed ID
  const queryParams = new URLSearchParams(location.search);
  const urlPatientId = queryParams.get('patientId');
  const patientId = FIXED_PATIENT_ID; // Always use the fixed patient ID
  
  // If in accessibility mode, redirect to home
  useEffect(() => {
    if (mode === "accessibility") {
      toast.error("File uploads are not available in Fine Wine Aged Mode");
      navigate("/");
    }
  }, [mode, navigate]);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Generate previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one document to upload");
      return;
    }
    
    setIsLoading(true);
    setUploadedDocs([]);
    
    try {
      const uploadedDocuments: Array<{id: number, url: string}> = [];
      
      // Upload each file
      for (const file of files) {
        // Always pass the fixed patient ID
        const result = await uploadDocument(file, patientId);
        if (result.success && result.data && result.data[0]) {
          const documentId = result.data[0].id;
          const documentUrl = result.url;
          
          uploadedDocuments.push({
            id: documentId,
            url: documentUrl
          });
          
          const documentObj: Document = {
            id: documentId.toString(),
            url: result.url,
            name: file.name
          };
          
          addUploadedDocument(documentObj);
          
          // Let the user know we're processing the document
          toast.info(`Processing document: ${file.name}`);
          
          // Process the document
          try {
            const processResult = await processDocument(documentId, documentUrl);
            
            if (processResult.success) {
              toast.success(`Document ${file.name} processed successfully`);
            } else {
              toast.error(`Error processing document ${file.name}: ${processResult.error}`);
            }
          } catch (processError) {
            console.error(`Error processing document ${documentId}:`, processError);
            toast.error(`Failed to process document ${file.name}`);
          }
        } else {
          throw new Error(`Failed to upload document: ${file.name}`);
        }
      }
      
      setUploadedDocs(uploadedDocuments);
      
      // If documents were uploaded, trigger document analysis
      if (uploadedDocuments.length > 0) {
        const documentIds = uploadedDocuments.map(doc => doc.id);
        await triggerDocumentAnalysis(patientId, documentIds);
      }
      
      toast.success("Documents uploaded successfully!");
      setProcessingComplete(true);
      
      // Navigate after a delay to allow user to see the success message
      setTimeout(() => {
        if (patientId) {
          navigate(`/patients/${patientId}`);
        } else {
          navigate("/success");
        }
      }, 2000);
      
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to trigger document analysis
  const triggerDocumentAnalysis = async (patientId: string, documentIds: number[]) => {
    try {
      toast.info("Analyzing documents...");
      
      console.log("Calling complete-uploads with:", { patientId, documentIds });
      
      // Make a direct fetch call to the complete-uploads endpoint
      const response = await fetch(`${SUPABASE_URL}/functions/v1/complete-uploads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          patientId,
          documentIds
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to analyze documents: ${error}`);
      }
      
      const result = await response.json();
      console.log("Document analysis response:", result);
      
      if (result.success) {
        toast.success("Document analysis complete!");
      } else if (result.message === "Some documents still processing") {
        // Some documents are still processing
        toast.info(`${result.processedCount} of ${result.processedCount + result.unprocessedCount} documents processed`);
        
        // Set up a retry after a delay
        setTimeout(() => {
          triggerDocumentAnalysis(patientId, documentIds);
        }, 5000); // 5 seconds
      } else {
        toast.error("Document analysis failed");
      }
      
      return result;
    } catch (error) {
      console.error("Error analyzing documents:", error);
      toast.error(`Failed to analyze documents: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, error };
    }
  };
  
  // If in accessibility mode, don't render the upload UI
  if (mode === "accessibility") {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-uber-gray-50 flex flex-col">
      <Header title="Upload Documents" showBackButton />
      
      {isLoading && <LoadingSpinner />}
      
      <main className="flex-grow p-4">
        <div className="w-full max-w-md mx-auto space-y-5">
          <Card className="p-6 bg-white border-0 shadow-sm rounded-lg">
            <h2 className="font-semibold text-uber-black mb-5 text-xl">
              Upload Medical Documents
            </h2>
            
            <p className="text-uber-gray-600 mb-6">
              Please upload your medical documents, prescriptions, or test results.
              These will be linked to patient ID: {patientId}
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
              multiple
            />
            
            {previews.length === 0 ? (
              <div className="mb-6">
                <div className="border-2 border-dashed border-uber-gray-200 bg-uber-gray-50 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-uber-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FileText size={28} className="text-uber-gray-500" />
                  </div>
                  
                  <h3 className="text-lg font-medium text-uber-gray-800 mb-2">
                    No documents uploaded
                  </h3>
                  
                  <p className="text-uber-gray-500 mb-6 max-w-xs">
                    Upload your medical records, prescriptions, or test results to share with your healthcare provider
                  </p>
                  
                  <Button 
                    onClick={triggerFileInput}
                    className="bg-uber-black text-white hover:bg-uber-gray-900 h-12 flex items-center justify-center gap-3 transition-colors w-full md:w-auto px-6"
                    type="button"
                  >
                    <ImagePlus size={20} />
                    Choose Files
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                <h3 className="font-medium text-lg">
                  Document Preview
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-uber-gray-100">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-uber-black bg-opacity-70 text-white rounded-full p-1.5 hover:bg-opacity-100 transition-colors"
                        aria-label="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={triggerFileInput}
                    className="bg-uber-gray-100 text-uber-black hover:bg-uber-gray-200 h-12 flex items-center justify-center gap-3 transition-colors"
                    type="button"
                    variant="outline"
                  >
                    <ImagePlus size={20} />
                    Add More Files
                  </Button>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-uber-gray-100">
              <Button
                onClick={handleSubmit}
                className={`w-full h-14 text-white rounded-md hover:bg-uber-gray-900 text-base flex items-center justify-center gap-3 ${
                  processingComplete ? "bg-green-600 hover:bg-green-700" : "bg-uber-black"
                }`}
                disabled={files.length === 0 || isLoading}
              >
                {processingComplete ? (
                  <>
                    <CheckCircle size={20} />
                    Documents Processed
                  </>
                ) : isLoading ? (
                  "Processing..."
                ) : (
                  <>
                    <Upload size={20} />
                    Upload Documents
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DocumentUpload;
