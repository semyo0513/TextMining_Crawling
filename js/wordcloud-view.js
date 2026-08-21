/**
 * WordCloud2.js Rendering & Customizable UI/UX Options Module
 * Guarantees Non-Zero Canvas Sizing & Multi-Modal Enlarged Rendering
 */

const PALETTES = {
  vibrant: ['#60a5fa', '#38bdf8', '#818cf8', '#a78bfa', '#c084fc', '#f472b6', '#34d399', '#fbbf24'],
  warm: ['#f97316', '#fbbf24', '#f43f5e', '#ef4444', '#eab308', '#fdba74', '#fb923c'],
  neon: ['#a855f7', '#ec4899', '#3b82f6', '#06b6d4', '#10b981', '#f43f5e', '#c084fc'],
  slate: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#64748b', '#475569', '#38bdf8'],
  rainbow: ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6']
};

export function renderWordCloud(canvasId, wordList, onWordClick, config = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const {
    colorTheme = 'vibrant',
    fontFamily = 'Pretendard, sans-serif',
    rotateRatio = 0.35,
    maxFontSize = 64,
    minFontSize = 14
  } = config;

  if (!wordList || wordList.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Pretendard, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('분석할 단어 데이터가 없거나 선택된 단어가 없습니다.', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Ensure canvas has explicit non-zero dimensions
  const container = canvas.parentElement;
  let targetWidth = 800;
  let targetHeight = 480;

  if (container) {
    if (container.clientWidth > 100) targetWidth = container.clientWidth;
    if (container.clientHeight > 100) targetHeight = container.clientHeight;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const maxCount = wordList[0]?.count || 1;
  const list = wordList.map(item => {
    const weight = Math.max(minFontSize, Math.min(maxFontSize, Math.round((item.count / maxCount) * (maxFontSize - minFontSize)) + minFontSize));
    return [item.word, weight];
  });

  const selectedPalette = PALETTES[colorTheme] || PALETTES.vibrant;

  const options = {
    list: list,
    gridSize: Math.max(8, Math.round(14 * canvas.width / 1024)),
    weightFactor: 1,
    fontFamily: fontFamily,
    color: function () {
      const idx = Math.floor(Math.random() * selectedPalette.length);
      return selectedPalette[idx];
    },
    rotateRatio: parseFloat(rotateRatio),
    rotationSteps: 2,
    backgroundColor: '#0f172a',
    drawOutOfBound: false,
    shrinkToFit: true,
    hover: function (item) {
      canvas.style.cursor = item ? 'pointer' : 'default';
    },
    click: function (item) {
      if (item && onWordClick) {
        onWordClick(item[0]);
      }
    }
  };

  if (window.WordCloud) {
    window.WordCloud(canvas, options);
  } else {
    console.error('WordCloud2.js 라이브러리가 로드되지 않았습니다.');
  }
}
