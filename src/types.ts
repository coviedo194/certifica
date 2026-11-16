export type Theme = 'system' | 'light' | 'dark';
export type Mode = 'practice' | 'exam';
export type Source = { id: string; title: string; url: string; kind: string; reviewed: string };
export type Domain = { id: string; title: string; weight: string; share: number; color: string };
export type StudyImage = {
  src: string; width: number; height: number; alt: string; caption: string; source: string;
  originalUrl: string; attribution: string; license: string; licenseUrl: string;
  licenseSource: string; reviewed: string;
};
export type Lesson = {
  id: string; domain: string; title: string; minutes: number; focus: boolean; version: number;
  objectives: string[]; sources: string[]; blocks: { title: string; body: string; kind: string; image?: StudyImage }[];
};
export type StudyProgress = { lessonId: string; blockIndex: number; completed: number; updatedAt: string };
export type AppState = {
  settings: { theme: Theme; certification: string };
  catalog: { id: string; code: string; title: string }[];
  interests: { id: string; code: string; title: string; url: string; verified: string }[];
  certification: {
    id: string; code: string; title: string; subtitle: string; description: string;
    version: string; reviewed: string; guideUrl: string; assessmentUrl: string; notice: string;
    domains: Domain[]; lessons: Lesson[]; recommended: string[]; sources: Source[]; questionCount: number;
  };
  study: StudyProgress[]; lastStudy: string | null;
  active: { id: string; mode: Mode; cursor: number; createdAt: string }[];
};
export type QuestionStat = {
  id: string; lessonId: string; stem: string; attempts: number; correct: number; accuracy: number | null;
  lastCorrect: boolean | null; difficulty: number | null; averageDifficulty: number | null;
  dueAt: string | null; due: boolean; box: number; priority: number;
};
export type Stats = {
  attempts: number; correct: number; seen: number; total: number; due: number; difficult: number;
  recentAccuracy: number | null; timeMs: number; ratings: { difficulty: number; count: number }[];
  domains: (Domain & { attempts: number; correct: number; accuracy: number | null; seen: number; total: number })[];
  questions: QuestionStat[];
  history: { id: string; mode: Mode; createdAt: string; completedAt: string; total: number; answered: number; correct: number }[];
  days: { day: string; attempts: number; correct: number }[];
};
export type SessionQuestion = {
  id: string; lessonId: string; objective: string; stem: string; options: string[];
  provenance: string; version: number;
  attempt: { selected: number; difficulty: number; durationMs: number } | null;
  feedback: { answer: number; explanations: string[]; sources: string[]; correct: boolean } | null;
};
export type Session = {
  id: string; certification: string; mode: Mode; status: string; cursor: number;
  createdAt: string; deadline: string | null; completedAt: string | null;
  answered: number; score: number | null; questions: SessionQuestion[];
};
export type PracticeConfig = { mode: Mode; filter: string; order: string; lessonId: string; count: number; minutes: number };
