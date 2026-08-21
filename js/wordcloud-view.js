/**
 * WordCloud2.js Rendering & Interaction Module
 */

export function renderWordCloud(canvasId, wordList, onWordClick) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (!wordList || wordList.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '16px Pretendard, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('분석할 단어 데이터가 없거나 수집된 댓글이 없습니다.', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Adjust canvas size to container width
  const container = canvas.parentElement;
  if (container) {
    canvas.width = container.clientWidth || 800;
    canvas.height = 480;
  }

  // Format list for WordCloud2: [[word, size], ...]
  const maxCount = wordList[0]?.count || 1;
  const list = wordList.map(item => {
    // Scale font size between 14px and 60px
    const weight = Math.max(14, Math.min(64, Math.round((item.count / maxCount) * 52) + 12));
    return [item.word, weight];
  });

  // Color palette for dark background
  const colors = ['#60a5fa', '#38bdf8', '#818cf8', '#a78bfa', '#c084fc', '#f472b6', '#34d399', '#fbbf24'];

  const options = {
    list: list,
    gridSize: Math.round(16 * canvas.width / 1024),
    weightFactor: 1,
    fontFamily: 'Pretendard, sans-serif',
    color: function (word, weight) {
      const idx = Math.floor(Math.random() * colors.length);
      return colors[idx];
    },
    rotateRatio: 0.35,
    rotationSteps: 2,
    backgroundColor: '#0f172a',
    drawOutOfBound: false,
    shrinkToFit: true,
    hover: function (item, dimension, event) {
      if (item) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    },
    click: function (item) {
      if (item && onWordClick) {
        const selectedWord = item[0];
        onWordClick(selectedWord);
      }
    }
  };

  if (window.WordCloud) {
    window.WordCloud(canvas, options);
  } else {
    console.error('WordCloud2.js 라이브러리가 로드되지 않았습니다.');
  }
}
