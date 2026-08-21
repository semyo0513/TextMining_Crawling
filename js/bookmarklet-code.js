/**
 * YouTube Comment Inspector & Extractor Bookmarklet Script
 */

export function generateBookmarkletCode(targetWebappUrl) {
  // Use target URL or current origin if unspecified
  const appUrl = targetWebappUrl || window.location.href.split('#')[0];

  const scriptBody = `(function(){
  if(window.__yt_extractor_active) {
    alert('🔍 이미 댓글 영역 추출기가 활성화되어 있습니다.');
    return;
  }
  window.__yt_extractor_active = true;

  // 1. Create floating inspector highlight box & info badge
  const box = document.createElement('div');
  box.id = '__yt_extractor_box';
  box.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #3b82f6;background:rgba(59,130,246,0.18);z-index:9999999;transition:all 0.08s ease;display:none;box-shadow:0 0 15px rgba(59,130,246,0.5);border-radius:8px;';
  
  const badge = document.createElement('div');
  badge.style.cssText = 'position:absolute;top:-28px;left:0;background:#2563eb;color:white;padding:2px 8px;font-size:12px;font-weight:bold;border-radius:4px;font-family:sans-serif;box-shadow:0 2px 4px rgba(0,0,0,0.3);';
  badge.innerText = '✂️ YouTube 댓글 영역 (클릭시 추출)';
  box.appendChild(badge);
  document.body.appendChild(box);

  // 2. Mouseover Inspector Handler
  function onMouseOver(e) {
    const commentEl = e.target.closest('ytd-comment-thread-renderer, ytd-comment-view-model, #comment, ytd-item-section-renderer');
    if(commentEl) {
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

  // 3. Click Extractor Handler
  function onClick(e) {
    // Only capture if clicking inside youtube comment container or thread
    const commentEl = e.target.closest('ytd-comment-thread-renderer, ytd-comment-view-model, #comments, ytd-item-section-renderer');
    if(!commentEl) return;

    e.preventDefault();
    e.stopPropagation();

    const items = document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model');
    const results = [];

    items.forEach((item, idx) => {
      const author = (item.querySelector('#author-text, .ytd-comment-view-model-author, a#author-text span')?.innerText || '').trim() || \`작성자\${idx+1}\`;
      const text = (item.querySelector('#content-text, .ytd-comment-view-model-content, #content')?.innerText || '').trim();
      const likes = (item.querySelector('#vote-count-middle, #vote-count-left')?.innerText || '').trim() || '0';
      const publishedAt = (item.querySelector('.published-time-text a, #published-time-text')?.innerText || '').trim();

      if(text) {
        results.push({
          id: idx + 1,
          author: author.replace(/^@/, ''),
          text: text,
          likes: likes,
          publishedAt: publishedAt
        });
      }
    });

    if(results.length === 0) {
      alert('⚠️ 현재 렌더링된 댓글을 찾지 못했습니다. 유튜브 페이지에서 댓글 영역이 보일 때까지 아래로 스크롤한 후 다시 클릭해주세요.');
      cleanup();
      return;
    }

    // Dynamic LZ-String inline loader if needed or raw JSON encoding
    const jsonStr = JSON.stringify(results);
    const dataHash = '#data=raw:' + encodeURIComponent(jsonStr);
    const targetUrl = '${appUrl.replace(/'/g, "\\'")}' + dataHash;

    window.open(targetUrl, '_blank');
    cleanup();
  }

  function cleanup() {
    window.__yt_extractor_active = false;
    if(box && box.parentNode) box.parentNode.removeChild(box);
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }

  function onKeyDown(e) {
    if(e.key === 'Escape') {
      cleanup();
      alert('🚫 댓글 영역 추출기가 취소되었습니다.');
    }
  }

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  alert('🔍 [댓글 영역 추출기 활성화]\\n\\n파란색 영역으로 하이라이트된 댓글 위를 클릭하면 현재 로딩된 댓글이 일괄 추출되어 텍스트마이닝 웹앱으로 전송됩니다.\\n(취소: ESC 키)');
})();`;

  // Return formatted bookmarklet URI string
  return 'javascript:' + encodeURIComponent(scriptBody.replace(/\s+/g, ' '));
}
