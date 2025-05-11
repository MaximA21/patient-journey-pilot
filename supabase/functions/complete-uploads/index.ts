
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract data from request
    const { patientId, documentIds } = await req.json();
    
    if (!patientId || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing patientId or documentIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing completed uploads for patient ${patientId}, ${documentIds.length} documents`);
    
    // Verify all uploads are processed
    const { data: documents, error: documentsError } = await supabase
      .from('documents_and_images')
      .select('id, type, llm_output')
      .in('id', documentIds)
      .eq('patient_id', patientId);
      
    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      throw new Error(`Failed to fetch documents: ${documentsError.message}`);
    }
    
    // Check if all uploads have been processed
    const unprocessedDocuments = documents.filter(doc => 
      !doc.type || !doc.llm_output);
    
    if (unprocessedDocuments.length > 0) {
      console.log(`${unprocessedDocuments.length} documents still processing`);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Some documents still processing',
          unprocessedCount: unprocessedDocuments.length,
          unprocessedIds: unprocessedDocuments.map(doc => doc.id),
          processedCount: documents.length - unprocessedDocuments.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // All uploads are processed, trigger the analysis
    console.log('All documents processed, triggering analysis');
    
    // Call the document analysis function using fetch directly to the URL
    const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-patient-documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ patientId })
    });
    
    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json().catch(() => ({}));
      console.error('Analysis function error:', errorData);
      throw new Error(`Failed to trigger analysis: ${analysisResponse.status} ${analysisResponse.statusText}`);
    }
    
    const analysisResult = await analysisResponse.json();
    
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
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
