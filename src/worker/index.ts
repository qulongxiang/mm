import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { cors } from "hono/cors";

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env; Variables: { userId: number } }>();

// 添加CORS中间件
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type']
}));

// 中间件：验证用户身份
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set("userId", payload.id);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
}

// 注册路由
app.post("/api/auth/register", async (c) => {
  try {
    const { name, currentGrade, educationStages, startYear, email, password } = await c.req.json();
    
    // 检查邮箱是否已存在
    const existingUser = await c.env.DB.prepare(
      "SELECT * FROM students WHERE email = ?"
    ).bind(email).all();
    
    if (existingUser.results.length > 0) {
      return c.json({ error: "Email already exists" }, 400);
    }
    
    // 创建新用户
    const result = await c.env.DB.prepare(
      "INSERT INTO students (name, currentGrade, educationStages, startYear, email, password) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(name, currentGrade, educationStages, startYear, email, password).run();
    
    // 生成 JWT token
    const token = await sign({ id: result.meta.lastRowId }, c.env.JWT_SECRET);
    
    return c.json({ token, user: { id: result.meta.lastRowId, name, email } });
  } catch (error) {
    console.error("Registration error:", error);
    return c.json({ error: "Failed to register" }, 500);
  }
});

// 登录路由
app.post("/api/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    // 查找用户
    const userResult = await c.env.DB.prepare(
      "SELECT * FROM students WHERE email = ? AND password = ?"
    ).bind(email, password).all();
    
    if (userResult.results.length === 0) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    
    const user = userResult.results[0];
    
    // 生成 JWT token
    const token = await sign({ id: user.id }, c.env.JWT_SECRET);
    
    return c.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Failed to login" }, 500);
  }
});

// 带认证的路由
app.get("/api/scores", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    
    // 查询学生信息
    const studentResult = await c.env.DB.prepare(
      "SELECT * FROM students WHERE id = ?"
    ).bind(userId).all();
    
    if (studentResult.results.length === 0) {
      return c.json({ error: "No student found" }, 404);
    }
    
    const student = studentResult.results[0];
    
    // 查询考试成绩
    const scoresResult = await c.env.DB.prepare(
      "SELECT * FROM exams WHERE student_id = ? ORDER BY date DESC"
    ).bind(userId).all();
    
    const exams = scoresResult.results;
    
    // 查询科目成绩
    const scoresWithSubjects: ExamScore[] = [];
    for (const exam of exams) {
      const subjectsResult = await c.env.DB.prepare(
        "SELECT * FROM subjects WHERE exam_id = ?"
      ).bind((exam as any).id).all();
      
      scoresWithSubjects.push({
        id: (exam as any).id as string,
        grade: (exam as any).grade as number,
        semester: (exam as any).semester as number,
        examType: (exam as any).examType as string,
        examName: (exam as any).examName as string,
        date: (exam as any).date as string,
        subjects: (subjectsResult.results as any[]).map((sub: any) => ({
          name: sub.name as string,
          score: sub.score as number,
          fullScore: sub.fullScore as number
        }))
      });
    }
    
    const scoresData = {
      student,
      scores: scoresWithSubjects
    };
    
    return c.json(scoresData);
  } catch (error) {
    console.error("Database query error:", error);
    return c.json({ error: "Failed to fetch scores" }, 500);
  }
});

// 新增考试成绩
app.post("/api/scores", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const { grade, semester, examType, examName, date, subjects } = await c.req.json();
    
    // 生成考试ID
    const examId = `exam_${Date.now()}_${userId}`;
    
    // 插入考试记录
    await c.env.DB.prepare(
      "INSERT INTO exams (id, student_id, grade, semester, examType, examName, date) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(examId, userId, grade, semester, examType, examName, date).run();
    
    // 插入科目成绩记录
    for (const subject of subjects) {
      await c.env.DB.prepare(
        "INSERT INTO subjects (exam_id, name, score, fullScore) VALUES (?, ?, ?, ?)"
      ).bind(examId, subject.name, subject.score, subject.fullScore).run();
    }
    
    return c.json({ success: true, id: examId, message: "成绩添加成功" });
  } catch (error) {
    console.error("Database insert error:", error);
    return c.json({ error: "Failed to add score" }, 500);
  }
});

