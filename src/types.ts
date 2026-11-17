export interface Segment {
  id: number;
  startTime: string; // e.g. "00:15"
  endTime: string;   // e.g. "01:20"
  speaker: string;   // e.g. "Professor", "Aluno 1"
  text: string;
  topic?: string;
}

export interface TimelineTopic {
  timestamp: string;
  title: string;
  description: string;
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LectureData {
  title: string;
  subject: string;
  estimatedDuration: string;
  language: string;
  summary: string;
  keyTakeaways: string[];
  segments: Segment[];
  timelineTopics: TimelineTopic[];
  glossary: GlossaryItem[];
  studyNotesMarkdown: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  practicalApplications?: string[];
  audioUrl?: string;
  rawTranscript?: string;
  partsCount?: number;
  savedMdPath?: string;
  savedMdFilename?: string;
}

export type InputMode = 'upload' | 'drive' | 'record' | 'live' | 'text' | 'sample';
