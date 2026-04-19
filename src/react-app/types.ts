export interface SubjectScore {
  name: string;
  score: number;
  fullScore: number;
}

export interface ExamScore {
  id: string;
  grade: number;
  semester: 1 | 2;
  examType: "midterm" | "final";
  examName: string;
  date: string;
  subjects: SubjectScore[];
}

export interface Student {
  name: string;
  currentGrade: number;
  educationStages: string[];
  startYear: number;
}

export interface ScoresData {
  student: Student;
  scores: ExamScore[];
}

export interface OverallTrend {
  startScore: number;
  currentScore: number;
  improvement: number;
}

export interface SubjectTrend {
  average: number;
  latest: number;
  trend: string;
}

export interface StabilityData {
  stdDev: number;
  cv: number;
  level: string;
}

export interface BalanceData {
  imbalance: number;
  weakestSubject: string;
  strongestSubject: string;
  subjectDetails: Array<{
    name: string;
    average: number;
    highest: number;
    lowest: number;
    examCount: number;
  }>;
}

export interface AchievementRates {
  excellent: number;
  good: number;
  pass: number;
}

export interface WeakPoint {
  subject: string;
  average: number;
  gap: number;
  suggestion: string;
}

export interface LearningCurve {
  acceleration: number;
  trend: string;
}

export interface SemesterComparison {
  first: number;
  second: number;
}

export interface AnalysisData {
  overallTrend: OverallTrend;
  subjectTrends: Record<string, SubjectTrend>;
  yearOverYearComparison: Record<string, number>;
  historicalAverage: number;
  stability: Record<string, StabilityData>;
  balance: BalanceData;
  achievementRates: AchievementRates;
  weakPoints: WeakPoint[];
  learningCurve: LearningCurve;
  semesterComparison: SemesterComparison;
}