
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

// Fixed patient ID to use for all uploads - CRITICAL TO KEEP CONSISTENT
const FIXED_PATIENT_ID = "0ea5b69f-95cd-4dae-80f7-199922da2924";

const DocumentUpload: React.FC = () => {
  const { mode, addUploadedDocument } = useAppContext();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{id: number, url: string}>>([]);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [createdFormId, setCreatedFormId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
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
        console.log(`Uploading file with patient ID: ${FIXED_PATIENT_ID}`);
        
        // Always explicitly pass the fixed patient ID
        const result = await uploadDocument(file, FIXED_PATIENT_ID);
        
        if (result.success && result.data && result.data[0]) {
          const documentId = result.data[0].id;
          const documentUrl = result.url;
          
          // Verify patient_id was set correctly
          if (!result.data[0].patient_id || result.data[0].patient_id !== FIXED_PATIENT_ID) {
            console.error("WARNING: patient_id incorrect or missing after upload. Attempting to fix...");
            
            // Fix the patient_id with an explicit update
            const { error: updateError } = await supabase
              .from('documents_and_images')
              .update({ patient_id: FIXED_PATIENT_ID })
              .eq('id', documentId);
              
            if (updateError) {
              console.error("Failed to fix patient_id:", updateError);
            } else {
              console.log("Successfully fixed patient_id");
            }
          }
          
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
      
      // CRITICAL: Always verify and fix document patient IDs
      await verifyDocumentPatientIds(uploadedDocuments.map(doc => doc.id));
      
      // If documents were uploaded, trigger document analysis
      if (uploadedDocuments.length > 0) {
        const documentIds = uploadedDocuments.map(doc => doc.id);
        const analysisResult = await triggerDocumentAnalysis(FIXED_PATIENT_ID, documentIds);
        
        // Check if a form ID was returned from the analysis
        if (analysisResult && analysisResult.formId) {
          console.log("Received form ID from complete-uploads:", analysisResult.formId);
          setCreatedFormId(analysisResult.formId);
          
          // Navigate to the medical history onboarding with the new form ID
          setTimeout(() => {
            if (analysisResult.formId) {
              navigate(`/medical-history/${FIXED_PATIENT_ID}?formId=${analysisResult.formId}`);
            } else {
              navigate(`/medical-history/${FIXED_PATIENT_ID}`);
            }
          }, 2000);
        } else {
          console.error("No form ID returned from complete-uploads");
          toast.error("Failed to create medical history form. Please try again.");
        }
      }
      
      toast.success("Documents uploaded successfully!");
      setProcessingComplete(true);
      
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to verify document patient IDs - ENHANCED for reliability
  const verifyDocumentPatientIds = async (documentIds: number[]) => {
    try {
      // First attempt - check if patient IDs are set correctly
      const { data, error } = await supabase
        .from('documents_and_images')
        .select('id, patient_id')
        .in('id', documentIds);
        
      if (error) {
        console.error("Error verifying document patient IDs:", error);
        return;
      }
      
      console.log("Document patient IDs:", data);
      
      // Check if any documents don't have the correct patient ID
      const docsWithoutPatientId = data?.filter(doc => 
        doc.patient_id !== FIXED_PATIENT_ID || doc.patient_id === null
      ) || [];
      
      if (docsWithoutPatientId.length > 0) {
        console.log(`Found ${docsWithoutPatientId.length} documents without correct patient ID, fixing...`);
        
        // Fix the patient_id for these documents with an explicit update
        try {
          const { error: updateError } = await supabase
            .from('documents_and_images')
            .update({ patient_id: FIXED_PATIENT_ID })
            .in('id', docsWithoutPatientId.map(doc => doc.id));
            
          if (updateError) {
            console.error("Error fixing document patient IDs:", updateError);
          } else {
            console.log("Successfully fixed document patient IDs");
            
            // Double-check that the updates actually worked
            const { data: verifyData, error: verifyError } = await supabase
              .from('documents_and_images')
              .select('id, patient_id')
              .in('id', docsWithoutPatientId.map(doc => doc.id));
              
            if (verifyError) {
              console.error("Error verifying document patient ID fixes:", verifyError);
            } else {
              const stillWrong = verifyData?.filter(doc => doc.patient_id !== FIXED_PATIENT_ID) || [];
              if (stillWrong.length > 0) {
                console.error(`CRITICAL: ${stillWrong.length} documents STILL have incorrect patient_id!`);
              } else {
                console.log('Verified: All documents now have correct patient_id');
              }
            }
          }
        } catch (e) {
          console.error("Exception fixing patient IDs:", e);
        }
      }
    } catch (error) {
      console.error("Error in verifyDocumentPatientIds:", error);
    }
  };
  
  // Function to trigger document analysis
  const triggerDocumentAnalysis = async (patientId: string, documentIds: number[]) => {
    try {
      toast.info("Analyzing documents...");
      
      console.log("Calling complete-uploads with:", { patientId, documentIds });
      
      // Make a direct call to the complete-uploads edge function
      const { data, error } = await supabase.functions.invoke('complete-uploads', {
        body: {
          patientId,
          documentIds
        }
      });
      
      if (error) {
        console.error("Error invoking complete-uploads:", error);
        throw error;
      }
      
      console.log("Document analysis response:", data);
      
      if (data.success) {
        toast.success("Document analysis complete!");
        
        // If a form was created, save its ID
        if (data.formId) {
          console.log("Setting form ID:", data.formId);
          setCreatedFormId(data.formId);
          return data;
        } else {
          console.error("No form ID in successful response");
        }
      } else if (data.message === "Some documents still processing") {
        // Some documents are still processing
        toast.info(`${data.processedCount} of ${data.processedCount + data.unprocessedCount} documents processed`);
        
        // Set the form ID if it was returned
        if (data.formId) {
          console.log("Setting form ID from partial processing:", data.formId);
          setCreatedFormId(data.formId);
        } else {
          console.error("No form ID in partial processing response");
        }
        
        // Set up a retry after a delay
        setTimeout(() => {
          triggerDocumentAnalysis(patientId, documentIds);
        }, 5000); // 5 seconds
      } else {
        toast.error("Document analysis failed");
        console.error("Document analysis failed:", data.error || "Unknown error");
      }
      
      return data;
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
              These will be linked to patient ID: {FIXED_PATIENT_ID}
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
