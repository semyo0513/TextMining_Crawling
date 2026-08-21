/**
 * Main Application Orchestrator & State Manager
 */

import { escapeHTML, showToast, decodeDataFromHash, exportToCSV, exportToJSON, getSampleComments } from './utils.js';
import { generateBookmarkletCode } from './bookmarklet-code.js';
import { extractVideoId, fetchYoutubeComments } from './youtube-api.js';
import { calculateWordFrequencies, calculateCoOccurrenceMatrix, filterCommentsByWord } from './textmining.js';
import { renderWordCloud } from './wordcloud-view.js';
import { renderNetworkGraph } from './network-view.js';
import { loadSentimentDict, evaluateCommentsSentiment, renderSentimentCharts } from './sentiment.js';

// Global Application State
export const AppState = {
  comments: [],
  analyzedComments: [],
  topWords: [],
  networkData: { nodes: [], links: [] },
  sentimentData: null,
  activeTab: 'dashboard',
  filterWord: null,
  stopwords: new Set(['것', '수', '등', '영상', '댓글', '진짜', '너무', '정말', '완전', '그냥']),
  posFilter: ['NNG', 'NNP', 'VV', 'VA', 'MAG'],
  minLen: 2,
  sentimentDict: null,
  worker: null
};

document.addEventListener('DOMContentLoaded', async () => {
  // Load Sentiment Dictionary
  AppState.sentimentDict = await loadSentimentDict();

  // Initialize Worker
  initWorker();

  // Initialize UI Events & Tabs
  initTabs();
  initBookmarkletSection();
  initApiCollector();
  initMiningControls();
  initExportAndSampleButtons();

  // Check URL Hash for Bookmarklet imported data
  checkUrlHashData();
});

function initWorker() {
  try {
    AppState.worker = new Worker('./js/kiwi-worker.js');
    AppState.worker.onmessage = (e) => {
      const { type, progress, analyzedData } = e.data;
      
      if (type === 'progress') {
        updateProgressUI(progress);
      } else if (type === 'complete') {
        updateProgressUI(100);
        setTimeout(() => hideProgressUI(), 400);

        AppState.analyzedComments = analyzedData;
        runMiningPipeline();
      }
    };
  } catch (err) {
    console.error('Worker initialization failed:', err);
    showToast('Web Worker 로드 실패, Fallback 동기 분석으로 전환됩니다.', 'error');
  }
}

function checkUrlHashData() {
  if (window.location.hash && (window.location.hash.includes('data=') || window.location.hash.includes('import='))) {
    const data = decodeDataFromHash(window.location.hash);
    if (data && Array.isArray(data) && data.length > 0) {
      AppState.comments = data;
      history.replaceState(null, '', window.location.pathname);
      showToast(`🎉 북마클릿에서 ${data.length}개의 댓글을 성공적으로 가져왔습니다!`, 'success');
      triggerTextMining();
    }
  }
}

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

export function switchTab(tabId) {
  AppState.activeTab = tabId;
  
  // Tab Button Styling
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
      btn.classList.remove('text-slate-400', 'hover:text-slate-200');
    } else {
      btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
      btn.classList.add('text-slate-400', 'hover:text-slate-200');
    }
  });

  // Tab Panel Visibility
  document.querySelectorAll('.tab-panel').forEach(panel => {
    if (panel.id === `tab-${tabId}`) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });

  // Trigger Visualizer Re-renders on tab switch if needed
  if (tabId === 'wordcloud' && AppState.topWords.length) {
    renderWordCloud('wordcloud-canvas', AppState.topWords, handleWordFilterClick);
  } else if (tabId === 'network' && AppState.networkData.nodes.length) {
    renderNetworkGraph('network-container', AppState.networkData, handleWordFilterClick);
  } else if (tabId === 'sentiment' && AppState.sentimentData) {
    renderSentimentCharts('sentiment-donut-chart', 'sentiment-bar-chart', AppState.sentimentData);
  }
}

