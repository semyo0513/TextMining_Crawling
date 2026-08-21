/**
 * Utility Functions for YouTube Comment Miner
 */

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-triangle';

  toast.innerHTML = `<i class="fas ${icon} text-lg"></i> <span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function encodeDataToHash(dataObj) {
  const jsonStr = JSON.stringify(dataObj);
  if (window.LZString && typeof window.LZString.compressToEncodedURIComponent === 'function') {
    return 'lz:' + window.LZString.compressToEncodedURIComponent(jsonStr);
  }
  return 'raw:' + encodeURIComponent(jsonStr);
}

export function decodeDataFromHash(hashStr) {
  if (!hashStr) return null;
  let cleanHash = hashStr.replace(/^#data=/, '').replace(/^#import=/, '');
  if (!cleanHash) return null;

  try {
    if (cleanHash.startsWith('lz:')) {
      const compressed = cleanHash.substring(3);
      const decompressed = window.LZString.decompressFromEncodedURIComponent(compressed);
      return JSON.parse(decompressed);
    } else if (cleanHash.startsWith('raw:')) {
      const raw = decodeURIComponent(cleanHash.substring(4));
      return JSON.parse(raw);
    } else {
      try {
        const decoded = decodeURIComponent(cleanHash);
        return JSON.parse(decoded);
      } catch (e) {
        if (window.LZString) {
          const decompressed = window.LZString.decompressFromEncodedURIComponent(cleanHash);
          if (decompressed) return JSON.parse(decompressed);
        }
        throw e;
      }
    }
  } catch (err) {
    console.error('Failed to decode hash data:', err);
    return null;
  }
}

export function exportToCSV(filename, comments) {
  if (!comments || !comments.length) {
    showToast('내보낼 댓글 데이터가 없습니다.', 'error');
    return;
  }

  const headers = ['ID', '작성자', '댓글 내용', '좋아요 수', '작성일'];
  const rows = comments.map(c => [
    c.id || '',
    `"${(c.author || '').replace(/"/g, '""')}"`,
    `"${(c.text || '').replace(/"/g, '""')}"`,
    c.likes || 0,
    `"${c.publishedAt || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`${comments.length}개 댓글 CSV 다운로드 완료`, 'success');
}

export function exportToJSON(filename, data) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('JSON 파일 다운로드 완료', 'success');
}

/**
 * Export sample Stopwords TXT file
 */
export function downloadSampleStopwords(stopwordsSet) {
  const stopwordsList = Array.from(stopwordsSet || ['것', '수', '등', '영상', '댓글', '유튜브', '채널', '구독', '좋아요', '알림', '설정', '진짜', '너무', '정말']);
  const textContent = stopwordsList.join('\n');
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample_stopwords.txt');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('불용어 샘플 TXT 파일 다운로드 완료', 'success');
}

/**
 * Export sample Sentiment Dictionary JSON file
 */
export function downloadSampleSentimentDict(dictObj) {
  const jsonContent = JSON.stringify(dictObj || {
    "대박": 3, "최고": 3, "좋다": 2, "괜찮다": 1, "아쉽다": -1, "별로": -2, "최악": -3
  }, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample_sentiment_dict.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('감정사전 샘플 JSON 파일 다운로드 완료', 'success');
}

export function getSampleComments() {
  return [
    { id: 1, author: "개발자김코딩", text: "와 진짜 이 영상 설명 미쳤다... 설명 너무 깔끔하고 쉽게 이해되네요! 최고입니다 👍", likes: "245", publishedAt: "2026-08-20" },
    { id: 2, author: "파이썬조아", text: "중간에 나오는 코드 예시 보면서 따라하니까 막히던 부분이 속시원하게 해결됐어요. 감사의 의미로 구독 좋아요 누르고 갑니다!", likes: "189", publishedAt: "2026-08-20" },
    { id: 3, author: "알고리즘스터디", text: "자막도 잘 되어있고 영상 퀄리티 레전드네요. 다음 편도 기대하고 있겠습니다 ㅎㅎ", likes: "120", publishedAt: "2026-08-19" },
    { id: 4, author: "취준생최선", text: "음질이 약간 아쉽긴 한데 내용이 워낙 혜자라서 너무 만족스럽게 봤습니다.", likes: "45", publishedAt: "2026-08-19" },
    { id: 5, author: "테크매니아", text: "이걸 무료로 공개해주시다니 진짜 갓튜버... 명강의 인정합니다!", likes: "310", publishedAt: "2026-08-18" },
    { id: 6, author: "불편러", text: "편집이 너무 산만하고 설명 속도가 빨라서 뭔 말인지 하나도 모르겠음. 돈아깝다 진심.", likes: "12", publishedAt: "2026-08-18" },
    { id: 7, author: "클린유저", text: "썸네일 어그로 너무 심한 거 아닌가요? 기대하고 들어왔는데 생각보다 별로예요.", likes: "8", publishedAt: "2026-08-18" },
    { id: 8, author: "데이터분석가", text: "텍스트마이닝이랑 시각화 라이브러리 조합이 훌륭하네요. 꿀잼이고 유익합니다!", likes: "95", publishedAt: "2026-08-17" },
    { id: 9, author: "코딩초보", text: "질문있는데 5분 20초쯤 나오는 설정 방법 다시 설명해주실 수 있나요? 조금 어렵네요 ㅠㅠ", likes: "14", publishedAt: "2026-08-17" },
    { id: 10, author: "웹개발자", text: "D3.js랑 Chart.js 인터랙션 연동된 대시보드 퀄리티 진짜 깔끔하네요. 응원합니다!", likes: "167", publishedAt: "2026-08-17" }
  ];
}
