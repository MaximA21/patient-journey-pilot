
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Hardcoded patient ID to use for all documents
const DEFAULT_PATIENT_ID = "0ea5b69f-95cd-4dae-80f7-199922da2924";

// Default questions template for medical history forms
const DEFAULT_QUESTIONS = [
  {
    "id": "allergies",
    "text": "Do you have any allergies?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "medications",
    "text": "What medications are you currently taking?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "surgeries",
    "text": "Have you had any surgeries?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "conditions",
    "text": "Do you have any chronic medical conditions?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "family_history",
    "text": "Do you have any significant family medical history?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "vacination",
    "text": "Do you have any vacinations?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract data from request
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Received request body:", JSON.stringify(requestBody));
    } catch (e) {
      console.error("Error parsing JSON:", e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract parameters from the request body
    const { documentIds } = requestBody;
    
    // Always use the hardcoded patient ID
    const usePatientId = DEFAULT_PATIENT_ID;
    
    if (!usePatientId || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      console.error("Missing or invalid patientId or documentIds");
      return new Response(
        JSON.stringify({ error: 'Missing or invalid patientId or documentIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing completed uploads for patient ${usePatientId}, ${documentIds.length} documents`);
    
    // First, ensure all documents have the correct patient_id - THIS IS THE KEY FIX
    console.log(`Updating patient_id for all documents to: ${usePatientId}`);
    
    // Update ALL documents in the list regardless of current patient_id value
    const { data: updateResult, error: updateError } = await supabase
      .from('documents_and_images')
      .update({ patient_id: usePatientId })
      .in('id', documentIds);
      
    if (updateError) {
      console.error('Error updating document patient IDs:', updateError);
      throw updateError;
    } else {
      console.log(`Updated patient_id for documents: ${updateResult ? 'Success' : 'No updates needed'}`);
    }
    
    // Verify all uploads are processed and have the correct patient_id
    const { data: documents, error: documentsError } = await supabase
      .from('documents_and_images')
      .select('id, type, llm_output, patient_id')
      .in('id', documentIds);
      
    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      throw new Error(`Failed to fetch documents: ${documentsError.message}`);
    }
    
    console.log("Found documents:", documents?.length || 0);
    
    // Check if documents have the correct patient_id
    const docsWithWrongPatientId = documents?.filter(doc => 
      doc.patient_id !== usePatientId) || [];
      
    if (docsWithWrongPatientId.length > 0) {
      console.log(`${docsWithWrongPatientId.length} documents have incorrect patient_id, fixing...`);
      
      // Fix the patient_id for these documents - more aggressive fixing
      try {
        const { error: fixError } = await supabase
          .from('documents_and_images')
          .update({ patient_id: usePatientId })
          .in('id', docsWithWrongPatientId.map(doc => doc.id));
          
        if (fixError) {
          console.error('Error fixing document patient IDs:', fixError);
          throw fixError;
        } else {
          console.log('Successfully fixed document patient IDs');
        }
      } catch (e) {
        console.error('Exception fixing document patient IDs:', e);
        throw e;
      }
    }
    
    // Additional verification - check if any documents STILL have incorrect patient_id
    const { data: verifyDocs, error: verifyError } = await supabase
      .from('documents_and_images')
      .select('id, patient_id')
      .in('id', documentIds);
      
    if (verifyError) {
      console.error('Error verifying documents:', verifyError);
    } else {
      const stillWrong = verifyDocs?.filter(doc => doc.patient_id !== usePatientId) || [];
      if (stillWrong.length > 0) {
        console.error(`CRITICAL: ${stillWrong.length} documents STILL have incorrect patient_id!`);
      } else {
        console.log('Verified: All documents now have correct patient_id');
      }
    }
    
    // Create a new medical history form record with default questions for this upload session
    console.log("Creating new medical history form with default questions");
    const formName = `Form-${new Date().toISOString()}`;
    
    const { data: newForm, error: formError } = await supabase
      .from('medical_history_form')
      .insert({
        name: formName,
        questions: DEFAULT_QUESTIONS
      })
      .select('id')
      .single();
    
    if (formError) {
      console.error('Error creating medical history form:', formError);
      // Continue processing even if form creation fails
    } else {
      console.log(`Successfully created medical history form with ID: ${newForm.id}`);
    }
    
    // Check if all uploads have been processed
    const unprocessedDocuments = documents?.filter(doc => 
      !doc.type || !doc.llm_output) || [];
    
    console.log("Unprocessed documents:", unprocessedDocuments.length);
    
    if (unprocessedDocuments.length > 0) {
      console.log(`${unprocessedDocuments.length} documents still processing`);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Some documents still processing',
          unprocessedCount: unprocessedDocuments.length,
          unprocessedIds: unprocessedDocuments.map(doc => doc.id),
          processedCount: (documents?.length || 0) - unprocessedDocuments.length,
          formId: newForm?.id // Include the newly created form ID
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // All uploads are processed, trigger the analysis
    console.log('All documents processed, triggering analysis');
    
    // Call the document analysis function using fetch directly to the URL
    const analysisUrl = `${supabaseUrl}/functions/v1/analyze-patient-documents`;
    console.log(`Calling analysis function at: ${analysisUrl}`);
    
    const analysisResponse = await fetch(analysisUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        patientId: usePatientId,
        documentIds,
        formId: newForm?.id // Pass the newly created form ID to the analysis function
      })
    });
    
    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Analysis function error status:', analysisResponse.status);
      console.error('Analysis function error:', errorText);
      throw new Error(`Failed to trigger analysis: ${analysisResponse.status} ${errorText}`);
    }
    
    const analysisResult = await analysisResponse.json();
    console.log("Analysis result:", analysisResult);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'All uploads processed and analysis completed',
        analysisResult,
        formId: newForm?.id // Include the newly created form ID
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing completed uploads:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to process completed uploads',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