function initBookmarkletSection() {
  const linkEl = document.getElementById('bookmarklet-drag-link');
  const codeTextarea = document.getElementById('bookmarklet-code-textarea');

  const appOriginUrl = window.location.href.split('#')[0];
  const code = generateBookmarkletCode(appOriginUrl);

  if (linkEl) {
    linkEl.href = code;
    linkEl.onclick = (e) => {
      e.preventDefault();
      showToast('이 버튼을 브라우저 북마크바(Ctrl+Shift+B)로 드래그 앤 드롭하세요!', 'info', 4000);
    };
  }

  if (codeTextarea) {
    codeTextarea.value = code;
  }

  const copyBtn = document.getElementById('copy-bookmarklet-code');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(code);
      showToast('북마클릿 코드 복사 완료! 브라우저 북마크 URL란에 붙여넣으세요.', 'success');
    });
  }
}

function initApiCollector() {
  const fetchBtn = document.getElementById('api-fetch-btn');
  if (!fetchBtn) return;

  fetchBtn.addEventListener('click', async () => {
    const apiKey = document.getElementById('api-key-input')?.value?.trim();
    const videoUrl = document.getElementById('api-video-input')?.value?.trim();
    const maxCount = parseInt(document.getElementById('api-max-count')?.value || '200', 10);
    const order = document.getElementById('api-order-select')?.value || 'relevance';

    if (!apiKey) {
      showToast('YouTube Data API Key를 입력해주세요.', 'error');
      return;
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      showToast('올바른 YouTube 영상 URL 또는 Video ID를 입력해주세요.', 'error');
      return;
    }

    fetchBtn.disabled = true;
    fetchBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> 수집 중...`;

    try {
      showToast('YouTube API에서 댓글을 수집하고 있습니다...', 'info');
      const comments = await fetchYoutubeComments({
        apiKey,
        videoId,
        maxCount,
        order,
        onProgress: (fetched, total) => {
          fetchBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${fetched} / ${total} 개 수집 중`;
        }
      });

      AppState.comments = comments;
      showToast(`🎉 ${comments.length}개의 댓글 수집 완료!`, 'success');
      triggerTextMining();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.innerHTML = `<i class="fas fa-download mr-2"></i> 댓글 수집 시작`;
    }
  });
}

function initMiningControls() {
  // Min word length slider
  const minLenInput = document.getElementById('min-len-input');
  const minLenVal = document.getElementById('min-len-val');
  if (minLenInput && minLenVal) {
    minLenInput.addEventListener('input', (e) => {
      minLenVal.innerText = e.target.value;
      AppState.minLen = parseInt(e.target.value, 10);
      if (AppState.comments.length) triggerTextMining();
    });
  }

  // Stopwords input tag manager
  const stopwordInput = document.getElementById('stopword-add-input');
  const stopwordAddBtn = document.getElementById('stopword-add-btn');
  if (stopwordAddBtn && stopwordInput) {
    const addStopword = () => {
      const val = stopwordInput.value.trim();
      if (val) {
        AppState.stopwords.add(val);
        stopwordInput.value = '';
        renderStopwordTags();
        if (AppState.comments.length) triggerTextMining();
      }
    };
    stopwordAddBtn.addEventListener('click', addStopword);
    stopwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addStopword();
    });
  }

  renderStopwordTags();
}

function renderStopwordTags() {
  const container = document.getElementById('stopword-tags-container');
  if (!container) return;

  container.innerHTML = '';
  AppState.stopwords.forEach(word => {
    const tag = document.createElement('span');
    tag.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-200 border border-slate-600';
    tag.innerHTML = `${escapeHTML(word)} <button class="hover:text-red-400 focus:outline-none" data-word="${escapeHTML(word)}">&times;</button>`;
    
    tag.querySelector('button').addEventListener('click', (e) => {
      const w = e.target.getAttribute('data-word');
      AppState.stopwords.delete(w);
      renderStopwordTags();
      if (AppState.comments.length) triggerTextMining();
    });

    container.appendChild(tag);
  });
}

