
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { image_url } = await req.json();
    
    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'Missing image_url in request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Processing insurance card image: ${image_url}`);

    // Fetch the image
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${imageResponse.statusText}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Convert image to base64
    const imageBlob = await imageResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const bytes = new Uint8Array(imageArrayBuffer);
    let binary = '';
    
    const chunkSize = 1024; // Process in 1KB chunks
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    
    const base64Image = btoa(binary);
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Call Gemini API to extract information from the insurance card
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "This is an image of a health insurance card. Extract all relevant patient information including: name, insurance number, insurance provider, and any other visible details. Format the response as a valid JSON object with the following structure: { \"name\": \"First Last\", \"insurance_provider\": \"Provider Name\", \"insurance_number\": 12345, \"additional_info\": \"Any other relevant details\" }. If you can't extract some information, leave that field as null. Don't include any explanatory text in your response, only the JSON."
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generation_config: {
        temperature: 0.1,
        top_p: 1,
        top_k: 32,
        max_output_tokens: 2048,
      }
    };

    // Call Gemini API
    const geminiResponse = await fetch(`${geminiUrl}?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error("No text content in Gemini response");
    }

    // Extract JSON from response
    let extractedInfo;
    try {
      // Try direct JSON parsing
      extractedInfo = JSON.parse(textContent);
    } catch (e) {
      // Try to extract JSON from text if direct parsing fails
      const jsonMatch = textContent.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          extractedInfo = JSON.parse(jsonMatch[0]);
        } catch (err) {
          throw new Error(`Failed to parse JSON from response: ${textContent}`);
        }
      } else {
        throw new Error(`No valid JSON found in response: ${textContent}`);
      }
    }

    // Prepare patient data
    const patientData = {
      name: extractedInfo.name?.split(' ')[0] || null,
      surname: extractedInfo.name?.split(' ').slice(1).join(' ') || null,
      insurance_provider: extractedInfo.insurance_provider || null,
      insurance_number: extractedInfo.insurance_number || null
    };

    console.log("Extracted patient data:", JSON.stringify(patientData));

    // Return the extracted data
    return new Response(
      JSON.stringify({
        success: true,
        patient: patientData,
        raw_extraction: extractedInfo
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error processing insurance card:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
