/**
 * YouTube Comment Inspector & Extractor Bookmarklet Script
 * Listly-style DOM Inspector & Shadow DOM parser with real-time mouseover highlight box
 */

export function generateBookmarkletCode(targetWebappUrl) {
  const appUrl = targetWebappUrl || window.location.href.split('#')[0];

  const scriptBody = `(function(){
  if(window.__yt_extractor_active) {
    alert('🔍 이미 Listly 댓글 추출기가 활성화되어 있습니다.');
    return;
  }
  window.__yt_extractor_active = true;

  // 1. Injected Styles
  const style = document.createElement('style');
  style.id = '__yt_extractor_styles';
  style.innerHTML = \`
    .__yt_box_highlight {
      position: fixed !important;
      pointer-events: none !important;
      border: 3px solid #2563eb !important;
      background: rgba(37, 99, 235, 0.22) !important;
      z-index: 99999999 !important;
      transition: all 0.04s ease-out !important;
      box-shadow: 0 0 20px rgba(37, 99, 235, 0.6) !important;
      border-radius: 8px !important;
    }
    .__yt_top_toolbar {
      position: fixed !important;
      top: 16px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 999999999 !important;
      background: #0f172a !important;
      color: #f8fafc !important;
      padding: 10px 20px !important;
      border-radius: 14px !important;
      border: 2px solid #3b82f6 !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7) !important;
      font-family: Pretendard, sans-serif !important;
      font-size: 13px !important;
      display: flex !important;
      align-items: center !important;
      gap: 14px !important;
    }
    .__yt_action_badge {
      position: absolute !important;
      top: -32px !important;
      right: 0 !important;
      background: #2563eb !important;
      color: white !important;
      padding: 4px 12px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-weight: bold !important;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4) !important;
      cursor: pointer !important;
      pointer-events: auto !important;
    }
  \`;
  document.head.appendChild(style);

  // 2. Top Status Toolbar
  const bar = document.createElement('div');
  bar.className = '__yt_top_toolbar';
  bar.innerHTML = \`
    <span style="font-weight:bold;color:#60a5fa;display:flex;align-items:center;gap:6px;">
      <span style="background:#2563eb;color:white;padding:2px 6px;border-radius:4px;font-size:11px;">Listly</span>
      YouTube 댓글 영역 추출기
    </span>
    <span id="__yt_count_badge" style="background:#1e293b;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;color:#38bdf8;">감지 중...</span>
    <button id="__yt_extract_btn" style="background:#2563eb;color:white;border:none;padding:7px 16px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:12px;box-shadow:0 2px 6px rgba(37,99,235,0.4);">▶️ 댓글 즉시 추출</button>
    <button id="__yt_close_btn" style="background:transparent;color:#94a3b8;border:none;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
  \`;
  document.body.appendChild(bar);

  // 3. Floating Highlight Box with Badge
  const box = document.createElement('div');
  box.className = '__yt_box_highlight';
  box.style.display = 'none';
  
  const badge = document.createElement('div');
  badge.className = '__yt_action_badge';
  badge.innerHTML = '✂️ 클릭하여 추출';
  box.appendChild(badge);
  document.body.appendChild(box);

  // Scanner for active comment count
  function updateCount() {
    const items = document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model, ytd-comment-renderer');
    const badgeEl = document.getElementById('__yt_count_badge');
    if (badgeEl) {
      badgeEl.innerText = items.length > 0 ? items.length + '개 댓글 감지됨' : '댓글 영역 감지 중... (아래로 스크롤)';
    }
  }
  const countTimer = setInterval(updateCount, 800);
  updateCount();

  // Listly-style DOM Inspector: Track element under cursor using elementsFromPoint & composedPath
  let currentTargetEl = null;

  function onMouseMove(e) {
    if (bar.contains(e.target)) {
      box.style.display = 'none';
      return;
    }

    // Search elements under cursor including shadow DOMs
    const els = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [];
    let matched = null;

    for (let el of els) {
      if (el.tagName && (
        el.tagName.toLowerCase() === 'ytd-comment-thread-renderer' ||
        el.tagName.toLowerCase() === 'ytd-comment-view-model' ||
        el.tagName.toLowerCase() === 'ytd-comment-renderer' ||
        el.id === 'comment' ||
        el.id === 'comments' ||
        el.id === 'contents'
      )) {
        matched = el;
        break;
      }
    }

    if (!matched && e.composedPath) {
      const path = e.composedPath();
      for (let el of path) {
        if (el.tagName && (
          el.tagName.toLowerCase() === 'ytd-comment-thread-renderer' ||
          el.tagName.toLowerCase() === 'ytd-comment-view-model' ||
          el.tagName.toLowerCase() === 'ytd-comment-renderer' ||
          el.id === 'comment' ||
          el.id === 'comments'
        )) {
          matched = el;
          break;
        }
      }
    }

    if (matched) {
      currentTargetEl = matched;
      const rect = matched.getBoundingClientRect();
      box.style.display = 'block';
      box.style.top = Math.max(0, rect.top + window.scrollY) + 'px';
      box.style.left = Math.max(0, rect.left + window.scrollX) + 'px';
      box.style.width = Math.max(200, rect.width) + 'px';
      box.style.height = Math.max(60, rect.height) + 'px';
      box.style.position = 'absolute';
    } else {
      currentTargetEl = null;
      box.style.display = 'none';
    }
  }

  // Core Extractor Action
  function doExtract() {
    const items = document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model, ytd-comment-renderer');
    const results = [];

    items.forEach((item, idx) => {
      const authorEl = item.querySelector('#author-text, .ytd-comment-view-model-author, a#author-text span');
      const author = authorEl ? authorEl.innerText.trim().replace(/^@/, '') : \`작성자\${idx+1}\`;

      const textEl = item.querySelector('#content-text, .ytd-comment-view-model-content, #content');
      const text = textEl ? textEl.innerText.trim() : '';

      const likesEl = item.querySelector('#vote-count-middle, #vote-count-left');
      const likes = likesEl ? likesEl.innerText.trim() : '0';

      const timeEl = item.querySelector('.published-time-text a, #published-time-text');
      const publishedAt = timeEl ? timeEl.innerText.trim() : '';

      if (text) {
        results.push({ id: idx + 1, author, text, likes, publishedAt });
      }
    });

    if (results.length === 0) {
      alert('⚠️ 현재 렌더링된 댓글을 찾지 못했습니다. 유튜브 화면을 아래로 스크롤하여 댓글이 보이도록 한 후 다시 클릭해 주세요.');
      return;
    }

    const jsonStr = JSON.stringify(results);
    const dataHash = '#data=raw:' + encodeURIComponent(jsonStr);
    const targetUrl = '${appUrl.replace(/'/g, "\\'")}' + dataHash;

    window.open(targetUrl, '_blank');
    cleanup();
  }

  function onClick(e) {
    if (bar.contains(e.target)) return;
    if (currentTargetEl || box.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      doExtract();
    }
  }

  function cleanup() {
    window.__yt_extractor_active = false;
    clearInterval(countTimer);
    if (style && style.parentNode) style.parentNode.removeChild(style);
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    if (box && box.parentNode) box.parentNode.removeChild(box);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
  }

  document.getElementById('__yt_extract_btn').addEventListener('click', doExtract);
  document.getElementById('__yt_close_btn').addEventListener('click', cleanup);

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);

  alert('🔍 [Listly 댓글 영역 추출기 활성화]\\n\\n마우스를 유튜브 댓글 위로 올리면 파란색 하이라이트 박스가 뜹니다. 클릭하거나 상단 버튼을 눌러 즉시 수집하세요!');
})();`;

  return 'javascript:' + encodeURIComponent(scriptBody.replace(/\s+/g, ' '));
}
