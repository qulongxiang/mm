-- 创建学生表
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  currentGrade INTEGER NOT NULL,
  educationStages TEXT NOT NULL,
  startYear INTEGER NOT NULL,
  email TEXT UNIQUE,
  password TEXT
);

-- 创建考试表
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  examType TEXT NOT NULL,
  examName TEXT NOT NULL,
  date TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- 创建科目成绩表
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  fullScore INTEGER NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);

-- 插入学生数据
INSERT INTO students (name, currentGrade, educationStages, startYear, email, password)
VALUES 
('屈晨西', 4, '小学', 2022, 'qcx@example.com', 'password123'),
('张三', 3, '小学', 2023, 'zhangsan@example.com', 'password123'),
('李四', 5, '小学', 2021, 'lisi@example.com', 'password123');

-- 插入屈晨西的考试数据
INSERT INTO exams (id, student_id, grade, semester, examType, examName, date)
VALUES 
('g4s1mid_qcx', 1, 4, 1, 'midterm', '四年级上学期期中', '2024-11-15'),
('g4s1final_qcx', 1, 4, 1, 'final', '四年级上学期期末', '2025-01-20'),
('g3s1mid_qcx', 1, 3, 1, 'midterm', '三年级上学期期中', '2023-11-15'),
('g3s1final_qcx', 1, 3, 1, 'final', '三年级上学期期末', '2024-01-20'),
('g3s2mid_qcx', 1, 3, 2, 'midterm', '三年级下学期期中', '2024-05-15'),
('g3s2final_qcx', 1, 3, 2, 'final', '三年级下学期期末', '2024-07-10');

-- 插入张三的考试数据
INSERT INTO exams (id, student_id, grade, semester, examType, examName, date)
VALUES 
('g3s1mid_zs', 2, 3, 1, 'midterm', '三年级上学期期中', '2024-11-15'),
('g3s1final_zs', 2, 3, 1, 'final', '三年级上学期期末', '2025-01-20');

-- 插入李四的考试数据
INSERT INTO exams (id, student_id, grade, semester, examType, examName, date)
VALUES 
('g5s1mid_ls', 3, 5, 1, 'midterm', '五年级上学期期中', '2024-11-15'),
('g5s1final_ls', 3, 5, 1, 'final', '五年级上学期期末', '2025-01-20');

-- 插入屈晨西的科目成绩数据
-- 四年级上学期期中
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g4s1mid_qcx', '语文', 92, 100),
('g4s1mid_qcx', '数学', 98, 100),
('g4s1mid_qcx', '英语', 95, 100),
('g4s1mid_qcx', '科学', 90, 100),
('g4s1mid_qcx', '道德与法治', 94, 100);

-- 四年级上学期期末
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g4s1final_qcx', '语文', 95, 100),
('g4s1final_qcx', '数学', 100, 100),
('g4s1final_qcx', '英语', 97, 100),
('g4s1final_qcx', '科学', 92, 100),
('g4s1final_qcx', '道德与法治', 96, 100);

-- 三年级上学期期中
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g3s1mid_qcx', '语文', 88, 100),
('g3s1mid_qcx', '数学', 92, 100),
('g3s1mid_qcx', '英语', 85, 100),
('g3s1mid_qcx', '科学', 87, 100),
('g3s1mid_qcx', '道德与法治', 90, 100);

-- 三年级上学期期末
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g3s1final_qcx', '语文', 90, 100),
('g3s1final_qcx', '数学', 95, 100),
('g3s1final_qcx', '英语', 88, 100),
('g3s1final_qcx', '科学', 89, 100),
('g3s1final_qcx', '道德与法治', 92, 100);

-- 三年级下学期期中
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g3s2mid_qcx', '语文', 91, 100),
('g3s2mid_qcx', '数学', 94, 100),
('g3s2mid_qcx', '英语', 90, 100),
('g3s2mid_qcx', '科学', 88, 100),
('g3s2mid_qcx', '道德与法治', 91, 100);

-- 三年级下学期期末
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g3s2final_qcx', '语文', 93, 100),
('g3s2final_qcx', '数学', 97, 100),
('g3s2final_qcx', '英语', 92, 100),
('g3s2final_qcx', '科学', 90, 100),
('g3s2final_qcx', '道德与法治', 93, 100);

-- 插入张三的科目成绩数据
-- 三年级上学期期中
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g3s1mid_zs', '语文', 85, 100),
('g3s1mid_zs', '数学', 90, 100),
('g3s1mid_zs', '英语', 82, 100),
('g3s1mid_zs', '科学', 85, 100),
('g3s1mid_zs', '道德与法治', 88, 100);

-- 三年级上学期期末
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g3s1final_zs', '语文', 87, 100),
('g3s1final_zs', '数学', 92, 100),
('g3s1final_zs', '英语', 85, 100),
('g3s1final_zs', '科学', 88, 100),
('g3s1final_zs', '道德与法治', 90, 100);

-- 插入李四的科目成绩数据
-- 五年级上学期期中
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g5s1mid_ls', '语文', 90, 100),
('g5s1mid_ls', '数学', 95, 100),
('g5s1mid_ls', '英语', 88, 100),
('g5s1mid_ls', '科学', 92, 100),
('g5s1mid_ls', '道德与法治', 94, 100);

-- 五年级上学期期末
INSERT INTO subjects (exam_id, name, score, fullScore)
VALUES 
('g5s1final_ls', '语文', 92, 100),
('g5s1final_ls', '数学', 97, 100),
('g5s1final_ls', '英语', 90, 100),
('g5s1final_ls', '科学', 94, 100),
('g5s1final_ls', '道德与法治', 96, 100);
