
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
    // Use hardcoded patient ID as default path
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
    
    // Always use the specific patient ID (either provided or default)
    const usePatientId = patientId || defaultPatientId;
    
    console.log(`Using patient ID for document: ${usePatientId}`);
    
    // Create record data with patient_id
    const recordData = {
      raw_input: publicUrl,
      display_name: file.name,
      patient_id: usePatientId
    };
    
    // Insert record into documents_and_images table including display_name
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
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: { record_id: documentId, image_url: imageUrl }
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