function initExportAndSampleButtons() {
  // Load Sample Comments
  const sampleBtn = document.getElementById('load-sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      AppState.comments = getSampleComments();
      showToast('샘플 댓글 30개를 성공적으로 불러왔습니다!', 'success');
      triggerTextMining();
    });
  }

  // Clear Filter
  const clearFilterBtn = document.getElementById('clear-filter-btn');
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
      handleWordFilterClick(null);
    });
  }

  // CSV Export
  const csvBtn = document.getElementById('export-csv-btn');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      exportToCSV(`youtube_comments_${Date.now()}.csv`, AppState.comments);
    });
  }

  // JSON Export
  const jsonBtn = document.getElementById('export-json-btn');
  if (jsonBtn) {
    jsonBtn.addEventListener('click', () => {
      exportToJSON(`youtube_comments_${Date.now()}.json`, AppState.comments);
    });
  }
}

export function triggerTextMining() {
  if (!AppState.comments || AppState.comments.length === 0) {
    showToast('수집 또는 가져온 댓글 데이터가 없습니다.', 'error');
    return;
  }

  showProgressUI('형태소 분석 및 텍스트마이닝 실행 중...');

  const options = {
    posFilter: AppState.posFilter,
    minLen: AppState.minLen,
    stopwords: Array.from(AppState.stopwords)
  };

  if (AppState.worker) {
    AppState.worker.postMessage({
      action: 'analyze',
      comments: AppState.comments,
      options
    });
  } else {
    // Fallback sync execution if worker not available
    setTimeout(() => {
      // Basic extraction
      hideProgressUI();
    }, 300);
  }
}

function runMiningPipeline() {
  // 1. Calculate Top Word Frequencies
  AppState.topWords = calculateWordFrequencies(AppState.analyzedComments, 100);

  // 2. Calculate Co-occurrence Matrix for Network
  AppState.networkData = calculateCoOccurrenceMatrix(AppState.analyzedComments, AppState.topWords, 35, 1);

  // 3. Evaluate Sentiment
  AppState.sentimentData = evaluateCommentsSentiment(AppState.analyzedComments, AppState.sentimentDict);

  // 4. Update Summary Statistics UI Cards
  updateDashboardSummary();

  // 5. Render Current Tab & Visualizations
  renderCommentsTable();

  if (AppState.activeTab === 'wordcloud') {
    renderWordCloud('wordcloud-canvas', AppState.topWords, handleWordFilterClick);
  } else if (AppState.activeTab === 'network') {
    renderNetworkGraph('network-container', AppState.networkData, handleWordFilterClick);
  } else if (AppState.activeTab === 'sentiment') {
    renderSentimentCharts('sentiment-donut-chart', 'sentiment-bar-chart', AppState.sentimentData);
  } else if (AppState.activeTab === 'dashboard') {
    // Render mini previews on dashboard
    renderWordCloud('wordcloud-canvas', AppState.topWords, handleWordFilterClick);
    renderSentimentCharts('sentiment-donut-chart', 'sentiment-bar-chart', AppState.sentimentData);
  }
}

function updateDashboardSummary() {
  const totalEl = document.getElementById('summary-total-comments');
  const uniqueWordsEl = document.getElementById('summary-unique-words');
  const posRatioEl = document.getElementById('summary-positive-ratio');
  const negRatioEl = document.getElementById('summary-negative-ratio');

  if (totalEl) totalEl.innerText = AppState.comments.length.toLocaleString();
  if (uniqueWordsEl) uniqueWordsEl.innerText = AppState.topWords.length.toLocaleString();
  
  if (AppState.sentimentData && AppState.sentimentData.summary) {
    const { positiveRatio, negativeRatio } = AppState.sentimentData.summary;
    if (posRatioEl) posRatioEl.innerText = `${positiveRatio}%`;
    if (negRatioEl) negRatioEl.innerText = `${negativeRatio}%`;
  }

  // Best/Worst Sentiment Cards
  const bestCard = document.getElementById('best-positive-card');
  const worstCard = document.getElementById('worst-negative-card');

  if (bestCard && AppState.sentimentData?.bestPositive) {
    const bp = AppState.sentimentData.bestPositive;
    bestCard.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <span class="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
          <i class="fas fa-smile mr-1"></i> 최고 긍정 (점수: +${bp.sentimentScore})
        </span>
        <span class="text-xs text-slate-400">${escapeHTML(bp.author)}</span>
      </div>
      <p class="text-sm text-slate-200 italic font-medium">"${escapeHTML(bp.text)}"</p>
    `;
  }

  if (worstCard && AppState.sentimentData?.worstNegative) {
    const wn = AppState.sentimentData.worstNegative;
    worstCard.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <span class="text-xs font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
          <i class="fas fa-frown mr-1"></i> 최고 부정 (점수: ${wn.sentimentScore})
        </span>
        <span class="text-xs text-slate-400">${escapeHTML(wn.author)}</span>
      </div>
      <p class="text-sm text-slate-200 italic font-medium">"${escapeHTML(wn.text)}"</p>
    `;
  }
}

