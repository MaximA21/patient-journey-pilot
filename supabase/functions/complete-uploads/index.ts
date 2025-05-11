
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

// Hardcoded patient ID to use as default
const DEFAULT_PATIENT_ID = "0ea5b69f-95cd-4dae-80f7-199922da2924";

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
    const { patientId = DEFAULT_PATIENT_ID, documentIds } = requestBody;
    console.log("Extracted patientId:", patientId, "and documentIds:", documentIds);
    
    // Always use the default patient ID if none provided or invalid
    const usePatientId = patientId || DEFAULT_PATIENT_ID;
    
    if (!usePatientId || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      console.error("Missing or invalid patientId or documentIds");
      return new Response(
        JSON.stringify({ error: 'Missing or invalid patientId or documentIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing completed uploads for patient ${usePatientId}, ${documentIds.length} documents`);
    
    // Verify all uploads are processed
    const { data: documents, error: documentsError } = await supabase
      .from('documents_and_images')
      .select('id, type, llm_output')
      .in('id', documentIds)
      .eq('patient_id', usePatientId);
      
    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      throw new Error(`Failed to fetch documents: ${documentsError.message}`);
    }
    
    console.log("Found documents:", documents?.length || 0);
    
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
          processedCount: (documents?.length || 0) - unprocessedDocuments.length
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
        documentIds 
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
        analysisResult
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
