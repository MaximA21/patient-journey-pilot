
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
    "id": "current_complaints",
    "text": "Jetzige Beschwerden, Gesundheitsstörungen",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "fever",
    "text": "Haben Sie Fieber?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "headaches",
    "text": "Leiden Sie an Kopfschmerzen (auch Druckgefühl im Kopf)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "eye_pain",
    "text": "Haben Sie Augenschmerzen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "throat_pain",
    "text": "Haben Sie Halsschmerzen oder Schluckbeschwerden?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "Typhoid/paratyphoid/Ruhr",
    "text": "Hatten Sie Typhoid/paratyphoid/Ruhr?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "tuberculosis (TB)",
    "text": "Hatten Sie Tuberkulose (Tbc)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "glaucoma, glaucoma",
    "text": "Hatten Sie Grüner Star, Glaukom?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "sinusitis",
    "text": "Hatten Sie Nasen-Nebenhöhlenentzündungen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "thyroid diseases",
    "text": "Hatten Sie Schilddrüsenkrankheiten?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "pneumonia, pleurisy, prolonged bronchitis",
    "text": "Hatten Sie Lungen-, Rippenfellentzündung länger dauernde Bronchitis?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "hypertension",
    "text": "Hatten Sie hohen Blutdruck?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "stroke",
    "text": "Hatten Sie einen Schlaganfall oder Lähmungen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "heart_attack",
    "text": "Hatten Sie einen Herzinfarkt?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "heart_diseases",
    "text": "Hatten Sie andere Herzkrankheiten oder Gefäßleiden?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "diabetes",
    "text": "Haben Sie eine Zuckerkrankheit (Diabetes)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "allergies",
    "text": "Haben Sie Allergien oder Unverträglichkeiten (z.B. Penicillin, Röntgenkontrastmittel)?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "asthma",
    "text": "Haben Sie Asthma oder Heuschnupfen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "gastrointestinal",
    "text": "Hatten Sie Magen- oder Zwölffingerdarmgeschwür oder Verdauungsprobleme?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "liver_diseases",
    "text": "Hatten Sie Leber- oder Gallenerkrankungen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "kidney_diseases",
    "text": "Leiden Sie an Nieren-, Harnleiter- oder Blasensteinen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "prostate",
    "text": "Hatten Sie Erkrankungen der Vorsteherdrüse (Prostata)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "urination_problems",
    "text": "Hatten Sie Schwierigkeiten beim Wasserlassen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "thyroid",
    "text": "Hatten Sie Schilddrüsenerkrankungen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "cancer",
    "text": "Haben oder hatten Sie Krebs (bösartige Tumore)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "epilepsy",
    "text": "Hatten Sie Epilepsie (Krampfanfälle)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "operations",
    "text": "Wurden Sie schon mal operiert/mehrfach operiert? Wenn ja, wann und was?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "xray_treatment",
    "text": "Wurden Sie schon einmal mit Radium oder Röntgenstrahlen behandelt? Wenn ja, wann?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "last_xray",
    "text": "Wann war die letzte Röntgenuntersuchung?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "medications",
    "text": "Nehmen Sie regelmäßig Medikamente ein (auch Abführ-, Beruhigungs-, Schlaf- oder Kopfschmerzmittel)? Wenn ja, welche?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "hormones",
    "text": "Nehmen oder nahmen Sie die Pille oder sonstige Hormonpräparate?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "alcohol",
    "text": "Trinken Sie regelmäßig alkoholische Getränke?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "smoking",
    "text": "Rauchen Sie gewohnheitsmäßig? Wenn ja, wieviel?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "drugs",
    "text": "Nehmen oder nahmen Sie Drogen? Wenn ja, welche?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "sport",
    "text": "Treiben Sie weniger als zweimal wöchentlich Sport?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_history",
    "text": "Sind in Ihrer Familie folgende Krankheiten vorgekommen (Diabetes, Herzinfarkt, Bluthochdruck, Krebs)?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "weight_gain",
    "text": "Haben Sie innerhalb der letzten 12 Monate mehr als 5kg zugenommen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "weight_loss",
    "text": "Haben Sie innerhalb der letzten 12 Monate mehr als 5kg abgenommen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "sleep_disorders",
    "text": "Schlafen Sie schlecht oder schlafen Sie schlecht ein?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "neurological",
    "text": "Leiden Sie an einer Neurose oder anderen nervösen Beschwerden?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "pregnancy",
    "text": "Sind Sie schwanger?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "sensory_disorders",
    "text": "Leiden Sie an einer Sehstörung?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "travelers",
    "text": "Waren Sie in den letzten 12 Monaten in Mittelmeerländern, in Asien oder in den Tropen?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "thirst",
    "text": "Haben Sie auffallend großen Durst?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "intimate_concerns",
    "text": "Bedrückt Sie etwas erotisches (beruflich, privat oder in der Partnerschaft)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "health_affected_by_noise",
    "text": "Fühlen Sie sich in Ihrer Gesundheit beeinträchtigt durch Lärm (Arbeitsplatz, Freizeit, Nachtruhe)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "health_affected_by_dust",
    "text": "Fühlen Sie sich in Ihrer Gesundheit beeinträchtigt durch Staub/Rauch/Abgase (Arbeitsplatz, Wohnbereich)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "health_affected_by_shift_work",
    "text": "Fühlen Sie sich in Ihrer Gesundheit beeinträchtigt durch Schichtarbeit?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_high_blood_pressure",
    "text": "Kommt hoher Blutdruck oder Schlaganfall in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_heart_attack",
    "text": "Kommt Herzinfarkt in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_overweight",
    "text": "Kommt Übergewicht in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_diabetes",
    "text": "Kommen Zuckerkrankheiten (Diabetes) in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_gout",
    "text": "Kommt Gicht in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_neurological",
    "text": "Kommen Nerven-, Gemüts-, Geisteskrankheiten in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_epilepsy",
    "text": "Kommt Epilepsie (Krampfanfälle) in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_tuberculosis",
    "text": "Kommt Tuberkulose (Tbc) in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_gallstones",
    "text": "Kommen Gallensteine, Nierensteine, Blasensteine in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_cancer",
    "text": "Kommt Krebs (einschl. Blutkrebs) in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_addiction",
    "text": "Kommen Suchtkrankheiten (Alkohol, Medikamente, Drogen) in Ihrer Familie vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "family_other",
    "text": "Kommen andere Krankheiten in Ihrer Familie vor? Wenn ja, welche?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "family_chronic_diseases",
    "text": "Sind chronische Erkrankungen in der Familie bekannt? Wenn ja, welche?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "occupation",
    "text": "Welche Tätigkeit üben Sie gegenwärtig aus?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "accident",
    "text": "Liegt ein Unfall vor?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "marital_status",
    "text": "Familienstand (ledig, verheiratet, geschieden, verwitwet, getrennt lebend)?",
    "answer": null,
    "confidence": 0,
    "answerType": "string",
    "source": null
  },
  {
    "id": "nationality",
    "text": "Staatsangehörigkeit:",
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
    
    let formId: number | null = null;
    try {
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
      } else if (newForm) {
        console.log(`Successfully created medical history form with ID: ${newForm.id}`);
        formId = newForm.id;
      } else {
        console.error('No form data returned after insert');
      }
    } catch (formCreateError) {
      console.error('Exception creating medical history form:', formCreateError);
      // Continue processing even if form creation fails
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
          formId: formId // Include the newly created form ID
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // All uploads are processed, trigger the analysis if we have a valid form ID
    if (formId === null) {
      console.error('No valid form ID created, skipping document analysis');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to create medical history form',
          error: 'No valid form ID created'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('All documents processed, triggering analysis');
    
    // Call the document analysis function using fetch directly to the URL
    const analysisUrl = `${supabaseUrl}/functions/v1/analyze-patient-documents`;
    console.log(`Calling analysis function at: ${analysisUrl}`);
    
    try {
      const analysisResponse = await fetch(analysisUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          patientId: usePatientId,
          documentIds,
          formId: formId // Pass the newly created form ID to the analysis function
        })
      });
      
      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('Analysis function error status:', analysisResponse.status);
        console.error('Analysis function error:', errorText);
        
        // Return success with form ID even if analysis fails
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Documents processed but analysis failed',
            error: `Analysis error: ${analysisResponse.status} ${errorText}`,
            formId: formId // Still return the form ID
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const analysisResult = await analysisResponse.json();
      console.log("Analysis result:", analysisResult);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All uploads processed and analysis completed',
          analysisResult,
          formId: formId // Include the newly created form ID
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (analysisError) {
      console.error('Error calling analysis function:', analysisError);
      
      // Return success with form ID even if analysis fails
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Documents processed but analysis failed',
          error: String(analysisError),
          formId: formId // Still return the form ID
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
