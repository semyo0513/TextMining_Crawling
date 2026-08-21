/**
 * KNU Sentiment Dictionary & Chart.js Visualization Engine
 */

let sentimentDictCache = null;

export async function loadSentimentDict() {
  if (sentimentDictCache) return sentimentDictCache;

  try {
    const response = await fetch('./data/sentiment-dict.json');
    if (response.ok) {
      sentimentDictCache = await response.json();
      return sentimentDictCache;
    }
  } catch (e) {
    console.warn('감성 사전 로드 실패, 기본 사전 사용:', e);
  }

  // Basic fallback dictionary
  sentimentDictCache = {
    "최고": 2, "좋아요": 2, "감동": 2, "대박": 2, "꿀잼": 2, "유익": 2, "감사": 2, "추천": 2, "명작": 2, "완벽": 2,
    "최악": -2, "쓰레기": -2, "노잼": -2, "낭비": -2, "실망": -2, "극혐": -2, "빡침": -2, "어이없다": -2, "돈아깝다": -2
  };
  return sentimentDictCache;
}

export function evaluateCommentsSentiment(analyzedComments, dictionary) {
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;

  let bestPositive = null;
  let worstNegative = null;

  const scoreDist = { "-2이하": 0, "-1": 0, "0": 0, "+1": 0, "+2이상": 0 };

  const evaluatedList = analyzedComments.map(item => {
    let score = 0;
    const matchedWords = [];

    // Evaluate tokens
    item.tokens.forEach(token => {
      const word = token.form;
      if (dictionary[word] !== undefined) {
        score += dictionary[word];
        matchedWords.push({ word, score: dictionary[word] });
      }
    });

    // Fallback substring scan for un-tokenized words
    if (matchedWords.length === 0) {
      Object.keys(dictionary).forEach(dictWord => {
        if (item.text.includes(dictWord)) {
          score += dictionary[dictWord];
          matchedWords.push({ word: dictWord, score: dictionary[dictWord] });
        }
      });
    }

    let category = 'NEUTRAL';
    if (score > 0) {
      category = 'POSITIVE';
      positiveCount++;
    } else if (score < 0) {
      category = 'NEGATIVE';
      negativeCount++;
    } else {
      neutralCount++;
    }

    // Score distribution binning
    if (score <= -2) scoreDist["-2이하"]++;
    else if (score === -1) scoreDist["-1"]++;
    else if (score === 0) scoreDist["0"]++;
    else if (score === 1) scoreDist["+1"]++;
    else if (score >= 2) scoreDist["+2이상"]++;

    const commentObj = {
      ...item,
      sentimentScore: score,
      sentimentCategory: category,
      matchedWords
    };

    if (!bestPositive || score > bestPositive.sentimentScore) {
      bestPositive = commentObj;
    }
    if (!worstNegative || score < worstNegative.sentimentScore) {
      worstNegative = commentObj;
    }

    return commentObj;
  });

  return {
    comments: evaluatedList,
    summary: {
      total: analyzedComments.length,
      positive: positiveCount,
      neutral: neutralCount,
      negative: negativeCount,
      positiveRatio: analyzedComments.length ? Math.round((positiveCount / analyzedComments.length) * 100) : 0,
      negativeRatio: analyzedComments.length ? Math.round((negativeCount / analyzedComments.length) * 100) : 0
    },
    scoreDist,
    bestPositive,
    worstNegative
  };
}

let donutChartInstance = null;
let barChartInstance = null;

export function renderSentimentCharts(donutCanvasId, barCanvasId, sentimentData) {
  const Chart = window.Chart;
  if (!Chart) {
    console.error('Chart.js 라이브러리가 로드되지 않았습니다.');
    return;
  }

  const { summary, scoreDist } = sentimentData;

  // 1. Render Donut Chart
  const donutCanvas = document.getElementById(donutCanvasId);
  if (donutCanvas) {
    if (donutChartInstance) donutChartInstance.destroy();

    donutChartInstance = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: ['긍정 (Positive)', '중립 (Neutral)', '부정 (Negative)'],
        datasets: [{
          data: [summary.positive, summary.neutral, summary.negative],
          backgroundColor: ['#10b981', '#64748b', '#f43f5e'],
          borderColor: '#0f172a',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#f8fafc', font: { family: 'Pretendard', size: 13 } }
          }
        }
      }
    });
  }

  // 2. Render Score Distribution Bar Chart
  const barCanvas = document.getElementById(barCanvasId);
  if (barCanvas) {
    if (barChartInstance) barChartInstance.destroy();

    barCanvasInstance = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: ['-2 이하 (강한 부정)', '-1 (부정)', '0 (중립)', '+1 (긍정)', '+2 이상 (강한 긍정)'],
        datasets: [{
          label: '댓글 수',
          data: [scoreDist["-2이하"], scoreDist["-1"], scoreDist["0"], scoreDist["+1"], scoreDist["+2이상"]],
          backgroundColor: ['#e11d48', '#f43f5e', '#64748b', '#34d399', '#10b981'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}
