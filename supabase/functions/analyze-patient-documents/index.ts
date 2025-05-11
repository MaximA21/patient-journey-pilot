import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { DEFAULT_QUESTIONS } from "../../../src/types/medicalHistory.ts";

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
async function fetchPatientDocuments(patientId: string, documentIds?: number[]) {
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
 * Create a medical history form with structured questions
 */
async function createMedicalHistoryForm() {
  console.log('Creating a new medical history form');

  // Use the updated DEFAULT_QUESTIONS constant from the imported module
  const templateQuestions = DEFAULT_QUESTIONS;

  const { data: newForm, error: createError } = await supabase
    .from('medical_history_form')
    .insert({
      name: 'Patient Medical History',
      questions: templateQuestions
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating medical history form:', createError);
    throw new Error(`Failed to create medical history form: ${createError.message}`);
  }
  
  console.log('Successfully created new medical history form with template questions');
  return newForm;
}

/**
 * Fetch medical history form from the database or create one if it doesn't exist
 */
async function fetchMedicalHistoryForm() {
  try {
    // FIXED: Modified to always get the latest form by ordering by id descending and limiting to 1
    const { data: medicalHistoryForm, error: formError } = await supabase
      .from('medical_history_form')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (formError) {
      console.error('Error fetching medical history form:', formError);
      throw new Error(`Failed to fetch medical history form: ${formError.message}`);
    }

    // If no form exists, create one with template questions
    if (!medicalHistoryForm) {
      console.log('Medical history form not found, creating a new one');
      return await createMedicalHistoryForm();
    }

    // Initialize questions as an array if it doesn't exist or isn't an array
    if (!medicalHistoryForm.questions || !Array.isArray(medicalHistoryForm.questions)) {
      console.log('Medical history form has no questions array, initializing with template questions');
      
      // Use the updated DEFAULT_QUESTIONS constant
      medicalHistoryForm.questions = DEFAULT_QUESTIONS;
      
      // Update the form with the template questions
      const { error: updateError } = await supabase
        .from('medical_history_form')
        .update({ questions: medicalHistoryForm.questions })
        .eq('id', medicalHistoryForm.id);
        
      if (updateError) {
        console.error('Error updating medical history form with template questions:', updateError);
        throw new Error(`Failed to update medical history form: ${updateError.message}`);
      }
      
      console.log('Updated medical history form with template questions');
    }

    console.log(`Retrieved medical history form with ${medicalHistoryForm?.questions?.length || 0} questions`);
    return medicalHistoryForm;
  } catch (error) {
    console.error('Error in fetchMedicalHistoryForm:', error);
    throw error;
  }
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
  
  // Enhanced system prompt with more detailed and precise instructions
  const systemPrompt = `You are an AI medical assistant specializing in extracting precise patient information from medical documents. 
You have been provided with medical documents and a structured questionnaire. Your task is to:
1. Carefully analyze each document description
2. Extract specific, concrete information that directly answers the questions in the questionnaire
3. Only include factual information actually present in the documents
4. If a clear answer is found, provide it with high confidence (0.8-1.0)
5. If an answer is suggested but not definitive, provide it with medium confidence (0.4-0.7)
6. If no answer is found, return null with zero confidence
7. For each answer, cite the specific document ID where the information was found
8. Be as precise as possible - avoid vague phrases like "and others" or "etc."
9. When describing medical conditions, medications, or allergies, always list specific names`;

  // Enhanced user prompt with clearer instructions and examples
  const userPrompt = `Based on the following medical documents, please answer the structured questionnaire questions.

QUESTIONNAIRE (with expected answer types):
${JSON.stringify(questions, null, 2)}

DOCUMENT DESCRIPTIONS:
${JSON.stringify(documentDescriptions.map((d, idx) => `Document ${idx + 1} (ID: ${d.id}): ${d.content}`))}

INSTRUCTIONS:
For each question, provide:
1. A precise, specific answer extracted from the documents (or null if not found)
2. A confidence score (0.0 to 1.0) reflecting your certainty in the answer
3. The source document ID where you found the information

EXPECTED OUTPUT FORMAT:
{
  "questionId1": {
    "answer": "specific, precise answer text",
    "confidence": 0.95,
    "source": "documentId"
  },
  "questionId2": {
    "answer": null,
    "confidence": 0,
    "source": null
  }
}

EXAMPLES:

For allergies, INSTEAD OF writing:
{
  "allergies": {
    "answer": "Penicillin and others",
    "confidence": 0.9,
    "source": "123"
  }
}

DO write:
{
  "allergies": {
    "answer": "Penicillin, amoxicillin, cephalosporins",
    "confidence": 0.9,
    "source": "123"
  }
}

For vaccinations, INSTEAD OF writing:
{
  "vaccinations": {
    "answer": "Yellow fever, FSME, Hepatitis A, and other diseases",
    "confidence": 0.9,
    "source": "84"
  }
}

DO write:
{
  "vaccinations": {
    "answer": "Yellow fever (2019), FSME (2020-2022), Hepatitis A (2021), Tetanus (2023)",
    "confidence": 0.9,
    "source": "84"
  }
}

REMEMBER: Output ONLY valid JSON without any additional text. If no answers can be found for any questions, return an empty object {}.`;

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using the latest OpenAI model
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
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error(`Failed to call OpenAI API: ${error.message}`);
  }
}

/**
 * Parse the OpenAI response to extract the JSON answer
 */
function parseOpenAIResponse(openaiData) {
  try {
    // Extract the content from the response
    const responseContent = openaiData.choices[0].message.content;
    console.log('OpenAI raw response:', responseContent);
    
    // Handle empty or invalid responses
    if (!responseContent || responseContent.trim() === '') {
      console.warn('OpenAI returned empty response');
      return {};
    }
    
    // Try to extract a JSON block if it's wrapped in markdown code blocks
    const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseContent.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, responseContent];
    
    const jsonStr = jsonMatch[1] ? jsonMatch[1].trim() : responseContent.trim();
    
    // If we have an empty JSON object or empty string, return an empty object
    if (jsonStr === '{}' || jsonStr === '') {
      console.log('OpenAI returned empty JSON object');
      return {};
    }
    
    let answersJson;
    try {
      answersJson = JSON.parse(jsonStr);
      console.log('Successfully parsed answers JSON');
      
      // Validate that we have a valid object
      if (!answersJson || typeof answersJson !== 'object') {
        console.warn('OpenAI response is not a valid object, returning empty object');
        return {};
      }
      
      return answersJson;
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', e);
      console.error('Raw JSON string:', jsonStr);
      throw new Error(`Failed to parse OpenAI response as JSON: ${e.message}`);
    }
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw new Error(`Error parsing OpenAI response: ${error.message}`);
  }
}

