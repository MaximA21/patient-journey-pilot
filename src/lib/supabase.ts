
import { supabase } from "@/integrations/supabase/client";

// Document upload function with retry limit and unique filename generation
export async function uploadDocument(file: File, patientId: string | null = null, retryCount = 0) {
  try {
    // Limit retries to prevent infinite loops
    if (retryCount >= 3) {
      console.error("Maximum retry count reached");
      return { success: false, error: "Maximum retry count reached" };
    }
    
    const fileExt = file.name.split('.').pop();
    // Make filename more unique by adding retry count and random string
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    // Hard-coded patient ID - ALWAYS use this ID for all uploads
    const defaultPatientId = "0ea5b69f-95cd-4dae-80f7-199922da2924";
    const folderPath = "uploads";
    const fileName = `${folderPath}/${uniqueId}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload file to storage bucket 'images'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }
    
    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
      
    const publicUrl = urlData.publicUrl;
    
    // Always use the default patient ID regardless of what was passed in
    const usePatientId = defaultPatientId;
    
    console.log(`Using patient ID for document: ${usePatientId}`);
    
    // Create record data with patient_id - ENSURE IT'S NOT NULL
    const recordData = {
      raw_input: publicUrl,
      display_name: file.name,
      patient_id: usePatientId 
    };
    
    console.log("Inserting record with data:", JSON.stringify(recordData));
    
    // Insert record into documents_and_images table including patient_id
    const { data, error } = await supabase
      .from('documents_and_images')
      .insert([recordData])
      .select();
      
    if (error) {
      // Check if this is a duplicate key error
      if (error.code === '23505') {
        console.error("Duplicate key error - attempting with different timestamp");
        
        // If it's a duplicate key error, try again with increased retry count
        return await uploadDocument(file, patientId, retryCount + 1);
      }
      
      console.error("Database error:", error);
      throw error;
    }
    
    // Verify the inserted record has the patient_id
    if (data && data.length > 0) {
      console.log("Successfully inserted record with patient_id:", data[0].patient_id);
      
      // Double-check that patient_id was actually stored
      if (!data[0].patient_id) {
        console.error("WARNING: patient_id appears to be null after insert!");
        
        // Try to update it explicitly
        const { error: updateError } = await supabase
          .from('documents_and_images')
          .update({ patient_id: usePatientId })
          .eq('id', data[0].id);
          
        if (updateError) {
          console.error("Failed to update patient_id:", updateError);
        } else {
          console.log("Successfully updated patient_id after insert");
        }
      }
    }
    
    return { 
      success: true, 
      url: publicUrl, 
      data,
      name: file.name // Return the original filename
    };
    
  } catch (error) {
    console.error('Error uploading document:', error);
    return { success: false, error };
  }
}

// New function to trigger document processing manually
export async function processDocument(documentId: number, imageUrl: string) {
  try {
    // Always ensure we're passing the patient_id in the function call
    const defaultPatientId = "0ea5b69f-95cd-4dae-80f7-199922da2924";
    
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: { 
        record_id: documentId, 
        image_url: imageUrl,
        patient_id: defaultPatientId // Pass the patient_id here as well
      }
    });
    
    if (error) {
      console.error("Error processing document:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error invoking process-document function:', error);
    return { success: false, error };
  }
}