// 修改考试成绩
app.put("/api/scores/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const examId = c.req.param("id");
    const { grade, semester, examType, examName, date, subjects } = await c.req.json();
    
    // 检查考试是否属于当前用户
    const examCheck = await c.env.DB.prepare(
      "SELECT * FROM exams WHERE id = ? AND student_id = ?"
    ).bind(examId, userId).all();
    
    if (examCheck.results.length === 0) {
      return c.json({ error: "考试记录不存在或无权修改" }, 404);
    }
    
    // 更新考试记录
    await c.env.DB.prepare(
      "UPDATE exams SET grade = ?, semester = ?, examType = ?, examName = ?, date = ? WHERE id = ?"
    ).bind(grade, semester, examType, examName, date, examId).run();
    
    // 删除原有的科目成绩
    await c.env.DB.prepare(
      "DELETE FROM subjects WHERE exam_id = ?"
    ).bind(examId).run();
    
    // 重新插入科目成绩
    for (const subject of subjects) {
      await c.env.DB.prepare(
        "INSERT INTO subjects (exam_id, name, score, fullScore) VALUES (?, ?, ?, ?)"
      ).bind(examId, subject.name, subject.score, subject.fullScore).run();
    }
    
    return c.json({ success: true, message: "成绩修改成功" });
  } catch (error) {
    console.error("Database update error:", error);
    return c.json({ error: "Failed to update score" }, 500);
  }
});

// 删除考试成绩
app.delete("/api/scores/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const examId = c.req.param("id");
    
    // 检查考试是否属于当前用户
    const examCheck = await c.env.DB.prepare(
      "SELECT * FROM exams WHERE id = ? AND student_id = ?"
    ).bind(examId, userId).all();
    
    if (examCheck.results.length === 0) {
      return c.json({ error: "考试记录不存在或无权删除" }, 404);
    }
    
    // 删除科目成绩
    await c.env.DB.prepare(
      "DELETE FROM subjects WHERE exam_id = ?"
    ).bind(examId).run();
    
    // 删除考试记录
    await c.env.DB.prepare(
      "DELETE FROM exams WHERE id = ?"
    ).bind(examId).run();
    
    return c.json({ success: true, message: "成绩删除成功" });
  } catch (error) {
    console.error("Database delete error:", error);
    return c.json({ error: "Failed to delete score" }, 500);
  }
});

app.get("/api/scores/analysis", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    
    // 查询考试成绩
    const scoresResult = await c.env.DB.prepare(
      "SELECT * FROM exams WHERE student_id = ? ORDER BY date"
    ).bind(userId).all();
    
    const exams = scoresResult.results;
    
    // 查询科目成绩
    const scoresWithSubjects: ExamScore[] = [];
    for (const exam of exams) {
      const subjectsResult = await c.env.DB.prepare(
        "SELECT * FROM subjects WHERE exam_id = ?"
      ).bind((exam as any).id).all();
      
      scoresWithSubjects.push({
        id: (exam as any).id as string,
        grade: (exam as any).grade as number,
        semester: (exam as any).semester as number,
        examType: (exam as any).examType as string,
        examName: (exam as any).examName as string,
        date: (exam as any).date as string,
        subjects: (subjectsResult.results as any[]).map((sub: any) => ({
          name: sub.name as string,
          score: sub.score as number,
          fullScore: sub.fullScore as number
        }))
      });
    }
    
    const analysis = {
      overallTrend: calculateOverallTrend(scoresWithSubjects),
      subjectTrends: calculateSubjectTrends(scoresWithSubjects),
      yearOverYearComparison: calculateYearOverYear(scoresWithSubjects),
      historicalAverage: calculateHistoricalAverage(scoresWithSubjects)
    };
    
    return c.json(analysis);
  } catch (error) {
    console.error("Database query error:", error);
    return c.json({ error: "Failed to fetch analysis" }, 500);
  }
});

interface SubjectScore {
  name: string;
  score: number;
  fullScore: number;
}

interface ExamScore {
  id: string;
  grade: number;
  semester: number;
  examType: string;
  examName: string;
  date: string;
  subjects: SubjectScore[];
}

function calculateOverallTrend(scores: ExamScore[]) {
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

function calculateSubjectTrends(scores: ExamScore[]) {
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

function calculateYearOverYear(scores: ExamScore[]) {
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

function calculateHistoricalAverage(scores: ExamScore[]) {
  const allScores: number[] = [];
  scores.forEach(exam => {
    exam.subjects.forEach(sub => {
      allScores.push((sub.score / sub.fullScore) * 100);
    });
  });
  return Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100;
}

export default app;