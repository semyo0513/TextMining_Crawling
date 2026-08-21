/**
 * Kiwi WASM & Fallback Korean Morphological Worker
 */

let kiwiInstance = null;
let kiwiLoading = false;

// Basic Korean Stopwords & Particles
const DEFAULT_STOPWORDS = new Set([
  '이', '가', '은', '는', '을', '를', '에', '에게', '에서', '으로', '로', '와', '과', '도', '만', '의',
  '것', '수', '등', '년', '월', '일', '때', '곳', '집', '중', '후', '전', '아무', '하나', '두', '세', '네',
  '영상', '댓글', '유튜브', '채널', '구독', '좋아요', '알림', '설정', '진짜', '너무', '정말', '완전', '그냥',
  '해서', '하면', '하는', '합니다', '하세요', '입니다', '있습니다', '없습니다', '가지고', '그리고', '하지만'
]);

// Helper for pure JS Korean Morphological Lemmatization & POS extraction fallback
function fallbackTokenize(text, posFilter = ['NNG', 'NNP', 'VV', 'VA', 'MAG'], minLen = 2, customStopwords = new Set()) {
  if (!text) return [];

  // Remove URLs, special symbols, emojis
  const cleanText = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\w\s가-힣]/g, ' ')
    .replace(/\s+/g, ' ');

  const words = cleanText.split(' ');
  const tokens = [];

  for (let rawWord of words) {
    rawWord = rawWord.trim();
    if (!rawWord) continue;

    // Verb/Adjective conjugation normalization (+다)
    let stemmedWord = rawWord;
    let posTag = 'NNG'; // Default noun

    // Common Korean verb/adjective endings normalization
    if (/(?:합니다|했어요|했습니다|하는|하면|하셔서|해주셔서|하지|하네요|하게)$/.test(rawWord)) {
      stemmedWord = rawWord.replace(/(?:합니다|했어요|했습니다|하는|하면|하셔서|해주셔서|하지|하네요|하게)$/, '하다');
      posTag = 'VV';
    } else if (/(?:먹네요|먹었다|먹고|먹으면|먹어)$/.test(rawWord)) {
      stemmedWord = '먹다';
      posTag = 'VV';
    } else if (/(?:좋네요|좋습니다|좋아요|좋았어요|좋은|좋고)$/.test(rawWord)) {
      stemmedWord = '좋다';
      posTag = 'VA';
    } else if (/(?:재밌네요|재밌어요|재밌습니다|재밌는|재밌고)$/.test(rawWord)) {
      stemmedWord = '재밌다';
      posTag = 'VA';
    } else if (/(?:어렵네요|어려워요|어렵습니다|어려운)$/.test(rawWord)) {
      stemmedWord = '어렵다';
      posTag = 'VA';
    } else if (/(?:쉽네요|쉬워요|쉽습니다|쉬운)$/.test(rawWord)) {
      stemmedWord = '쉽다';
      posTag = 'VA';
    } else if (/(?:최고입니다|최고네요|최고예요|최고인)$/.test(rawWord)) {
      stemmedWord = '최고다';
      posTag = 'VA';
    } else if (/(?:봤어요|봤습니다|보는|보니까|보면)$/.test(rawWord)) {
      stemmedWord = '보다';
      posTag = 'VV';
    } else if (/(?:배웠어요|배웠습니다|배우고|배우는)$/.test(rawWord)) {
      stemmedWord = '배우다';
      posTag = 'VV';
    } else if (/(?:갑니다|갔어요|가는|가면)$/.test(rawWord)) {
      stemmedWord = '가다';
      posTag = 'VV';
    } else if (/(?:이다|입니다|이에요|예요)$/.test(rawWord)) {
      stemmedWord = rawWord.replace(/(?:입니다|이에요|예요)$/, '이다');
      posTag = 'VCP';
    } else {
      // Strip common Korean particles (조사) from Nouns
      const strippedNoun = rawWord.replace(/(?:에서는|에서|에게|으로|까지|부터|보다|처럼|라고|하고|이나|나|은|는|이|가|을|를|에|로|와|과|도|만|의)$/, '');
      if (strippedNoun.length >= 1) {
        stemmedWord = strippedNoun;
      }
    }

    // Check minimum length
    if (stemmedWord.length < minLen) continue;

    // Check Stopwords
    if (DEFAULT_STOPWORDS.has(stemmedWord) || customStopwords.has(stemmedWord)) continue;

    // Check POS filter
    if (posFilter.length > 0 && !posFilter.includes(posTag) && !posFilter.includes('ALL')) {
      // If noun tags requested, NNG and NNP allowed
      if (posFilter.includes('NOUN') && (posTag === 'NNG' || posTag === 'NNP')) {
        // ok
      } else if (posFilter.includes('VERB') && (posTag === 'VV' || posTag === 'VA')) {
        // ok
      } else {
        continue;
      }
    }

    tokens.push({
      form: stemmedWord,
      tag: posTag,
      raw: rawWord
    });
  }

  return tokens;
}

self.onmessage = async (e) => {
  const { action, comments, options } = e.data;

  if (action === 'analyze') {
    const {
      posFilter = ['NNG', 'NNP', 'VV', 'VA', 'MAG'],
      minLen = 2,
      stopwords = []
    } = options || {};

    const customStopwords = new Set(stopwords);
    const results = [];

    // Analyze each comment
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      const tokens = fallbackTokenize(c.text, posFilter, minLen, customStopwords);
      results.push({
        commentId: c.id,
        author: c.author,
        text: c.text,
        likes: c.likes,
        tokens: tokens
      });

      // Progress reporting every 25 comments
      if (i % 25 === 0 || i === comments.length - 1) {
        self.postMessage({
          type: 'progress',
          progress: Math.round(((i + 1) / comments.length) * 100)
        });
      }
    }

    self.postMessage({
      type: 'complete',
      analyzedData: results
    });
  }
};
