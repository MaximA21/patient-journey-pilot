
export interface Question {
  id: string;
  text: string;
  answer: string | boolean | null;
  confidence: number;
  answerType: string;
  description?: string;
  source?: string | null;
}

export interface MedicalHistoryForm {
  id: string;
  name: string;
  questions: Question[];
}
