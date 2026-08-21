/**
 * Fine-Grained Sentiment Analysis Engine with Interactive Chart Click Callbacks
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
    console.warn('감성 사전 로드 예외:', e);
  }

  // Basic fallback
  sentimentDictCache = {
    "대박": 3, "최고": 3, "명작": 3, "존잼": 3, "사이다": 3, "갓": 3, "레전드": 3, "지렸다": 3,
    "좋다": 2, "좋아": 2, "좋아요": 2, "꿀잼": 2, "유익": 2, "감사": 2, "추천": 2, "재밌다": 2,
    "괜찮다": 1, "인정": 1, "공감": 1, "유용": 1, "도움": 1,
    "아쉽다": -1, "부족": -1, "지루함": -1, "어렵다": -1, "느리게": -1,
    "별로": -2, "짜증": -2, "답답": -2, "불편": -2, "실망": -2, "노잼": -2, "비추": -2, "돈아깝다": -2,
    "최악": -3, "쓰레기": -3, "극혐": -3, "빡침": -3, "욕나옴": -3, "주작": -3
  };
  return sentimentDictCache;
}

const NEGATION_WORDS = new Set(['안', '못', '전혀', '별로', '결코', '않', '없']);

export function evaluateCommentsSentiment(analyzedComments, dictionary) {
  let strongPosCount = 0;
  let posCount = 0;
  let neutralCount = 0;
  let negCount = 0;
  let strongNegCount = 0;

  let bestPositive = null;
  let worstNegative = null;

  const scoreDist = {
    "STRONG_POS": 0, // >= +3
    "POS": 0,        // +1, +2
    "NEUTRAL": 0,    // 0
    "NEG": 0,        // -1, -2
    "STRONG_NEG": 0  // <= -3
  };

  const evaluatedList = analyzedComments.map(item => {
    let score = 0;
    const matchedWords = [];
    const tokens = item.tokens || [];
    const rawText = item.text || '';

    // Token-level check
    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i].form;
      let wordScore = dictionary[word];

      if (wordScore !== undefined) {
        let isNegated = false;
        if (i > 0 && NEGATION_WORDS.has(tokens[i - 1].form)) {
          isNegated = true;
        } else {
          const wordIdx = rawText.indexOf(word);
          if (wordIdx > 0) {
            const prefix = rawText.substring(Math.max(0, wordIdx - 6), wordIdx);
            if (/(?:안|못|전혀|않|없)/.test(prefix)) {
              isNegated = true;
            }
          }
        }

        if (isNegated) {
          wordScore = -wordScore;
        }

        score += wordScore;
        matchedWords.push({ word, score: wordScore, negated: isNegated });
      }
    }

    // Substring phrase check
    Object.keys(dictionary).forEach(dictWord => {
      if (!matchedWords.some(m => m.word === dictWord) && rawText.includes(dictWord)) {
        let dictScore = dictionary[dictWord];
        const idx = rawText.indexOf(dictWord);
        const prefix = rawText.substring(Math.max(0, idx - 6), idx);
        if (/(?:안|못|전혀|않|없)/.test(prefix)) {
          dictScore = -dictScore;
        }
        score += dictScore;
        matchedWords.push({ word: dictWord, score: dictScore });
      }
    });

    let category = 'NEUTRAL';
    let categoryLabel = '중립 (0)';

    if (score >= 3) {
      category = 'STRONG_POSITIVE';
      categoryLabel = '강한 긍정 (+3 이상)';
      strongPosCount++;
      scoreDist.STRONG_POS++;
    } else if (score >= 1) {
      category = 'POSITIVE';
      categoryLabel = '긍정 (+1 ~ +2)';
      posCount++;
      scoreDist.POS++;
    } else if (score <= -3) {
      category = 'STRONG_NEGATIVE';
      categoryLabel = '강한 부정 (-3 이하)';
      strongNegCount++;
      scoreDist.STRONG_NEG++;
    } else if (score <= -1) {
      category = 'NEGATIVE';
      categoryLabel = '부정 (-1 ~ -2)';
      negCount++;
      scoreDist.NEG++;
    } else {
      category = 'NEUTRAL';
      categoryLabel = '중립 (0)';
      neutralCount++;
      scoreDist.NEUTRAL++;
    }

    const commentObj = {
      ...item,
      sentimentScore: score,
      sentimentCategory: category,
      sentimentCategoryLabel: categoryLabel,
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

  const total = analyzedComments.length || 1;
  const totalPositive = strongPosCount + posCount;
  const totalNegative = strongNegCount + negCount;

  return {
    comments: evaluatedList,
    summary: {
      total: analyzedComments.length,
      strongPositive: strongPosCount,
      positive: posCount,
      neutral: neutralCount,
      negative: negCount,
      strongNegative: strongNegCount,
      positiveRatio: Math.round((totalPositive / total) * 100),
      negativeRatio: Math.round((totalNegative / total) * 100),
      neutralRatio: Math.round((neutralCount / total) * 100)
    },
    scoreDist,
    bestPositive,
    worstNegative
  };
}

const chartInstances = new Map();

export function renderSentimentCharts(donutCanvasId, barCanvasId, sentimentData, onChartClick) {
  const Chart = window.Chart;
  if (!Chart || !sentimentData) return;

  const { summary, scoreDist } = sentimentData;

  const categories = [
    { label: '강한 긍정 (+3 이상)', key: 'STRONG_POSITIVE' },
    { label: '긍정 (+1 ~ +2)', key: 'POSITIVE' },
    { label: '중립 (0)', key: 'NEUTRAL' },
    { label: '부정 (-1 ~ -2)', key: 'NEGATIVE' },
    { label: '강한 부정 (-3 이하)', key: 'STRONG_NEGATIVE' }
  ];

  // 1. Donut Chart Rendering
  const donutCanvas = document.getElementById(donutCanvasId);
  if (donutCanvas) {
    if (chartInstances.has(donutCanvasId)) {
      chartInstances.get(donutCanvasId).destroy();
    }

    const donutChart = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: categories.map(c => c.label),
        datasets: [{
          data: [
            summary.strongPositive,
            summary.positive,
            summary.neutral,
            summary.negative,
            summary.strongNegative
          ],
          backgroundColor: ['#059669', '#34d399', '#64748b', '#f43f5e', '#be123c'],
          borderColor: '#0f172a',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements && elements.length > 0 && onChartClick) {
            const index = elements[0].index;
            const clickedCategory = categories[index];
            onChartClick(clickedCategory.label, clickedCategory.key);
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#f8fafc', font: { family: 'Pretendard', size: 11 } }
          }
        }
      }
    });

    chartInstances.set(donutCanvasId, donutChart);
  }

  // 2. Bar Chart Rendering
  const barCanvas = document.getElementById(barCanvasId);
  if (barCanvas) {
    if (chartInstances.has(barCanvasId)) {
      chartInstances.get(barCanvasId).destroy();
    }

    const barCategories = [
      { label: '강한 부정 (≤-3)', key: 'STRONG_NEGATIVE' },
      { label: '부정 (-1,-2)', key: 'NEGATIVE' },
      { label: '중립 (0)', key: 'NEUTRAL' },
      { label: '긍정 (+1,+2)', key: 'POSITIVE' },
      { label: '강한 긍정 (≥+3)', key: 'STRONG_POSITIVE' }
    ];

    const barChart = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: barCategories.map(c => c.label),
        datasets: [{
          label: '댓글 수',
          data: [scoreDist.STRONG_NEG, scoreDist.NEG, scoreDist.NEUTRAL, scoreDist.POS, scoreDist.STRONG_POS],
          backgroundColor: ['#be123c', '#f43f5e', '#64748b', '#34d399', '#059669'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements && elements.length > 0 && onChartClick) {
            const index = elements[0].index;
            const clickedCategory = barCategories[index];
            onChartClick(clickedCategory.label, clickedCategory.key);
          }
        },
        scales: {
          x: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });

    chartInstances.set(barCanvasId, barChart);
  }
}
