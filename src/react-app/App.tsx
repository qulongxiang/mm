import { useState, useEffect, useRef } from "react";
import "./App.css";
import type { ScoresData, AnalysisData, ExamScore } from "./types";
import * as echarts from "echarts";
import Login from "./Login";

// 工具函数
const getExamAverage = (exam: ExamScore, subjectFilter?: string | null) => {
  const subjects = subjectFilter
    ? exam.subjects.filter(s => s.name === subjectFilter)
    : exam.subjects;
  if (subjects.length === 0) return 0;
  const avg = subjects.reduce((sum, s) => sum + s.score / s.fullScore * 100, 0) / subjects.length;
  return Math.round(avg * 10) / 10;
};

const getSubjectScore = (exam: ExamScore, subject: string) => {
  const sub = exam.subjects.find((s) => s.name === subject);
  if (!sub) return "-";
  return `${sub.score}/${sub.fullScore}`;
};

const getComparison = (current: ExamScore, previous: ExamScore | null, subjectFilter?: string | null) => {
  if (!previous) return null;
  const currentAvg = getExamAverage(current, subjectFilter);
  const previousAvg = getExamAverage(previous, subjectFilter);
  const diff = currentAvg - previousAvg;
  return {
    value: Math.round(diff * 10) / 10,
    type: diff > 0 ? "up" : diff < 0 ? "down" : "same"
  };
};

// 计算标准差
const calculateStdDev = (scores: number[]) => {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
};

// 计算达标率
const calculateAchievementRate = (scores: number[], threshold: number) => {
  if (scores.length === 0) return 0;
  const count = scores.filter(s => s >= threshold).length;
  return Math.round((count / scores.length) * 100);
};

// 获取学期类型
const getSemesterType = (examName: string): '上学期' | '下学期' | '其他' => {
  if (examName.includes('上学期')) return '上学期';
  if (examName.includes('下学期')) return '下学期';
  return '其他';
};

const getYearlyComparison = (data: ScoresData | null) => {
  if (!data) return [];
  const byYear: Record<number, ExamScore[]> = {};
  data.scores.forEach((exam) => {
    const year = new Date(exam.date).getFullYear();
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(exam);
  });
  const years = Object.keys(byYear).map(Number).sort();
  const comparisons: { year: number; avg: number; compare?: number }[] = [];
  years.forEach((year, idx) => {
    const avg = byYear[year].reduce((sum, ex) => sum + getExamAverage(ex), 0) / byYear[year].length;
    const result: { year: number; avg: number; compare?: number } = { year, avg: Math.round(avg * 10) / 10 };
    if (idx > 0) {
      const prevAvg = comparisons[idx - 1].avg;
      result.compare = Math.round((result.avg - prevAvg) * 10) / 10;
    }
    comparisons.push(result);
  });
  return comparisons;
};

const getSemesterComparison = (data: ScoresData | null, selectedGrade: number | null) => {
  if (!data) return [];
  const filteredScores = selectedGrade
    ? data.scores.filter((s) => s.grade === selectedGrade)
    : data.scores;
  const sortedScores = [...filteredScores].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const semesters: { label: string; avg: number; compare?: number }[] = [];
  sortedScores.forEach((exam, idx) => {
    const label = exam.examName;
    const avg = getExamAverage(exam);
    const result: { label: string; avg: number; compare?: number } = { label, avg };
    if (idx > 0) {
      const prevAvg = semesters[idx - 1].avg;
      result.compare = Math.round((avg - prevAvg) * 10) / 10;
    }
    semesters.push(result);
  });
  return semesters;
};