/**
 * Update medical history form with extracted answers
 */
async function updateMedicalHistoryForm(medicalHistoryForm, answersJson) {
  // Handle empty answers
  if (!answersJson || Object.keys(answersJson).length === 0) {
    console.log('No answers extracted from documents, no updates needed');
    return medicalHistoryForm.questions || [];
  }

  // Ensure questions exists and is an array
  if (!medicalHistoryForm.questions) {
    medicalHistoryForm.questions = [];
  } else if (!Array.isArray(medicalHistoryForm.questions)) {
    console.log('Questions is not an array, converting it');
    try {
      // Try to parse if it's a string representation of JSON
      if (typeof medicalHistoryForm.questions === 'string') {
        try {
          medicalHistoryForm.questions = JSON.parse(medicalHistoryForm.questions);
        } catch (e) {
          console.error('Failed to parse questions string as JSON:', e);
          medicalHistoryForm.questions = [];
        }
      } else {
        // Reset to empty array if it's neither array nor parseable string
        medicalHistoryForm.questions = [];
      }
    } catch (e) {
      console.error('Error converting questions to array:', e);
      medicalHistoryForm.questions = [];
    }
  }

  // If questions is empty or not an array after all attempts, initialize with default questions
  if (!Array.isArray(medicalHistoryForm.questions) || medicalHistoryForm.questions.length === 0) {
    console.log('Initializing questions with default template');
    medicalHistoryForm.questions = DEFAULT_QUESTIONS;
  }

  // Update existing questions or add new ones from answers
  const updatedQuestions = [];
  const questionIds = new Set(medicalHistoryForm.questions.map(q => q.id));
  
  // First, process existing questions
  for (const q of medicalHistoryForm.questions) {
    const questionId = q.id;
    if (answersJson[questionId]) {
      const answer = answersJson[questionId];
      updatedQuestions.push({
        ...q,
        answer: typeof answer === 'object' && answer.answer !== undefined ? answer.answer : answer,
        confidence: typeof answer === 'object' && answer.confidence !== undefined ? answer.confidence : 1,
        source: typeof answer === 'object' && answer.source !== undefined ? answer.source : null
      });
    } else {
      updatedQuestions.push(q);
    }
  }
  
  // Then add any new questions from the answers that weren't in the original list
  for (const [questionId, answer] of Object.entries(answersJson)) {
    if (!questionIds.has(questionId)) {
      updatedQuestions.push({
        id: questionId,
        text: questionId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        answer: typeof answer === 'object' && answer.answer !== undefined ? answer.answer : answer,
        confidence: typeof answer === 'object' && answer.confidence !== undefined ? answer.confidence : 1,
        source: typeof answer === 'object' && answer.source !== undefined ? answer.source : null,
        answerType: "string",
        description: "Information extracted from document"
      });
    }
  }
  
  // Update the form with the revised questions
  medicalHistoryForm.questions = updatedQuestions;

  try {
    const { error: storageError } = await supabase
      .from('medical_history_form')
      .update({ questions: medicalHistoryForm.questions })
      .eq('id', medicalHistoryForm.id);
      
    if (storageError) {
      console.error('Error storing answers in medical history form:', storageError);
      throw new Error(`Failed to store answers: ${storageError.message}`);
    }
    
    console.log('Successfully stored answers in medical history form');
    return medicalHistoryForm.questions;
  } catch (error) {
    console.error('Error updating medical history form:', error);
    throw error;
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    // Extract patient ID and optional document IDs from request
    const requestData = await req.json();
    const { patientId, documentIds } = requestData;
    
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
    let medicalHistoryForm;
    try {
      medicalHistoryForm = await fetchMedicalHistoryForm();
    } catch (error) {
      console.error('Error fetching/creating medical history form:', error);
      throw error;
    }

    // 3. Prepare questions list from medical history form
    const questions = medicalHistoryForm.questions || [];

    // 4. Prepare document descriptions list
    const documentDescriptions = prepareDocumentDescriptions(documents);

    // 5. Call OpenAI API
    let openaiData;
    try {
      openaiData = await callOpenAIForAnalysis(questions, documentDescriptions);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return createErrorResponse(
        'Failed to analyze documents with OpenAI',
        500,
        error
      );
    }

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
