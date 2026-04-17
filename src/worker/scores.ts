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

const scoresData: ScoresData = {
  "student": {
    "name": "屈晨西",
    "currentGrade": 4,
    "educationStages": ["小学"],
    "startYear": 2022
  },
  "scores": [
    {
      "id": "g4s1mid",
      "grade": 4,
      "semester": 1,
      "examType": "midterm",
      "examName": "四年级上学期期中",
      "date": "2024-11-15",
      "subjects": [
        { "name": "语文", "score": 92, "fullScore": 100 },
        { "name": "数学", "score": 98, "fullScore": 100 },
        { "name": "英语", "score": 95, "fullScore": 100 },
        { "name": "科学", "score": 90, "fullScore": 100 },
        { "name": "道德与法治", "score": 94, "fullScore": 100 }
      ]
    },
    {
      "id": "g4s1final",
      "grade": 4,
      "semester": 1,
      "examType": "final",
      "examName": "四年级上学期期末",
      "date": "2025-01-20",
      "subjects": [
        { "name": "语文", "score": 95, "fullScore": 100 },
        { "name": "数学", "score": 100, "fullScore": 100 },
        { "name": "英语", "score": 97, "fullScore": 100 },
        { "name": "科学", "score": 92, "fullScore": 100 },
        { "name": "道德与法治", "score": 96, "fullScore": 100 }
      ]
    },
    {
      "id": "g3s1mid",
      "grade": 3,
      "semester": 1,
      "examType": "midterm",
      "examName": "三年级上学期期中",
      "date": "2023-11-15",
      "subjects": [
        { "name": "语文", "score": 88, "fullScore": 100 },
        { "name": "数学", "score": 92, "fullScore": 100 },
        { "name": "英语", "score": 85, "fullScore": 100 },
        { "name": "科学", "score": 87, "fullScore": 100 },
        { "name": "道德与法治", "score": 90, "fullScore": 100 }
      ]
    },
    {
      "id": "g3s1final",
      "grade": 3,
      "semester": 1,
      "examType": "final",
      "examName": "三年级上学期期末",
      "date": "2024-01-20",
      "subjects": [
        { "name": "语文", "score": 90, "fullScore": 100 },
        { "name": "数学", "score": 95, "fullScore": 100 },
        { "name": "英语", "score": 88, "fullScore": 100 },
        { "name": "科学", "score": 89, "fullScore": 100 },
        { "name": "道德与法治", "score": 92, "fullScore": 100 }
      ]
    },
    {
      "id": "g3s2mid",
      "grade": 3,
      "semester": 2,
      "examType": "midterm",
      "examName": "三年级下学期期中",
      "date": "2024-05-15",
      "subjects": [
        { "name": "语文", "score": 91, "fullScore": 100 },
        { "name": "数学", "score": 94, "fullScore": 100 },
        { "name": "英语", "score": 90, "fullScore": 100 },
        { "name": "科学", "score": 88, "fullScore": 100 },
        { "name": "道德与法治", "score": 91, "fullScore": 100 }
      ]
    },
    {
      "id": "g3s2final",
      "grade": 3,
      "semester": 2,
      "examType": "final",
      "examName": "三年级下学期期末",
      "date": "2024-07-10",
      "subjects": [
        { "name": "语文", "score": 93, "fullScore": 100 },
        { "name": "数学", "score": 97, "fullScore": 100 },
        { "name": "英语", "score": 92, "fullScore": 100 },
        { "name": "科学", "score": 90, "fullScore": 100 },
        { "name": "道德与法治", "score": 93, "fullScore": 100 }
      ]
    },
    {
      "id": "g2s1mid",
      "grade": 2,
      "semester": 1,
      "examType": "midterm",
      "examName": "二年级上学期期中",
      "date": "2022-11-15",
      "subjects": [
        { "name": "语文", "score": 85, "fullScore": 100 },
        { "name": "数学", "score": 90, "fullScore": 100 },
        { "name": "英语", "score": 82, "fullScore": 100 }
      ]
    },
    {
      "id": "g2s1final",
      "grade": 2,
      "semester": 1,
      "examType": "final",
      "examName": "二年级上学期期末",
      "date": "2023-01-15",
      "subjects": [
        { "name": "语文", "score": 87, "fullScore": 100 },
        { "name": "数学", "score": 92, "fullScore": 100 },
        { "name": "英语", "score": 85, "fullScore": 100 }
      ]
    },
    {
      "id": "g2s2mid",
      "grade": 2,
      "semester": 2,
      "examType": "midterm",
      "examName": "二年级下学期期中",
      "date": "2023-05-15",
      "subjects": [
        { "name": "语文", "score": 86, "fullScore": 100 },
        { "name": "数学", "score": 91, "fullScore": 100 },
        { "name": "英语", "score": 84, "fullScore": 100 }
      ]
    },
    {
      "id": "g2s2final",
      "grade": 2,
      "semester": 2,
      "examType": "final",
      "examName": "二年级下学期期末",
      "date": "2023-07-10",
      "subjects": [
        { "name": "语文", "score": 89, "fullScore": 100 },
        { "name": "数学", "score": 94, "fullScore": 100 },
        { "name": "英语", "score": 87, "fullScore": 100 }
      ]
    }
  ]
};

export default scoresData;