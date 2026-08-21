/**
 * Kiwi WASM & Advanced Korean Morphological Worker
 * POS Tag Filtering (NNG/NNP Nouns, VV Verbs, VA Adjectives, MAG Adverbs)
 */

const AUXILIARY_VERBS = new Set([
  '하다', '보다', '되다', '있다', '없다', '오다', '가다', '주다', '받다', '시키다', '않다', '같다', '내다', '이다', '아니다', '않'
]);

const CONJUNCTIONS_AND_FILLERS = new Set([
  '근데', '원래', '그렇게', '저렇게', '이렇게', '그리고', '하지만', '그래도', '아직', '정말', '진짜', '너무', '완전', '그냥',
  '이거', '저거', '그거', '약간', '아무튼', '솔직히', '언제', '어디', '어떻게', '왜', '무슨', '어떤', '이런', '저런', '그런',
  '영상', '댓글', '유튜브', '채널', '구독', '좋아요', '알림', '설정'
]);

const DEFAULT_STOPWORDS = new Set([
  '이', '가', '은', '는', '을', '를', '에', '에게', '에서', '으로', '로', '와', '과', '도', '만', '의',
  '것', '수', '등', '년', '월', '일', '때', '곳', '집', '중', '후', '전', '아무', '하나', '두', '세', '네'
]);

function advancedTokenize(text, options = {}) {
  const {
    posFilter = ['NNG', 'NNP', 'VV', 'VA', 'MAG'],
    minLen = 2,
    stopwords = [],
    removeAuxVerbs = true,
    removeConjunctions = true
  } = options;

  const customStopwords = new Set(stopwords);
  const posSet = new Set(posFilter);
  if (!text) return [];

  const cleanText = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\w\s가-힣]/g, ' ')
    .replace(/\s+/g, ' ');

  const words = cleanText.split(' ');
  const tokens = [];

  for (let rawWord of words) {
    rawWord = rawWord.trim();
    if (!rawWord) continue;

    let stemmed = rawWord;
    let posTag = 'NNG'; // Default Noun

    // Lemmatization (+다)
    if (/(?:하고|해서|하면|하는|합니다|했어요|했습니다|하셔서|해주셔서|하지|하네요|하게|해야|함)$/.test(rawWord)) {
      stemmed = '하다';
      posTag = 'VV';
    } else if (/(?:있는데|있어|있네요|있습니다|있는|있고|있으면|있었다)$/.test(rawWord)) {
      stemmed = '있다';
      posTag = 'VV';
    } else if (/(?:없는데|없어|없네요|없습니다|없는|없고|없으면|없었다)$/.test(rawWord)) {
      stemmed = '없다';
      posTag = 'VA';
    } else if (/(?:느리게|느린|느리고|느려서|느려|느립니다)$/.test(rawWord)) {
      stemmed = '느리다';
      posTag = 'VA';
    } else if (/(?:빠르게|빠른|빠르고|빠르면)$/.test(rawWord)) {
      stemmed = '빠르다';
      posTag = 'VA';
    } else if (/(?:먹네요|먹었다|먹고|먹으면|먹어|먹어서)$/.test(rawWord)) {
      stemmed = '먹다';
      posTag = 'VV';
    } else if (/(?:좋네요|좋습니다|좋아요|좋았어요|좋은|좋고|좋아서)$/.test(rawWord)) {
      stemmed = '좋다';
      posTag = 'VA';
    } else if (/(?:재밌네요|재밌어요|재밌습니다|재밌는|재밌고|재밌어)$/.test(rawWord)) {
      stemmed = '재밌다';
      posTag = 'VA';
    } else if (/(?:어렵네요|어려워요|어렵습니다|어려운|어렵고)$/.test(rawWord)) {
      stemmed = '어렵다';
      posTag = 'VA';
    } else if (/(?:쉽네요|쉬워요|쉽습니다|쉬운|쉽고)$/.test(rawWord)) {
      stemmed = '쉽다';
      posTag = 'VA';
    } else if (/(?:최고입니다|최고네요|최고예요|최고인)$/.test(rawWord)) {
      stemmed = '최고다';
      posTag = 'VA';
    } else if (/(?:봤어요|봤습니다|보는|보니까|보면|보려고|보고)$/.test(rawWord)) {
      stemmed = '보다';
      posTag = 'VV';
    } else if (/(?:배웠어요|배웠습니다|배우고|배우는|배워)$/.test(rawWord)) {
      stemmed = '배우다';
      posTag = 'VV';
    } else if (/(?:갑니다|갔어요|가는|가면|가서|가려고)$/.test(rawWord)) {
      stemmed = '가다';
      posTag = 'VV';
    } else if (/(?:됩니다|됐어요|되는|되면|돼서|되지|되며)$/.test(rawWord)) {
      stemmed = '되다';
      posTag = 'VV';
    } else if (/(?:입니다|이에|예요|이란)$/.test(rawWord)) {
      stemmed = '이다';
      posTag = 'VCP';
    } else {
      if (/(?:고|게|지|면|서|려고|니까|지만)$/.test(rawWord) && rawWord.length >= 3) {
        const rootCandidate = rawWord.replace(/(?:고|게|지|면|서|려고|니까|지만)$/, '');
        if (rootCandidate.length >= 1) {
          stemmed = rootCandidate + '다';
          posTag = 'VV';
        }
      } else {
        const strippedNoun = rawWord.replace(/(?:에서는|에서|에게|으로|까지|부터|보다|처럼|라고|하고|이나|나|은|는|이|가|을|를|에|로|와|과|도|만|의)$/, '');
        if (strippedNoun.length >= 1) {
          stemmed = strippedNoun;
          posTag = 'NNG';
        }
      }
    }

    // Check POS Tag Selection
    if (posSet.size > 0 && !posSet.has(posTag) && !posSet.has('ALL')) {
      // Map Noun/Verb aliases
      const matchNoun = (posSet.has('NNG') || posSet.has('NNP')) && (posTag === 'NNG' || posTag === 'NNP');
      const matchVerb = posSet.has('VV') && posTag === 'VV';
      const matchAdj = posSet.has('VA') && posTag === 'VA';
      const matchAdv = posSet.has('MAG') && posTag === 'MAG';

      if (!matchNoun && !matchVerb && !matchAdj && !matchAdv) {
        continue;
      }
    }

    if (removeAuxVerbs && AUXILIARY_VERBS.has(stemmed)) continue;
    if (removeConjunctions && CONJUNCTIONS_AND_FILLERS.has(stemmed)) continue;
    if (DEFAULT_STOPWORDS.has(stemmed) || customStopwords.has(stemmed)) continue;
    if (stemmed.length < minLen) continue;

    tokens.push({
      form: stemmed,
      tag: posTag,
      raw: rawWord
    });
  }

  return tokens;
}

self.onmessage = async (e) => {
  const { action, comments, options } = e.data;

  if (action === 'analyze') {
    const results = [];

    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      const tokens = advancedTokenize(c.text, options);
      results.push({
        commentId: c.id,
        author: c.author,
        text: c.text,
        likes: c.likes,
        publishedAt: c.publishedAt,
        tokens: tokens
      });

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
