
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

// Define our standard set of medical history questions
export const DEFAULT_QUESTIONS = [
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
    "id": "tuberculosis",
    "text": "Hatten Sie Tuberkulose (Tbc)?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "glaucoma",
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
    "id": "thyroid_diseases",
    "text": "Hatten Sie Schilddrüsenkrankheiten?",
    "answer": null,
    "confidence": 0,
    "answerType": "boolean",
    "source": null
  },
  {
    "id": "pneumonia",
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
