/**
 * Fine-Grained Sentiment Analysis & Polarity Classification Engine
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
    console.warn('감성 사전 파일 로드 중 오탈자/네트워크 오류, 기본 사전 사용:', e);
  }

  // Fallback
  sentimentDictCache = {
    "대박": 3, "최고": 3, "명작": 3, "존잼": 3, "사이다": 3, "갓": 3, "레전드": 3, "지렸다": 3,
    "좋다": 2, "좋아": 2, "좋아요": 2, "꿀잼": 2, "유익": 2, "감사": 2, "추천": 2, "재밌다": 2, "만족": 2,
    "괜찮다": 1, "인정": 1, "공감": 1, "유용": 1, "도움": 1, "귀엽다": 1,
    "아쉽다": -1, "부족": -1, "지루함": -1, "복잡": -1, "어렵다": -1, "느리게": -1,
    "별로": -2, "짜증": -2, "답답": -2, "불편": -2, "실망": -2, "노잼": -2, "비추": -2, "돈아깝다": -2, "망했다": -2,
    "최악": -3, "쓰레기": -3, "극혐": -3, "빡침": -3, "욕나옴": -3, "주작": -3, "사기": -3
  };
  return sentimentDictCache;
}

// Negation words that flip polarity
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

    // 1. Token-level matching & Negation checking
    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i].form;
      let wordScore = dictionary[word];

      if (wordScore !== undefined) {
        // Check previous token or raw preceding word for negation (e.g., "안 좋다", "못 만든")
        let isNegated = false;
        if (i > 0 && NEGATION_WORDS.has(tokens[i - 1].form)) {
          isNegated = true;
        } else {
          // Substring negation check in raw text
          const wordIdx = rawText.indexOf(word);
          if (wordIdx > 0) {
            const prefix = rawText.substring(Math.max(0, wordIdx - 6), wordIdx);
            if (/(?:안|못|전혀|않|없)/.test(prefix)) {
              isNegated = true;
            }
          }
        }

        if (isNegated) {
          wordScore = -wordScore; // Flip polarity
        }

        score += wordScore;
        matchedWords.push({ word, score: wordScore, negated: isNegated });
      }
    }

    // 2. Substring phrase matching for idioms & un-tokenized words
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

    // 3. Polarity Categorization into 5 distinct categories
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

let donutChartInstance = null;
let barChartInstance = null;

export function renderSentimentCharts(donutCanvasId, barCanvasId, sentimentData) {
  const Chart = window.Chart;
  if (!Chart || !sentimentData) return;

  const { summary, scoreDist } = sentimentData;

  // 1. Render Donut Chart (5 Categories)
  const donutCanvas = document.getElementById(donutCanvasId);
  if (donutCanvas) {
    if (donutChartInstance) donutChartInstance.destroy();

    donutChartInstance = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: ['강한 긍정 (+3 이상)', '긍정 (+1~+2)', '중립 (0)', '부정 (-1~-2)', '강한 부정 (-3 이하)'],
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
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#f8fafc', font: { family: 'Pretendard', size: 12 } }
          }
        }
      }
    });
  }

  // 2. Render Score Distribution Bar Chart
  const barCanvas = document.getElementById(barCanvasId);
  if (barCanvas) {
    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: ['강한 부정 (≤-3)', '부정 (-1,-2)', '중립 (0)', '긍정 (+1,+2)', '강한 긍정 (≥+3)'],
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