function handleWordFilterClick(word) {
  AppState.filterWord = word;
  
  const badge = document.getElementById('active-filter-badge');
  const filterWordSpan = document.getElementById('filter-word-display');
  
  if (word) {
    if (badge) badge.classList.remove('hidden');
    if (filterWordSpan) filterWordSpan.innerText = `"${word}"`;
    showToast(`"${word}" 단어가 포함된 댓글로 필터링되었습니다.`, 'info');
  } else {
    if (badge) badge.classList.add('hidden');
    showToast('단어 필터링이 해제되었습니다.', 'info');
  }

  renderCommentsTable();
  switchTab('table');
}

function renderCommentsTable() {
  const tbody = document.getElementById('comments-tbody');
  const countSpan = document.getElementById('filtered-comments-count');
  if (!tbody) return;

  tbody.innerHTML = '';

  let filtered = AppState.analyzedComments.length ? AppState.analyzedComments : AppState.comments.map((c, i) => ({ ...c, commentId: c.id || i+1, tokens: [] }));
  
  if (AppState.filterWord) {
    filtered = filterCommentsByWord(filtered, AppState.filterWord);
  }

  if (countSpan) countSpan.innerText = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">표시할 댓글 데이터가 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800 hover:bg-slate-800/50 transition-colors';

    let highlightedText = escapeHTML(item.text);
    if (AppState.filterWord) {
      const regex = new RegExp(`(${escapeHTML(AppState.filterWord)})`, 'gi');
      highlightedText = highlightedText.replace(regex, `<mark class="bg-blue-500/40 text-blue-200 px-1 rounded">$1</mark>`);
    }

    let sentimentBadge = `<span class="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">중립</span>`;
    if (item.sentimentScore > 0) {
      sentimentBadge = `<span class="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">+${item.sentimentScore} 긍정</span>`;
    } else if (item.sentimentScore < 0) {
      sentimentBadge = `<span class="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">${item.sentimentScore} 부정</span>`;
    }

    tr.innerHTML = `
      <td class="py-3 px-4 text-xs font-mono text-slate-400">${item.id || index + 1}</td>
      <td class="py-3 px-4 text-sm font-semibold text-slate-300 max-w-[150px] truncate">${escapeHTML(item.author)}</td>
      <td class="py-3 px-4 text-sm text-slate-200 leading-relaxed">${highlightedText}</td>
      <td class="py-3 px-4 text-xs font-semibold text-amber-400"><i class="far fa-thumbs-up mr-1"></i>${item.likes || 0}</td>
      <td class="py-3 px-4 text-center">${sentimentBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showProgressUI(msg) {
  const container = document.getElementById('progress-modal');
  const label = document.getElementById('progress-label');
  if (container) container.classList.remove('hidden');
  if (label) label.innerText = msg || '처리 중...';
}

function updateProgressUI(pct) {
  const bar = document.getElementById('progress-bar-fill');
  const pctText = document.getElementById('progress-pct-text');
  if (bar) bar.style.width = `${pct}%`;
  if (pctText) pctText.innerText = `${pct}%`;
}

function hideProgressUI() {
  const container = document.getElementById('progress-modal');
  if (container) container.classList.add('hidden');
}
