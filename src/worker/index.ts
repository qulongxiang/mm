import { Hono } from "hono";
import scoresData from "./scores";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/scores", (c) => {
  return c.json(scoresData);
});

app.get("/api/scores/analysis", (c) => {
  const scores = scoresData.scores;
  const analysis = {
    overallTrend: calculateOverallTrend(scores),
    subjectTrends: calculateSubjectTrends(scores),
    yearOverYearComparison: calculateYearOverYear(scores),
    historicalAverage: calculateHistoricalAverage(scores)
  };
  return c.json(analysis);
});

function calculateOverallTrend(scores: typeof scoresData.scores) {
  const sorted = [...scores].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstAvg = first.subjects.reduce((sum, s) => sum + s.score / s.fullScore * 100, 0) / first.subjects.length;
  const lastAvg = last.subjects.reduce((sum, s) => sum + s.score / s.fullScore * 100, 0) / last.subjects.length;
  return {
    startScore: Math.round(firstAvg * 100) / 100,
    currentScore: Math.round(lastAvg * 100) / 100,
    improvement: Math.round((lastAvg - firstAvg) * 100) / 100
  };
}

function calculateSubjectTrends(scores: typeof scoresData.scores) {
  const subjectMap = new Map<string, number[]>();
  scores.forEach(exam => {
    exam.subjects.forEach(sub => {
      const percent = (sub.score / sub.fullScore) * 100;
      if (!subjectMap.has(sub.name)) subjectMap.set(sub.name, []);
      subjectMap.get(sub.name)!.push(percent);
    });
  });
  const trends: Record<string, { average: number; latest: number; trend: string }> = {};
  subjectMap.forEach((scores, name) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const latest = scores[scores.length - 1];
    const trend = latest > scores[0] ? "上升" : latest < scores[0] ? "下降" : "持平";
    trends[name] = {
      average: Math.round(avg * 100) / 100,
      latest: Math.round(latest * 100) / 100,
      trend
    };
  });
  return trends;
}

function calculateYearOverYear(scores: typeof scoresData.scores) {
  const byYear: Record<number, number[]> = {};
  scores.forEach(exam => {
    const year = new Date(exam.date).getFullYear();
    const avg = exam.subjects.reduce((sum, s) => sum + s.score / s.fullScore * 100, 0) / exam.subjects.length;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(avg);
  });
  const result: Record<string, number> = {};
  Object.keys(byYear).sort().forEach(yearStr => {
    const year = parseInt(yearStr, 10);
    const yearScores = byYear[year];
    const avg = yearScores.reduce((a: number, b: number) => a + b, 0) / yearScores.length;
    result[year + "年均分"] = Math.round(avg * 100) / 100;
  });
  return result;
}

function calculateHistoricalAverage(scores: typeof scoresData.scores) {
  const allScores: number[] = [];
  scores.forEach(exam => {
    exam.subjects.forEach(sub => {
      allScores.push((sub.score / sub.fullScore) * 100);
    });
  });
  return Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100;
}

export default app;