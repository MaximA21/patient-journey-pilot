
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Configuration and constants
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Handle CORS preflight requests
 */
function handleCorsPreflightRequest() {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Create an error response with appropriate headers
 */
function createErrorResponse(message: string, status = 400, details?: any) {
  console.error(`Error: ${message}`, details || '');
  return new Response(
    JSON.stringify({ 
      error: message,
      details: details ? (details instanceof Error ? details.message : details) : undefined 
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Create a success response with appropriate headers
 */
function createSuccessResponse(data: any) {
  return new Response(
    JSON.stringify(data),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Fetch patient documents from the database
 */
async function fetchPatientDocuments(patientId: string, documentIds?: string[]) {
  console.log(`Starting document analysis for patient ${patientId}`);

  // Build the base query
  let documentsQuery = supabase
    .from('documents_and_images')
    .select('id, type, llm_output, display_name')
    .eq('patient_id', patientId);
    
  // If document IDs are provided, filter by them
  if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
    documentsQuery = documentsQuery.in('id', documentIds);
    console.log(`Filtering to ${documentIds.length} specific documents`);
  }
  
  const { data: documents, error: documentsError } = await documentsQuery;

  if (documentsError) {
    console.error(`Error fetching documents for patient ${patientId}:`, documentsError);
    throw new Error(`Failed to fetch documents: ${documentsError.message}`);
  }

  console.log(`Found ${documents?.length || 0} documents for patient ${patientId}`);
  return documents || [];
}

/**
 * Fetch medical history form from the database
 */
async function fetchMedicalHistoryForm() {
  const { data: medicalHistoryForm, error: formError } = await supabase
    .from('medical_history_form')
    .select('*')
    .single();

  if (formError) {
    console.error('Error fetching medical history form:', formError);
    throw new Error(`Failed to fetch medical history form: ${formError.message}`);
  }

  if (!medicalHistoryForm || !medicalHistoryForm.questions) {
    throw new Error('Medical history form not found or has no questions');
  }

  console.log(`Retrieved medical history form with ${medicalHistoryForm?.questions?.length || 0} questions`);
  return medicalHistoryForm;
}

/**
 * Prepare document descriptions for AI processing
 */
function prepareDocumentDescriptions(documents) {
  return documents.map(doc => {
    let description = '';
    
    if (doc.display_name) {
      description += `Document Name: ${doc.display_name}\n`;
    }

    if (doc.type) {
      description += `Document Type: ${doc.type}\n`;
    }

    if (doc.llm_output) {
      if (typeof doc.llm_output === 'object' && doc.llm_output.description) {
        description += doc.llm_output.description;
      } else if (typeof doc.llm_output === 'object') {
        description += JSON.stringify(doc.llm_output);
      } else if (typeof doc.llm_output === 'string') {
        description += doc.llm_output;
      }
    }

    return {
      id: doc.id,
      content: description
    };
  });
}

/**
 * Call OpenAI API to analyze documents and extract answers
 */
async function callOpenAIForAnalysis(questions, documentDescriptions) {
  console.log('Calling OpenAI API...');
  
  const systemPrompt = `You are an AI assistant tasked with filling out a patient's questionnaire based on information extracted from their medical documents. You will be provided with a list of questions from the questionnaire and a list of text descriptions, each corresponding to a medical document analyzed from images (such as lab reports, medical history reports, vaccination records, or other relevant records). Your job is to determine which questions can be answered using the information in the document descriptions and provide the answers in a JSON format.`;

  const userPrompt = `Based on the following input, please provide the corresponding JSON output:

Questionnaire: ${JSON.stringify(questions)}

Document descriptions: ${JSON.stringify(documentDescriptions.map(d => d.content))}

Instructions:
- For each question in the questionnaire, search the document descriptions for relevant information that can answer the question.
- Use keyword matching or semantic understanding to identify the appropriate information.
- If you find a match, extract the corresponding value as the answer.
- If a question cannot be answered based on the provided information, include it in the output with a value of null.
- Output should be a JSON object where each key is the question ID, and the value is the answer extracted from the document descriptions or null if no answer was found.
- Include a confidence score (0-1) for each answer indicating how confident you are in the extraction.
- When providing multiple possible answers, separate them with commas.`;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o', // Using an available OpenAI model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Keep it factual and precise
      max_tokens: 4000
    })
  });

  if (!openaiResponse.ok) {
    const errorData = await openaiResponse.text();
    console.error('OpenAI API error status:', openaiResponse.status);
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorData}`);
  }

  const openaiData = await openaiResponse.json();
  console.log('Received response from OpenAI');
  
  return openaiData;
}

/**
 * Parse the OpenAI response to extract the JSON answer
 */
function parseOpenAIResponse(openaiData) {
  // Extract the content from the response
  const responseContent = openaiData.choices[0].message.content;
  console.log('OpenAI raw response:', responseContent);
  
  // Try to parse JSON from the response content
  // First, try to extract a JSON block if it's wrapped in markdown code blocks
  const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                    responseContent.match(/```\s*([\s\S]*?)\s*```/) ||
                    [null, responseContent];
  
  const jsonStr = jsonMatch[1] ? jsonMatch[1].trim() : responseContent.trim();
  const answersJson = JSON.parse(jsonStr);
  
  console.log('Successfully parsed answers JSON');
  return answersJson;
}

/**
 * Update medical history form with extracted answers
 */
async function updateMedicalHistoryForm(medicalHistoryForm, answersJson) {
  const updatedQuestions = medicalHistoryForm.questions.map(q => {
    if (typeof q === 'object' && q.id && answersJson[q.id]) {
      return {
        ...q,
        answer: answersJson[q.id].answer || answersJson[q.id],
        confidence: answersJson[q.id].confidence || 1
      };
    }
    return q;
  });

  const { error: storageError } = await supabase
    .from('medical_history_form')
    .update({ questions: updatedQuestions })
    .eq('id', medicalHistoryForm.id);
    
  if (storageError) {
    console.error('Error storing answers in medical history form:', storageError);
    throw new Error(`Failed to store answers: ${storageError.message}`);
  }
  
  console.log('Successfully stored answers in medical history form');
  return updatedQuestions;
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    // Extract patient ID and optional document IDs from request
    const { patientId, documentIds } = await req.json();
    console.log("Analyzing documents for patient:", patientId);
    console.log("Document IDs provided:", documentIds);

    if (!patientId) {
      return createErrorResponse('Missing patientId parameter');
    }

    // 1. Get processed documents for this patient
    const documents = await fetchPatientDocuments(patientId, documentIds);

    // Check if we have any processed documents
    if (documents.length === 0) {
      return createSuccessResponse({
        success: false,
        message: 'No processed documents found for this patient'
      });
    }

    // 2. Get the medical history form questions
    const medicalHistoryForm = await fetchMedicalHistoryForm();

    // 3. Prepare questions list from medical history form
    const questions = medicalHistoryForm.questions;

    // 4. Prepare document descriptions list
    const documentDescriptions = prepareDocumentDescriptions(documents);

    // 5. Call OpenAI API
    const openaiData = await callOpenAIForAnalysis(questions, documentDescriptions);

    // 6. Extract the JSON response and validate it
    let answersJson;
    try {
      answersJson = parseOpenAIResponse(openaiData);
      
      // 7. Store the results in the medical_history_form table
      await updateMedicalHistoryForm(medicalHistoryForm, answersJson);
      
    } catch (e) {
      console.error('Error parsing or storing OpenAI response:', e);
      throw new Error(`Failed to process answers from OpenAI response: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 8. Return the processed results
    return createSuccessResponse({
      success: true,
      patientId,
      documentCount: documents.length,
      answers: answersJson
    });
    
  } catch (error) {
    console.error('Error analyzing patient documents:', error);
    
    return createErrorResponse(
      'Failed to analyze patient documents',
      500,
      error
    );
  }
});
