export interface LegalSection {
  id: string;
  title: string;
  content: string;
}

export interface LegalDocument {
  pageTitle: string;
  description: string;
  summaryTitle: string;
  summaryText: string;
  sections: readonly LegalSection[];
}

export interface FaqItem {
  question: string;
  answer: string;
}