function App() {
  const [data, setData] = useState<ScoresData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const semesterChartRef = useRef<HTMLDivElement>(null);
  const subjectChartRef = useRef<HTMLDivElement>(null);
  const yearlyChartRef = useRef<HTMLDivElement>(null);
  const radarChartRef = useRef<HTMLDivElement>(null);
  const stabilityChartRef = useRef<HTMLDivElement>(null);

  const handleLogin = (token: string) => {
    setToken(token);
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setToken(null);
    setData(null);
    setAnalysis(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // 从 Worker API 获取数据
    fetch("/api/scores", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data: ScoresData) => {
        setData(data);
        // 不再默认选中年级，让用户自己选择
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading scores data:', error);
        // 清除 token 并显示登录页面
        handleLogout();
      });
  }, [token]);

  useEffect(() => {
    // 本地计算分析数据
    const calculateAnalysis = (scores: ExamScore[], subjectFilter?: string | null) => {
      if (scores.length === 0) {
        return {
          overallTrend: { startScore: 0, currentScore: 0, improvement: 0 },
          subjectTrends: {},
          yearOverYearComparison: {},
          historicalAverage: 0,
          stability: {},
          balance: { imbalance: 0, weakestSubject: '', strongestSubject: '' },
          achievementRates: { excellent: 0, good: 0, pass: 0 },
          weakPoints: [],
          learningCurve: { acceleration: 0, trend: '稳定' },
          semesterComparison: { first: 0, second: 0 }
        };
      }

      const overallTrend = {
        startScore: 0,
        currentScore: 0,
        improvement: 0
      };
      const subjectTrends: Record<string, { average: number; latest: number; trend: string }> = {};
      const yearOverYearComparison: Record<string, number> = {};
      let historicalAverage = 0;

      // 过滤科目
      const filteredScores = subjectFilter
        ? scores.map(exam => ({
            ...exam,
            subjects: exam.subjects.filter(s => s.name === subjectFilter)
          })).filter(exam => exam.subjects.length > 0)
        : scores;

      // 计算总体趋势
      const sorted = [...filteredScores].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sorted.length > 0) {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const firstAvg = first.subjects.reduce((sum, s) => sum + s.score / s.fullScore * 100, 0) / first.subjects.length;
        const lastAvg = last.subjects.reduce((sum, s) => sum + s.score / s.fullScore * 100, 0) / last.subjects.length;
        overallTrend.startScore = Math.round(firstAvg * 100) / 100;
        overallTrend.currentScore = Math.round(lastAvg * 100) / 100;
        overallTrend.improvement = Math.round((lastAvg - firstAvg) * 100) / 100;
      }

      // 计算科目趋势
      const subjectMap = new Map<string, number[]>();
      filteredScores.forEach(exam => {
        exam.subjects.forEach(sub => {
          const percent = (sub.score / sub.fullScore) * 100;
          if (!subjectMap.has(sub.name)) subjectMap.set(sub.name, []);
          subjectMap.get(sub.name)!.push(percent);
        });
      });
      subjectMap.forEach((scores, name) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const latest = scores[scores.length - 1];
        const trend = latest > scores[0] ? "上升" : latest < scores[0] ? "下降" : "持平";
        subjectTrends[name] = {
          average: Math.round(avg * 100) / 100,
          latest: Math.round(latest * 100) / 100,
          trend
        };
      });

      // 计算年度同比
      const byYear: Record<number, number[]> = {};
      filteredScores.forEach(exam => {
        const year = new Date(exam.date).getFullYear();
        const avg = exam.subjects.reduce((sum, s) => sum + s.score / s.fullScore * 100, 0) / exam.subjects.length;
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(avg);
      });
      Object.keys(byYear).sort().forEach(yearStr => {
        const year = parseInt(yearStr, 10);
        const yearScores = byYear[year];
        const avg = yearScores.reduce((a: number, b: number) => a + b, 0) / yearScores.length;
        yearOverYearComparison[year + "年均分"] = Math.round(avg * 100) / 100;
      });

      // 计算历史平均
      const allScores: number[] = [];
      filteredScores.forEach(exam => {
        exam.subjects.forEach(sub => {
          allScores.push((sub.score / sub.fullScore) * 100);
        });
      });
      if (allScores.length > 0) {
        historicalAverage = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100;
      }

      // 新增：稳定性分析（标准差）
      const stability: Record<string, { stdDev: number; cv: number; level: string }> = {};
      subjectMap.forEach((scores, name) => {
        const stdDev = calculateStdDev(scores);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const cv = mean > 0 ? (stdDev / mean) * 100 : 0; // 变异系数
        stability[name] = {
          stdDev: Math.round(stdDev * 100) / 100,
          cv: Math.round(cv * 100) / 100,
          level: cv < 5 ? '非常稳定' : cv < 10 ? '较稳定' : cv < 15 ? '一般' : '波动较大'
        };
      });

      // 新增：学科均衡度分析
      const subjectAverages = Array.from(subjectMap.entries()).map(([name, scores]) => ({
        name,
        average: scores.reduce((a, b) => a + b, 0) / scores.length
      }));
      
      let imbalance = 0;
      let weakestSubject = '';
      let strongestSubject = '';
      
      if (subjectAverages.length > 1) {
        // 多科目情况：计算不同科目的分差
        const averages = subjectAverages.map(s => s.average);
        imbalance = Math.max(...averages) - Math.min(...averages);
        weakestSubject = subjectAverages.reduce((min, curr) => curr.average < min.average ? curr : min).name;
        strongestSubject = subjectAverages.reduce((max, curr) => curr.average > max.average ? curr : max).name;
      } else if (subjectAverages.length === 1) {
        // 单科目情况：计算该科目在不同考试中的分差
        const subjectName = subjectAverages[0].name;
        const subjectScores = subjectMap.get(subjectName) || [];
        if (subjectScores.length > 1) {
          imbalance = Math.max(...subjectScores) - Math.min(...subjectScores);
          weakestSubject = subjectName;
          strongestSubject = subjectName;
        }
      }
      
      const balance = {
        imbalance: Math.round(imbalance * 100) / 100,
        weakestSubject,
        strongestSubject
      };

      // 新增：达标率统计
      const excellentRate = calculateAchievementRate(allScores, 90);
      const goodRate = calculateAchievementRate(allScores, 80);
      const passRate = calculateAchievementRate(allScores, 60);
      const achievementRates = {
        excellent: excellentRate,
        good: goodRate,
        pass: passRate
      };

      // 新增：薄弱环节识别
      const weakPoints = subjectAverages
        .filter(s => s.average < 85)
        .map(s => ({
          subject: s.name,
          average: Math.round(s.average * 100) / 100,
          gap: Math.round((85 - s.average) * 100) / 100,
          suggestion: s.average < 70 ? '需要重点加强基础训练' : 
                     s.average < 80 ? '建议增加练习量，巩固知识点' : 
                     '保持当前水平，争取突破优秀线'
        }))
        .sort((a, b) => a.average - b.average);

      // 新增：学习曲线斜率分析
      const examAverages = sorted.map(exam => {
        const avg = exam.subjects.reduce((sum, s) => sum + s.score / s.fullScore * 100, 0) / exam.subjects.length;
        return avg;
      });
      
      let acceleration = 0;
      let curveTrend = '稳定';
      
      if (examAverages.length >= 3) {
        // 计算前半段和后半段的平均进步速度
        const midPoint = Math.floor(examAverages.length / 2);
        const firstHalf = examAverages.slice(0, midPoint);
        const secondHalf = examAverages.slice(midPoint);
        
        const firstHalfImprovement = (firstHalf[firstHalf.length - 1] - firstHalf[0]) / firstHalf.length;
        const secondHalfImprovement = (secondHalf[secondHalf.length - 1] - secondHalf[0]) / secondHalf.length;
        
        acceleration = Math.round((secondHalfImprovement - firstHalfImprovement) * 100) / 100;
        curveTrend = acceleration > 2 ? '加速进步' : acceleration > 0 ? '稳步进步' : acceleration > -2 ? '进步放缓' : '需要关注';
      }
      
      const learningCurve = {
        acceleration,
        trend: curveTrend
      };

      // 新增：学期对比分析
      const firstSemesterScores = filteredScores.filter(exam => getSemesterType(exam.examName) === '上学期');
      const secondSemesterScores = filteredScores.filter(exam => getSemesterType(exam.examName) === '下学期');
      
      const firstSemesterAvg = firstSemesterScores.length > 0
        ? firstSemesterScores.reduce((sum, exam) => {
            const avg = exam.subjects.reduce((s, sub) => s + sub.score / sub.fullScore * 100, 0) / exam.subjects.length;
            return sum + avg;
          }, 0) / firstSemesterScores.length
        : 0;
      
      const secondSemesterAvg = secondSemesterScores.length > 0
        ? secondSemesterScores.reduce((sum, exam) => {
            const avg = exam.subjects.reduce((s, sub) => s + sub.score / sub.fullScore * 100, 0) / exam.subjects.length;
            return sum + avg;
          }, 0) / secondSemesterScores.length
        : 0;
      
      const semesterComparison = {
        first: Math.round(firstSemesterAvg * 100) / 100,
        second: Math.round(secondSemesterAvg * 100) / 100
      };

      return {
        overallTrend,
        subjectTrends,
        yearOverYearComparison,
        historicalAverage,
        stability,
        balance,
        achievementRates,
        weakPoints,
        learningCurve,
        semesterComparison
      };
    };

    // 当数据加载完成后计算分析
    if (data) {
      // 计算不受筛选影响的分析数据（成绩稳定性）
      const fullAnalysis = calculateAnalysis(data.scores, null);
      // 计算受筛选影响的分析数据
      const filteredData = selectedSubject
        ? data.scores.map(exam => ({
            ...exam,
            subjects: exam.subjects.filter(s => s.name === selectedSubject)
          })).filter(exam => exam.subjects.length > 0)
        : data.scores;
      const filteredAnalysis = calculateAnalysis(filteredData, selectedSubject);
      // 合并分析数据，使用不受筛选影响的成绩稳定性
      setAnalysis({
        ...filteredAnalysis,
        stability: fullAnalysis.stability
      });
    }
  }, [data, selectedSubject]);

  useEffect(() => {
    if (!data) return;
    
    // 初始化学期成绩走势图表
    if (semesterChartRef.current) {
      const semesterChart = echarts.init(semesterChartRef.current);
      const semesterData = getSemesterComparison(data, selectedGrade);
      
      const option = {
        title: {
          text: '学期成绩走势',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: semesterData.map(item => item.label),
          axisLabel: {
            rotate: 45,
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          min: 80,
          max: 100
        },
        series: [{
          name: '平均分',
          type: 'bar',
          data: semesterData.map(item => item.avg),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' }
            ])
          },
          label: {
            show: true,
            position: 'top'
          }
        }]
      };
      
      semesterChart.setOption(option);
      window.addEventListener('resize', () => semesterChart.resize());
    }

    // 初始化科目趋势图表
    if (subjectChartRef.current && data) {
      const subjectChart = echarts.init(subjectChartRef.current);
      
      // 基于筛选后的成绩计算科目统计
      const filteredScoresForChart = selectedGrade
        ? data.scores.filter((s) => s.grade === selectedGrade)
        : data.scores;
      
      const subjectMap = new Map<string, number[]>();
      filteredScoresForChart.forEach(exam => {
        exam.subjects.forEach(sub => {
          const percent = (sub.score / sub.fullScore) * 100;
          if (!subjectMap.has(sub.name)) subjectMap.set(sub.name, []);
          subjectMap.get(sub.name)!.push(percent);
        });
      });
      
      const subjects = Array.from(subjectMap.keys());
      const averages = subjects.map(sub => {
        const scores = subjectMap.get(sub)!;
        return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      });
      
      // 获取最新成绩
      const latestExam = [...filteredScoresForChart].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      const latest = subjects.map(sub => {
        if (!latestExam) return 0;
        const subData = latestExam.subjects.find(s => s.name === sub);
        return subData ? Math.round((subData.score / subData.fullScore) * 100 * 10) / 10 : 0;
      });
      
      const option = {
        title: {
          text: '各科成绩对比',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['平均成绩', '最新成绩'],
          bottom: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: subjects
        },
        yAxis: {
          type: 'value',
          min: 80,
          max: 100
        },
        series: [
          {
            name: '平均成绩',
            type: 'bar',
            data: averages,
            itemStyle: {
              color: '#91cc75'
            }
          },
          {
            name: '最新成绩',
            type: 'bar',
            data: latest,
            itemStyle: {
              color: '#fac858'
            }
          }
        ]
      };
      
      subjectChart.setOption(option);
      window.addEventListener('resize', () => subjectChart.resize());
    }

    // 初始化年度同比图表
    if (yearlyChartRef.current) {
      const yearlyChart = echarts.init(yearlyChartRef.current);
      const yearlyData = getYearlyComparison(data);
      
      const option = {
        title: {
          text: '年度成绩走势',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: yearlyData.map(item => item.year + '年')
        },
        yAxis: {
          type: 'value',
          min: 80,
          max: 100
        },
        series: [{
          name: '年均分',
          type: 'line',
          data: yearlyData.map(item => item.avg),
          smooth: true,
          lineStyle: {
            width: 3,
            color: '#667eea'
          },
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#667eea'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
              { offset: 1, color: 'rgba(102, 126, 234, 0.1)' }
            ])
          }
        }]
      };
      
      yearlyChart.setOption(option);
      window.addEventListener('resize', () => yearlyChart.resize());
    }

    // 新增：雷达图 - 学科能力分布
    if (radarChartRef.current && analysis) {
      const radarChart = echarts.init(radarChartRef.current);
      
      // 基于筛选后的成绩计算各科平均分
      const filteredScoresForRadar = selectedGrade
        ? data.scores.filter((s) => s.grade === selectedGrade)
        : data.scores;
      
      const subjectMap = new Map<string, number[]>();
      filteredScoresForRadar.forEach(exam => {
        exam.subjects.forEach(sub => {
          const percent = (sub.score / sub.fullScore) * 100;
          if (!subjectMap.has(sub.name)) subjectMap.set(sub.name, []);
          subjectMap.get(sub.name)!.push(percent);
        });
      });
      
      const subjects = Array.from(subjectMap.keys());
      const averages = subjects.map(sub => {
        const scores = subjectMap.get(sub)!;
        return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      });
      
      const option = {
        title: {
          text: '学科能力分布',
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        radar: {
          indicator: subjects.map(name => ({ name, max: 100 })),
          radius: '65%'
        },
        series: [{
          name: '学科能力',
          type: 'radar',
          data: [{
            value: averages,
            name: '平均成绩',
            areaStyle: {
              color: 'rgba(102, 126, 234, 0.3)'
            },
            lineStyle: {
              color: '#667eea',
              width: 2
            },
            itemStyle: {
              color: '#667eea'
            }
          }]
        }]
      };
      
      radarChart.setOption(option);
      window.addEventListener('resize', () => radarChart.resize());
    }

    // 新增：稳定性分析图表
    if (stabilityChartRef.current && analysis) {
      const stabilityChart = echarts.init(stabilityChartRef.current);
      
      const filteredScoresForStability = selectedGrade
        ? data.scores.filter((s) => s.grade === selectedGrade)
        : data.scores;
      
      const subjectMap = new Map<string, number[]>();
      filteredScoresForStability.forEach(exam => {
        exam.subjects.forEach(sub => {
          const percent = (sub.score / sub.fullScore) * 100;
          if (!subjectMap.has(sub.name)) subjectMap.set(sub.name, []);
          subjectMap.get(sub.name)!.push(percent);
        });
      });
      
      const subjects = Array.from(subjectMap.keys());
      const stdDevs = subjects.map(sub => {
        const scores = subjectMap.get(sub)!;
        const stdDev = calculateStdDev(scores);
        return Math.round(stdDev * 10) / 10;
      });
      
      const cvs = subjects.map(sub => {
        const scores = subjectMap.get(sub)!;
        const stdDev = calculateStdDev(scores);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
        return Math.round(cv * 10) / 10;
      });
      
      const option = {
        title: {
          text: '成绩稳定性分析',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['标准差', '变异系数(%)'],
          bottom: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: subjects
        },
        yAxis: [
          {
            type: 'value',
            name: '标准差',
            position: 'left'
          },
          {
            type: 'value',
            name: '变异系数(%)',
            position: 'right'
          }
        ],
        series: [
          {
            name: '标准差',
            type: 'bar',
            data: stdDevs,
            itemStyle: {
              color: '#ee6666'
            }
          },
          {
            name: '变异系数(%)',
            type: 'line',
            yAxisIndex: 1,
            data: cvs,
            itemStyle: {
              color: '#fac858'
            }
          }
        ]
      };
      
      stabilityChart.setOption(option);
      window.addEventListener('resize', () => stabilityChart.resize());
    }
  }, [data, analysis, selectedGrade, selectedSubject]);

  if (!token) return <Login onLogin={handleLogin} />;
  if (loading || !data) return <div className="loading">加载中...</div>;

  const grades = [...new Set(data.scores.map((s) => s.grade))].sort((a, b) => b - a);
  const subjects = [...new Set(data.scores.flatMap((s) => s.subjects.map((sub) => sub.name)))];
  const filteredScores = selectedGrade
    ? data.scores.filter((s) => s.grade === selectedGrade)
    : data.scores;

  const sortedScores = [...filteredScores].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // 获取最新考试成绩
  const latestExam = sortedScores[0];
  const previousExam = sortedScores[1];
  const latestAvg = latestExam ? getExamAverage(latestExam) : 0;
  const previousAvg = previousExam ? getExamAverage(previousExam) : 0;
  const overallTrend = latestExam && previousExam ? {
    value: Math.round((latestAvg - previousAvg) * 10) / 10,
    type: latestAvg > previousAvg ? "up" : latestAvg < previousAvg ? "down" : "same"
  } : null;

  // 计算各科趋势
  const subjectTrends = latestExam && previousExam ? latestExam.subjects.map(subject => {
    const latestScore = subject.score;
    const previousSub = previousExam.subjects.find(s => s.name === subject.name);
    const previousScore = previousSub ? previousSub.score : 0;
    const diff = latestScore - previousScore;
    return {
      name: subject.name,
      latestScore,
      previousScore,
      diff: Math.round(diff * 10) / 10,
      type: diff > 0 ? "up" : diff < 0 ? "down" : "same"
    };
  }) : [];

  // 计算统计维度
  const statistics = {
    totalExams: filteredScores.length,
    averageScore: analysis ? analysis.historicalAverage : 0,
    highestScore: filteredScores.length > 0 ? Math.max(...filteredScores.map(exam => getExamAverage(exam, selectedSubject))) : 0,
    lowestScore: filteredScores.length > 0 ? Math.min(...filteredScores.map(exam => getExamAverage(exam, selectedSubject))) : 0,
    improvementRate: overallTrend ? overallTrend.value : 0
  };



  // 计算年级统计数据
  const gradeStatistics = grades.map(grade => {
    const gradeScores = data.scores.filter(s => s.grade === grade);
    const avg = gradeScores.length > 0 ? gradeScores.reduce((sum, exam) => sum + getExamAverage(exam), 0) / gradeScores.length : 0;
    return {
      grade,
      average: Math.round(avg * 10) / 10,
      count: gradeScores.length
    };
  });

  return (
    <div className="container">
      <header className="header">
        <div className="header-top">
          <h1>📊 {data.student.name} 成绩追踪</h1>
          <button className="logout-button" onClick={handleLogout}>退出登录</button>
        </div>
        <p className="subtitle">当前年级: {data.student.currentGrade}年级 | 教育阶段: {data.student.educationStages}</p>
      </header>

      {/* 最新成绩概览 */}
      <section className="overview">
        <div className="card">
          <h3>🏆 最新成绩概览</h3>
          {latestExam && (
            <div className="latest-score-detail">
              <div className="exam-header">
                <div className="exam-badge">{latestExam.examType === 'midterm' ? '期中考试' : '期末考试'}</div>
                <div className="exam-info">
                  <h4>{latestExam.examName}</h4>
                  <p>考试日期: {latestExam.date}</p>
                </div>
              </div>
              <div className="overall-stats">
                <div className="stat main-stat">
                  <span className="stat-label">总分</span>
                  <span className="stat-value highlight large">{latestExam.subjects.reduce((sum, s) => sum + s.score, 0)}/{latestExam.subjects.reduce((sum, s) => sum + s.fullScore, 0)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">平均分</span>
                  <span className="stat-value">{latestAvg}</span>
                </div>
                {overallTrend && (
                  <div className="stat">
                    <span className="stat-label">相比上次</span>
                    <span className={`stat-value ${overallTrend.type === 'up' ? 'positive' : overallTrend.type === 'down' ? 'negative' : ''}`}>
                      {overallTrend.value >= 0 ? '+' : ''}{overallTrend.value} {overallTrend.type === 'up' ? '↑' : overallTrend.type === 'down' ? '↓' : '→'}
                    </span>
                  </div>
                )}
              </div>
              <div className="subjects-detail">
                <h4>📚 各科成绩</h4>
                <div className="subject-grid">
                  {latestExam.subjects.map((sub) => {
                    const percentage = (sub.score / sub.fullScore) * 100;
                    const grade = percentage >= 90 ? 'excellent' : percentage >= 80 ? 'good' : percentage >= 60 ? 'pass' : 'fail';
                    return (
                      <div key={sub.name} className={`subject-item ${grade}`}>
                        <span className="subject-name">{sub.name}</span>
                        <span className="subject-score">{sub.score}/{sub.fullScore}</span>
                        <span className={`subject-badge ${grade}`}>
                          {percentage >= 90 ? '优秀' : percentage >= 80 ? '良好' : percentage >= 60 ? '及格' : '待提高'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {previousExam && (
                <div className="improvement-tip">
                  {overallTrend && overallTrend.type === 'up' ? '🎉 继续保持，成绩在稳步提升！' : 
                   overallTrend && overallTrend.type === 'down' ? '💪 不要气馁，分析错题，继续努力！' : 
                   '👍 成绩稳定，再接再厉！'}
                </div>
              )}
              
              {/* 各科成绩趋势 */}
              <div className="subject-trends-section">
                <h4>📈 各科成绩趋势</h4>
                <div className="subject-trends">
                  {subjectTrends.map((trend) => (
                    <div key={trend.name} className="subject-trend-item">
                      <span className="subject-name">{trend.name}</span>
                      <div className="score-info">
                        <span className="latest-score">{trend.latestScore}</span>
                        <span className={`trend-indicator ${trend.type === 'up' ? 'positive' : trend.type === 'down' ? 'negative' : ''}`}>
                          {trend.type === 'up' ? '↑' : trend.type === 'down' ? '↓' : '→'} {Math.abs(trend.diff)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 年级对比（不受筛选影响） */}
      <section className="statistics">
        <div className="card">
          <h3>📈 年级对比</h3>
          <div className="grade-stats">
            {gradeStatistics.map((stat) => (
              <div key={stat.grade} className="grade-stat-item">
                <span className="grade-name">{stat.grade}年级</span>
                <div className="grade-stats-details">
                  <span>平均分: {stat.average}</span>
                  <span>考试次数: {stat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 成绩稳定性（不受筛选影响） */}
      {analysis && Object.keys(analysis.stability).length > 0 && (
        <section className="stability-section">
          <h2>📊 成绩稳定性</h2>
          <div className="card">
            <div className="stability-grid">
              {Object.entries(analysis.stability).map(([subject, stability]) => (
                <div key={subject} className="stability-item">
                  <span className="stability-subject">{subject}</span>
                  <div className="stability-details">
                    <span>波动: {stability.stdDev}分</span>
                    <span className={`stability-level ${
                      stability.level === '非常稳定' ? 'excellent' :
                      stability.level === '较稳定' ? 'good' :
                      stability.level === '一般' ? 'warning' : 'danger'
                    }`}>
                      {stability.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 各科统计（不受筛选影响） */}
      <section className="statistics">
        <div className="card">
          <h3>📚 各科统计</h3>
          <div className="subject-stats">
            {subjects.map(subject => {
              const scores = data.scores.flatMap(exam => {
                const sub = exam.subjects.find(s => s.name === subject);
                return sub ? [sub.score] : [];
              });
              const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
              const max = scores.length > 0 ? Math.max(...scores) : 0;
              const min = scores.length > 0 ? Math.min(...scores) : 0;
              return (
                <div key={subject} className="subject-stat-item">
                  <span className="subject-name">{subject}</span>
                  <div className="subject-stats-details">
                    <span>平均: {Math.round(avg * 10) / 10}</span>
                    <span>最高: {max}</span>
                    <span>最低: {min}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ECharts 图表 */}
      <section className="charts-section">
        <div className="card">
          <h3>📊 学期成绩走势</h3>
          <div ref={semesterChartRef} className="chart-container"></div>
        </div>

        <div className="card">
          <h3>📚 各科成绩对比</h3>
          <div ref={subjectChartRef} className="chart-container"></div>
        </div>

        <div className="card">
          <h3>📅 年度同比分析</h3>
          <div ref={yearlyChartRef} className="chart-container"></div>
        </div>

        <div className="card">
          <h3>🎯 学科能力雷达图</h3>
          <div ref={radarChartRef} className="chart-container"></div>
        </div>

        <div className="card">
          <h3>📉 成绩稳定性分析</h3>
          <div ref={stabilityChartRef} className="chart-container"></div>
        </div>
      </section>

      {/* 筛选器 */}
      <section className="filters">
        <label>选择年级:</label>
        <select value={selectedGrade ?? ""} onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : null)}>
          <option value="">全部年级</option>
          {grades.map((g) => (
            <option key={g} value={g}>{g}年级</option>
          ))}
        </select>
        <label>选择科目:</label>
        <select value={selectedSubject ?? ""} onChange={(e) => setSelectedSubject(e.target.value || null)}>
          <option value="">全部科目</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </section>

      {/* 成绩明细表 */}
      <section className="score-table-section">
        <h2>📋 成绩明细</h2>
        <div className="table-wrapper">
          <table className="score-table">
            <thead>
              <tr>
                <th>考试名称</th>
                <th>日期</th>
                {subjects.filter(s => !selectedSubject || s === selectedSubject).map((s) => (
                  <th key={s}>{s}</th>
                ))}
                <th>平均分</th>
                <th>环比</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.map((exam, idx) => {
                const prev = idx < filteredScores.length - 1 ? filteredScores[idx + 1] : null;
                const comp = getComparison(exam, prev);
                return (
                  <tr key={exam.id}>
                    <td className="exam-name">{exam.examName}</td>
                    <td>{exam.date}</td>
                    {subjects.filter(s => !selectedSubject || s === selectedSubject).map((s) => (
                      <td key={s}>{getSubjectScore(exam, s)}</td>
                    ))}
                    <td className="avg">{getExamAverage(exam)}</td>
                    <td className={`compare ${comp?.type || ''}`}>
                      {comp ? (
                        <>
                          {comp.value >= 0 ? '+' : ''}{comp.value}
                          {comp.type === 'up' ? ' ↑' : comp.type === 'down' ? ' ↓' : ''}
                        </>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 新增：深度分析维度 */}
      {analysis && (
        <section className="advanced-analysis">
          <h2>🔍 深度分析</h2>
          
          {/* 达标率统计 */}
          <div className="card">
            <h3>🎯 达标率统计</h3>
            <div className="achievement-rates">
              <div className="rate-item excellent">
                <span className="rate-label">优秀率 (≥90分)</span>
                <span className="rate-value">{analysis.achievementRates.excellent}%</span>
                <div className="rate-bar">
                  <div className="rate-fill" style={{ width: `${analysis.achievementRates.excellent}%` }}></div>
                </div>
              </div>
              <div className="rate-item good">
                <span className="rate-label">良好率 (≥80分)</span>
                <span className="rate-value">{analysis.achievementRates.good}%</span>
                <div className="rate-bar">
                  <div className="rate-fill" style={{ width: `${analysis.achievementRates.good}%` }}></div>
                </div>
              </div>
              <div className="rate-item pass">
                <span className="rate-label">及格率 (≥60分)</span>
                <span className="rate-value">{analysis.achievementRates.pass}%</span>
                <div className="rate-bar">
                  <div className="rate-fill" style={{ width: `${analysis.achievementRates.pass}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 学科均衡度 */}
          <div className="card">
            <h3>⚖️ 学科均衡度</h3>
            <div className="balance-info">
              <div className="balance-stat">
                <span className="stat-label">{selectedSubject ? '分数波动' : '最大分差'}</span>
                <span className={`stat-value ${analysis.balance.imbalance > 15 ? 'warning' : analysis.balance.imbalance > 10 ? 'info' : 'good'}`}>
                  {analysis.balance.imbalance}分
                </span>
              </div>
              {!selectedSubject && analysis.balance.weakestSubject && analysis.balance.strongestSubject && (
                <>
                  <div className="balance-stat">
                    <span className="stat-label">优势科目</span>
                    <span className="stat-value highlight">{analysis.balance.strongestSubject}</span>
                  </div>
                  <div className="balance-stat">
                    <span className="stat-label">待加强科目</span>
                    <span className="stat-value warning">{analysis.balance.weakestSubject}</span>
                  </div>
                </>
              )}
              <p className="balance-comment">
                {selectedSubject 
                  ? analysis.balance.imbalance > 15 
                    ? '⚠️ 该科目成绩波动较大，建议稳定发挥' 
                    : analysis.balance.imbalance > 10 
                    ? '💡 该科目成绩有一定波动，可进一步稳定' 
                    : '✅ 该科目成绩较为稳定'
                  : analysis.balance.imbalance > 15 
                  ? '⚠️ 存在偏科现象，建议均衡发展' 
                  : analysis.balance.imbalance > 10 
                  ? '💡 各科差距适中，可进一步优化' 
                  : analysis.balance.weakestSubject 
                  ? '✅ 学科发展较为均衡' 
                  : 'ℹ️ 请选择科目进行均衡度分析'}
              </p>
              <div className="balance-description">
                <h4>📝 计算方法</h4>
                {selectedSubject ? (
                  <>
                    <p>1. 收集该科目在所有考试中的分数</p>
                    <p>2. 找出该科目在所有考试中的最高分和最低分</p>
                    <p>3. 计算最高分与最低分的差值，即分数波动</p>
                    <p>4. 根据分数波动评估稳定性：</p>
                    <ul>
                      <li>≤10分：成绩较为稳定</li>
                      <li>11-15分：成绩有一定波动</li>
                      <li>＞15分：成绩波动较大</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>1. 计算每个科目的平均分数</p>
                    <p>2. 找出所有科目中的最高分和最低分</p>
                    <p>3. 计算最高分与最低分的差值，即最大分差</p>
                    <p>4. 根据最大分差评估均衡度：</p>
                    <ul>
                      <li>≤10分：学科发展较为均衡</li>
                      <li>11-15分：各科差距适中，可进一步优化</li>
                      <li>＞15分：存在偏科现象，建议均衡发展</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 学习曲线分析 */}
          <div className="card">
            <h3>📈 学习曲线分析</h3>
            <div className="learning-curve">
              <div className="curve-stat">
                <span className="stat-label">进步加速度</span>
                <span className={`stat-value ${analysis.learningCurve.acceleration > 0 ? 'positive' : 'negative'}`}>
                  {analysis.learningCurve.acceleration >= 0 ? '+' : ''}{analysis.learningCurve.acceleration}
                </span>
              </div>
              <div className="curve-stat">
                <span className="stat-label">当前趋势</span>
                <span className={`trend-badge ${
                  analysis.learningCurve.trend === '加速进步' ? 'positive' :
                  analysis.learningCurve.trend === '稳步进步' ? 'good' :
                  analysis.learningCurve.trend === '进步放缓' ? 'warning' : 'danger'
                }`}>
                  {analysis.learningCurve.trend}
                </span>
              </div>
              <p className="curve-comment">
                {analysis.learningCurve.trend === '加速进步' 
                  ? '🚀 学习状态良好，进步速度在加快' 
                  : analysis.learningCurve.trend === '稳步进步' 
                  ? '👍 保持稳定进步，继续加油' 
                  : analysis.learningCurve.trend === '进步放缓' 
                  ? '⚠️ 进步速度有所放缓，需要调整学习方法' 
                  : '❗ 学习状态需要关注，建议及时干预'}
              </p>
            </div>
          </div>

          {/* 学期对比 */}
          {(analysis.semesterComparison.first > 0 || analysis.semesterComparison.second > 0) && (
            <div className="card">
              <h3>📅 学期对比</h3>
              <div className="semester-compare">
                <div className="semester-item">
                  <span className="semester-label">上学期平均</span>
                  <span className="semester-value">{analysis.semesterComparison.first || '-'}</span>
                </div>
                <div className="semester-item">
                  <span className="semester-label">下学期平均</span>
                  <span className="semester-value">{analysis.semesterComparison.second || '-'}</span>
                </div>
                {analysis.semesterComparison.first > 0 && analysis.semesterComparison.second > 0 && (
                  <div className="semester-item">
                    <span className="semester-label">变化</span>
                    <span className={`semester-value ${analysis.semesterComparison.second - analysis.semesterComparison.first >= 0 ? 'positive' : 'negative'}`}>
                      {analysis.semesterComparison.second - analysis.semesterComparison.first >= 0 ? '+' : ''}
                      {Math.round((analysis.semesterComparison.second - analysis.semesterComparison.first) * 10) / 10}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 薄弱环节识别 */}
      {analysis && analysis.weakPoints.length > 0 && (
        <section className="weak-points">
          <h2>⚠️ 薄弱环节与改进建议</h2>
          <div className="card">
            <div className="weak-points-list">
              {analysis.weakPoints.map((point, idx) => (
                <div key={idx} className="weak-point-item">
                  <div className="weak-point-header">
                    <span className="weak-subject">{point.subject}</span>
                    <span className="weak-score">平均分: {point.average}</span>
                  </div>
                  <div className="weak-point-detail">
                    <span>距离优秀线还差: {point.gap}分</span>
                  </div>
                  <div className="weak-point-suggestion">
                    💡 {point.suggestion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}



      {/* 统计维度 */}
      <section className="statistics">
        <div className="card">
          <h3>📋 统计分析</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">总考试次数</span>
              <span className="stat-value">{statistics.totalExams}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">平均分数</span>
              <span className="stat-value">{statistics.averageScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">最高平均分</span>
              <span className="stat-value">{statistics.highestScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">最低平均分</span>
              <span className="stat-value">{statistics.lowestScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">进步率</span>
              <span className={`stat-value ${statistics.improvementRate >= 0 ? 'positive' : 'negative'}`}>
                {statistics.improvementRate >= 0 ? '+' : ''}{statistics.improvementRate}%
              </span>
            </div>
          </div>
        </div>


      </section>

      <footer className="footer">
        <p>数据更新日期: {data.scores.length > 0 ? data.scores[0].date : 'N/A'}</p>
      </footer>
    </div>
  );
}

export default App;