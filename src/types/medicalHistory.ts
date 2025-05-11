
export interface Question {
  id: string;
  text: string;
  answer: string | boolean | null;
  confidence: number;
  answerType: string;
  description?: string;
  source?: string | null;
  [key: string]: any; // Add index signature to make it compatible with Json type
}

export interface MedicalHistoryForm {
  id: string;
  name: string;
  questions: Question[];
}
