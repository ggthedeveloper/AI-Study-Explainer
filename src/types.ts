export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'conceptual' | 'application';

export interface PracticeQuestion {
  id?: string;
  type?: QuestionType;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  hint: string;
  conceptTag?: string;
}

export interface PracticeQuizResult {
  totalQuestions: number;
  score: number;
  correctCount: number;
  incorrectCount: number;
  percentage: number;
  userAnswers: Record<number, number>;
  questions: PracticeQuestion[];
}

export interface DetailedBreakdown {
  inDepthExplanation: string;
  stepByStepExample: {
    title: string;
    scenario: string;
    steps: {
      stepNumber: number;
      title: string;
      explanation: string;
      calculationOrDetail?: string;
    }[];
    takeaway: string;
  };
  coreMechanisms?: {
    mechanism: string;
    description: string;
  }[];
  commonMisconceptions?: {
    misconception: string;
    correction: string;
  }[];
  practicalApplications?: string[];
}

export interface StudyExplanation {
  topic: string;
  difficulty: DifficultyLevel;
  simpleExplanation: string;
  easyAnalogy: string;
  keyPoints: string[];
  example: string;
  practiceQuestion?: PracticeQuestion;
  practiceQuestions?: PracticeQuestion[];
  detailedBreakdown?: DetailedBreakdown;
  generatedAt: string;
}

export interface MindMapSubtopic {
  id: string;
  title: string;
  description: string;
  keyDetail?: string;
}

export interface MindMapBranch {
  id: string;
  title: string;
  summary: string;
  color: string;
  subtopics: MindMapSubtopic[];
}

export interface MindMapData {
  topic: string;
  centralConcept: string;
  coreSummary: string;
  branches: MindMapBranch[];
  generatedAt: string;
}

// Structured Study Notes for Exam Preparation PDF
export interface ConceptItem {
  title: string;
  explanation: string;
}

export interface DefinitionItem {
  term: string;
  definition: string;
}

export interface FormulaItem {
  name: string;
  formula: string;
  explanation: string;
}

export interface ExampleScenario {
  title: string;
  scenario: string;
  walkthrough: string;
}

export interface StepItem {
  step: number;
  title: string;
  details: string;
}

export interface StructuredStudyNotes {
  topicTitle: string;
  difficulty: DifficultyLevel;
  shortIntroduction: string;
  keyConcepts: ConceptItem[];
  detailedExplanation: string;
  importantDefinitions: DefinitionItem[];
  formulasAndEquations?: FormulaItem[];
  examples: ExampleScenario[];
  stepByStepExplanation?: StepItem[];
  importantPointsAndTakeaways: string[];
  quickRevisionSummary: string[];
  generatedAt: string;
}

// Formula & Equation Cheat Sheet Data Types
export interface VariableDetail {
  symbol: string;
  meaning: string;
  unit?: string;
}

export interface WorkedExampleCalc {
  problem: string;
  given: string;
  solutionSteps: string[];
  finalAnswer: string;
}

export interface FormulaDetail {
  id: string;
  name: string;
  latex?: string;
  plainText: string;
  category?: string;
  description: string;
  variables: VariableDetail[];
  whenToUse: string;
  workedExample?: WorkedExampleCalc;
  commonPitfalls?: string;
}

export interface FormulaCategory {
  categoryName: string;
  description?: string;
  formulas: FormulaDetail[];
}

export interface ConstantOrUnitItem {
  name: string;
  symbol: string;
  value: string;
  unit?: string;
}

export interface FormulaCheatSheetData {
  topic: string;
  subjectCategory: string;
  overview: string;
  categories: FormulaCategory[];
  constantsAndUnits?: ConstantOrUnitItem[];
  quickCalculationTips?: string[];
  generatedAt: string;
}

// Material Upload & Solver Interfaces
export interface UploadedMaterialFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
  previewUrl?: string;
}

export interface MathBreakdown {
  formula: string;
  substitution: string;
  calculation: string;
  finalResult: string;
}

export interface CodeBreakdown {
  approach: string;
  language?: string;
  code: string;
  explanation: string;
  expectedOutput?: string;
}

export interface SimilarQuestion {
  question: string;
  answer: string;
  explanation: string;
}

export interface DetectedQuestion {
  id: string;
  questionNumber: string;
  questionText: string;
  questionType: 'math' | 'programming' | 'conceptual' | 'diagram_based' | 'multiple_choice' | 'short_answer';
  diagramReference?: string | null;
  finalAnswer: string;
  stepByStepSolution: string[];
  conceptExplanation: string;
  formulasUsed?: string[];
  commonMistakes?: string[];
  mathBreakdown?: MathBreakdown;
  codeBreakdown?: CodeBreakdown;
  hint: string;
  simplifiedExplanation?: string;
  similarQuestion?: SimilarQuestion;
  assumptions?: string | null;
}

export interface MaterialAnalysisResult {
  id: string;
  materialSummary: string;
  subjectDomain: string;
  keyTopicsCovered: string[];
  questions: DetectedQuestion[];
  generatedAt: string;
  modelUsed?: string;
}

export interface FollowUpMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface MaterialQuizItem {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  hint: string;
}

// 1. Flashcards & Spaced Repetition Types
export type MasteryLevel = 'unseen' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  conceptTag: string;
  hint?: string;
  mastery?: MasteryLevel;
  reviewCount?: number;
  lastReviewed?: string;
}

export interface FlashcardDeck {
  id: string;
  deckTitle: string;
  topic: string;
  difficulty?: DifficultyLevel;
  totalCards: number;
  cards: Flashcard[];
  createdAt: string;
  lastStudiedAt?: string;
}

// 2. Study Schedule & Revision Checklist Types
export interface StudyTask {
  id: string;
  dayNumber: number;
  title: string;
  topic: string;
  actionSteps: string[];
  estimatedMinutes: number;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
}

export interface StudyPhase {
  phaseName: string;
  phaseFocus: string;
  dayRange: string;
}

export interface StudyPlan {
  id: string;
  examName: string;
  targetDate?: string;
  daysRemaining: number;
  dailyHours: number;
  planTitle: string;
  overview: string;
  totalEstimatedHours: number;
  phases: StudyPhase[];
  tasks: StudyTask[];
  topExamTips: string[];
  createdAt: string;
}

// 3. Timed Practice Exam Simulation Types
export interface ExamQuestion {
  id: string;
  questionNumber: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  hint: string;
  category: string;
}

export interface TimedExam {
  id: string;
  examTitle: string;
  instructions: string;
  topic: string;
  difficulty: DifficultyLevel;
  timeLimitMinutes: number;
  totalQuestions: number;
  questions: ExamQuestion[];
  createdAt: string;
}

export interface ExamAttemptResult {
  examId: string;
  examTitle: string;
  topic: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  grade: string;
  timeSpentSeconds: number;
  userAnswers: Record<string, number>;
  flaggedQuestionIds: string[];
  completedAt: string;
  questions: ExamQuestion[];
}

// 4. Saved History & Bookmarks Types
export type SavedItemType = 'explanation' | 'question' | 'flashcards' | 'study_plan' | 'exam_result' | 'cheatsheet' | 'mindmap';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  title: string;
  snippet: string;
  topic: string;
  tags?: string[];
  data: any;
  createdAt: string;
  isBookmarked: boolean;
}


