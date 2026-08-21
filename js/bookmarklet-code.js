/**
 * YouTube Comment Inspector & Extractor Bookmarklet Script
 * Robust DOM parsing supporting YouTube custom web components, Shadow DOM & Instant Extract Toolbar
 */

export function generateBookmarkletCode(targetWebappUrl) {
  const appUrl = targetWebappUrl || window.location.href.split('#')[0];

  const scriptBody = `(function(){
  if(window.__yt_extractor_active) {
    alert('🔍 이미 댓글 영역 추출기가 활성화되어 있습니다.');
    return;
  }
  window.__yt_extractor_active = true;

  // 1. Create Top Floating Control Toolbar
  const bar = document.createElement('div');
  bar.id = '__yt_extractor_bar';
  bar.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999999;background:#1e293b;color:#f8fafc;padding:10px 20px;border-radius:12px;border:2px solid #3b82f6;box-shadow:0 10px 25px rgba(0,0,0,0.6);font-family:sans-serif;font-size:13px;display:flex;align-items:center;gap:12px;cursor:default;';
  bar.innerHTML = \`
    <span style="font-weight:bold;color:#60a5fa;">✂️ YouTube 댓글 영역 추출기</span>
    <span id="__yt_count_badge" style="background:#334155;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;">감지 중...</span>
    <button id="__yt_extract_btn" style="background:#2563eb;color:white;border:none;padding:6px 14px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.3);">▶️ 현재 로딩 댓글 즉시 추출</button>
    <button id="__yt_close_btn" style="background:transparent;color:#94a3b8;border:none;font-size:16px;cursor:pointer;">✕</button>
  \`;
  document.body.appendChild(bar);

  // 2. Create Floating Blue Highlighter Box
  const box = document.createElement('div');
  box.id = '__yt_extractor_box';
  box.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #3b82f6;background:rgba(59,130,246,0.18);z-index:9999999;transition:all 0.05s ease;display:none;box-shadow:0 0 15px rgba(59,130,246,0.5);border-radius:8px;';
  document.body.appendChild(box);

  // Count Comments Periodic Scanner
  function updateCommentCount() {
    const items = document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model, ytd-comment-renderer, #comment');
    const badge = document.getElementById('__yt_count_badge');
    if (badge) {
      badge.innerText = items.length > 0 ? items.length + '개 댓글 감지됨' : '댓글 감지 중 (아래로 스크롤하세요)';
    }
  }
  const countInterval = setInterval(updateCommentCount, 1000);
  updateCommentCount();

  // Helper to find closest comment component
  function findCommentElement(e) {
    const path = e.composedPath ? e.composedPath() : [];
    for (let el of path) {
      if (el.tagName && (
        el.tagName.toLowerCase() === 'ytd-comment-thread-renderer' ||
        el.tagName.toLowerCase() === 'ytd-comment-view-model' ||
        el.tagName.toLowerCase() === 'ytd-comment-renderer' ||
        el.id === 'comment' ||
        el.id === 'comments'
      )) {
        return el;
      }
    }
    return e.target ? e.target.closest('ytd-comment-thread-renderer, ytd-comment-view-model, ytd-comment-renderer, #comment, #comments') : null;
  }

  // 3. Mouseover Inspector
  function onMouseOver(e) {
    const commentEl = findCommentElement(e);
    if(commentEl && !bar.contains(commentEl)) {
      const rect = commentEl.getBoundingClientRect();
      box.style.display = 'block';
      box.style.top = Math.max(0, rect.top) + 'px';
      box.style.left = Math.max(0, rect.left) + 'px';
      box.style.width = rect.width + 'px';
      box.style.height = rect.height + 'px';
    } else {
      box.style.display = 'none';
    }
  }

  // 4. Extract Core Action
  function extractComments() {
    const items = document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model, ytd-comment-renderer');
    const results = [];

    items.forEach((item, idx) => {
      const authorEl = item.querySelector('#author-text, .ytd-comment-view-model-author, a#author-text span, #author-comment-badge');
      const author = authorEl ? authorEl.innerText.trim().replace(/^@/, '') : \`작성자\${idx+1}\`;

      const textEl = item.querySelector('#content-text, .ytd-comment-view-model-content, #content');
      const text = textEl ? textEl.innerText.trim() : '';

      const likesEl = item.querySelector('#vote-count-middle, #vote-count-left');
      const likes = likesEl ? likesEl.innerText.trim() : '0';

      const timeEl = item.querySelector('.published-time-text a, #published-time-text');
      const publishedAt = timeEl ? timeEl.innerText.trim() : '';

      if(text) {
        results.push({
          id: idx + 1,
          author,
          text,
          likes,
          publishedAt
        });
      }
    });

    if(results.length === 0) {
      alert('⚠️ 댓글을 찾지 못했습니다. 유튜브 화면을 아래로 스크롤하여 댓글이 보이게 한 후 다시 시도해주세요.');
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
    const commentEl = findCommentElement(e);
    if (commentEl) {
      e.preventDefault();
      e.stopPropagation();
      extractComments();
    }
  }

  function cleanup() {
    window.__yt_extractor_active = false;
    clearInterval(countInterval);
    if(box && box.parentNode) box.parentNode.removeChild(box);
    if(bar && bar.parentNode) bar.parentNode.removeChild(bar);
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('click', onClick, true);
  }

  document.getElementById('__yt_extract_btn').addEventListener('click', extractComments);
  document.getElementById('__yt_close_btn').addEventListener('click', cleanup);

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);

  alert('🔍 [YouTube 댓글 추출기 활성화]\\n\\n화면 상단 [▶️ 현재 로딩 댓글 즉시 추출] 버튼을 누르거나, 파란색 영역 댓글 위를 클릭하세요!');
})();`;

  return 'javascript:' + encodeURIComponent(scriptBody.replace(/\s+/g, ' '));
}
