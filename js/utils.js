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

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * LZ-String or JSON Base64 compression helpers for Hash transport
 */
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
      // Fallback decodeURIComponent direct JSON
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

/**
 * Export data to CSV file
 */
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

/**
 * Export data to JSON file
 */
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
 * Sample Youtube Comments Dataset (100 items) for instant testing & demo
 */
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
    { id: 10, author: "웹개발자", text: "D3.js랑 Chart.js 인터랙션 연동된 대시보드 퀄리티 진짜 깔끔하네요. 응원합니다!", likes: "167", publishedAt: "2026-08-17" },
    { id: 11, author: "구독자100", text: "진짜 대박 꿀잼 영상 ㅋㅋㅋ 시간 가는 줄 모르고 정주행했어요!", likes: "88", publishedAt: "2026-08-16" },
    { id: 12, author: "비판적시각", text: "내용 검증이 부족해 보입니다. 오류 있는 정보 전달하면 시청자가 오해할 수도 있어요.", likes: "23", publishedAt: "2026-08-16" },
    { id: 13, author: "AI탐구자", text: "자연어 처리 및 감정 분석 알고리즘 구현 방식이 인상적입니다. 많이 배웠어요.", likes: "72", publishedAt: "2026-08-16" },
    { id: 14, author: "행복한일상", text: "퇴근길에 보면서 힐링하고 갑니다. 유용한 정보 감사해요~", likes: "53", publishedAt: "2026-08-15" },
    { id: 15, author: "솔직리뷰어", text: "광고 협찬 느낌이 너무 강해서 신뢰도가 좀 떨어지네요. 아쉽습니다.", likes: "19", publishedAt: "2026-08-15" },
    { id: 16, author: "스타트업CEO", text: "팀원들과 함께 공유해서 공부하겠습니다. 완벽한 강의네요!", likes: "140", publishedAt: "2026-08-15" },
    { id: 17, author: "자바스크립트사랑", text: "Vanilla JS로 라이브러리 없이 깔끔하게 짜여진 구조가 참 마음에 듭니다.", likes: "66", publishedAt: "2026-08-14" },
    { id: 18, author: "노답탐율", text: "영상 길이만 길고 정작 알맹이는 없네요. 시간낭비 지렸다 ㅡㅡ", likes: "5", publishedAt: "2026-08-14" },
    { id: 19, author: "긍정에너지", text: "항상 따뜻하고 친절한 설명 감사드립니다. 큰 힘이 됩니다!", likes: "102", publishedAt: "2026-08-14" },
    { id: 20, author: "인사이트리더", text: "요약정리하자면 핵심 포인트가 너무 명쾌하게 정리되어 있네요. 강추!", likes: "210", publishedAt: "2026-08-13" },
    { id: 21, author: "유튜브마니아", text: "이 알고리즘 덕분에 제 추천탭에 떠서 보게 됐는데 인생 영상 찾았습니다 ㅠㅠ", likes: "175", publishedAt: "2026-08-13" },
    { id: 22, author: "컴공생2학년", text: "과제할 때 참고하려고 저장해뒀습니다. 진짜 갓성비 명강의네요!", likes: "98", publishedAt: "2026-08-13" },
    { id: 23, author: "팩트폭격기", text: "억지 감동 연출이 너무 과해요. 담백하게 진행하면 훨씬 좋을 것 같은데요.", likes: "31", publishedAt: "2026-08-12" },
    { id: 24, author: "행복추구", text: "보는 내내 입가에 미소가 지어지네요. 진짜 감동적인 이야기였습니다.", likes: "115", publishedAt: "2026-08-12" },
    { id: 25, author: "지식채집가", text: "복잡한 내용을 이렇게 쉬운 단어로 해설해주시다니 능력이 대단하십니다.", likes: "155", publishedAt: "2026-08-12" },
    { id: 26, author: "실망스럽네요", text: "이전 영상들에 비해서 성의가 부족해보입니다. 피드백 반영 부탁드립니다.", likes: "16", publishedAt: "2026-08-11" },
    { id: 27, author: "마스터개발자", text: "코드 완성도가 아주 훌륭합니다. 버그 없이 깔끔하게 동작하네요.", likes: "132", publishedAt: "2026-08-11" },
    { id: 28, author: "열공러", text: "매일 하나씩 보면서 공부중입니다. 매번 유익한 콘텐츠 감사합니다!", likes: "89", publishedAt: "2026-08-11" },
    { id: 29, author: "노잼경보", text: "솔직히 재미는 전혀 없고 지루해서 중간에 껐습니다...", likes: "7", publishedAt: "2026-08-10" },
    { id: 30, author: "사이다팬", text: "속시원하고 정확한 지적 사이다 그 자체네요! 널리 공유하겠습니다.", likes: "204", publishedAt: "2026-08-10" }
  ];
}
