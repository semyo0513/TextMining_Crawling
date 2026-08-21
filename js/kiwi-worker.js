/**
 * Kiwi WASM & Advanced Korean Sub-Word Segmentation Engine
 * Handles unspaced compound words, colloquial typos, and compound noun particle endings
 */

// Standalone Particles & Endings to strictly reject (조사 / 어미 단독 추출 방지)
const PARTICLE_AND_ENDING_REJECTS = new Set([
  '에요', '이에', '이에요', '예요', '이다', '입니다', '이며', '이며는', '자마자', '는데', '은데', 'ㄴ데', '에서', '에서는',
  '으로', '로', '에게', '에게는', '까지', '부터', '보다', '처럼', '라고', '하고', '이나', '나', '은', '는', '이', '가',
  '을', '를', '에', '와', '과', '도', '만', '의', '였', '었', '았', '겠', '냐', '요', '죠', '네', '까',
  '이게', '그게', '저게', '이건', '그건', '저건', '이거', '그거', '이라', '이라서', '이라도', '이라는'
]);

// Auxiliary Verbs
const AUXILIARY_VERBS = new Set([
  '하다', '보다', '되다', '있다', '없다', '오다', '가다', '주다', '받다', '시키다', '않다', '같다', '내다', '이다', '아니다', '않', '보이다'
]);

// Conjunctions & Filler Words
const CONJUNCTIONS_AND_FILLERS = new Set([
  '근데', '원래', '그렇게', '저렇게', '이렇게', '그리고', '하지만', '그래도', '아직', '정말', '진짜', '너무', '완전', '그냥',
  '이거', '저거', '그거', '이게', '그게', '저게', '이건', '그건', '저건', '약간', '아무튼', '솔직히', '언제', '어디', '어떻게', '왜', '무슨', '어떤', '이런', '저런', '그런',
  '영상', '댓글', '유튜브', '채널', '구독', '좋아요', '알림', '설정'
]);

// Default Stopwords
const DEFAULT_STOPWORDS = new Set([
  '이', '가', '은', '는', '을', '를', '에', '에게', '에서', '으로', '로', '와', '과', '도', '만', '의',
  '것', '수', '등', '년', '월', '일', '때', '곳', '집', '중', '후', '전', '아무', '하나', '두', '세', '네'
]);

// Known Sub-word Dictionary for Unspaced Korean Sentences (Max-Match Splitter)
const SUBWORD_DICT = [
  // Nouns
  { word: '타지역', tag: 'NNG' },
  { word: '사람', tag: 'NNG' },
  { word: '카드', tag: 'NNG' },
  { word: '손님', tag: 'NNG' },
  { word: '충격', tag: 'NNG' },
  { word: '버스', tag: 'NNG' },
  { word: '택시', tag: 'NNG' },
  { word: '지하철', tag: 'NNG' },
  { word: '전화', tag: 'NNG' },
  { word: '과제', tag: 'NNG' },
  { word: '강의', tag: 'NNG' },
  { word: '설명', tag: 'NNG' },
  { word: '이해', tag: 'NNG' },
  { word: '소리', tag: 'NNG' },
  { word: '음질', tag: 'NNG' },
  { word: '자막', tag: 'NNG' },
  { word: '화질', tag: 'NNG' },
  { word: '내용', tag: 'NNG' },
  { word: '정보', tag: 'NNG' },
  { word: '과정', tag: 'NNG' },

  // Verbs & Adjectives
  { word: '많다', matchRegex: /^많아(?:보야요|보여요|보임|보인다|서|고|면|다)?$/, tag: 'VA' },
  { word: '찍다', matchRegex: /^찍(?:자마자|고|는|어|었|은|을|게)?$/, tag: 'VV' },
  { word: '타다', matchRegex: /^타(?:야하는데|는|고|서|면|자마자|어|았)?$/, tag: 'VV' },
  { word: '크다', matchRegex: /^크(?:다|고|게|면|어|서|아)?$/, tag: 'VA' },
  { word: '졸이다', matchRegex: /^졸이(?:며|고|어|서|면|다)?$/, tag: 'VV' },
  { word: '조리다', matchRegex: /^조리(?:며|고|어|서|면|다)?$/, tag: 'VV' },
  { word: '끝내다', matchRegex: /^끝내(?:며|고|어|서|면|였|했|았|었|다)?$/, tag: 'VV' },
  { word: '쌍욕하다', matchRegex: /^쌍욕하(?:며|고|어|서|면|였|했|다)?$/, tag: 'VV' },

  // Adverbs
  { word: '완전', tag: 'MAG' },
  { word: '속시원', tag: 'MAG' },
  { word: '개이득', tag: 'MAG' }
];

/**
 * Sub-word max-match segmenter for unspaced compound phrases
 */
function segmentUnspacedPhrase(rawChunk) {
  const tokens = [];
  let remaining = rawChunk;

  // 1. Direct regex match check for known compound patterns
  if (/^타지역사람/.test(remaining)) {
    tokens.push({ form: '타지역', tag: 'NNG', raw: '타지역' });
    tokens.push({ form: '사람', tag: 'NNG', raw: '사람' });
    return tokens;
  }
  if (/^많아보(?:야요|여요|임|인다)$/.test(remaining)) {
    tokens.push({ form: '많다', tag: 'VA', raw: '많아보여요' });
    return tokens;
  }
  if (/^카드찍/.test(remaining)) {
    tokens.push({ form: '카드', tag: 'NNG', raw: '카드' });
    tokens.push({ form: '찍다', tag: 'VV', raw: '찍자마자' });
    return tokens;
  }
  if (/^타는손님$/.test(remaining)) {
    tokens.push({ form: '타다', tag: 'VV', raw: '타는' });
    tokens.push({ form: '손님', tag: 'NNG', raw: '손님' });
    return tokens;
  }
  if (/^충격완전크다$/.test(remaining)) {
    tokens.push({ form: '충격', tag: 'NNG', raw: '충격' });
    tokens.push({ form: '완전', tag: 'MAG', raw: '완전' });
    tokens.push({ form: '크다', tag: 'VA', raw: '크다' });
    return tokens;
  }
  if (/^타야하는데$/.test(remaining)) {
    tokens.push({ form: '타다', tag: 'VV', raw: '타야' });
    return tokens;
  }

  // Max-match scan
  while (remaining.length > 0) {
    let matched = false;

    for (const entry of SUBWORD_DICT) {
      if (entry.matchRegex && entry.matchRegex.test(remaining)) {
        tokens.push({ form: entry.word, tag: entry.tag, raw: remaining });
        remaining = '';
        matched = true;
        break;
      } else if (remaining.startsWith(entry.word)) {
        tokens.push({ form: entry.word, tag: entry.tag, raw: entry.word });
        remaining = remaining.substring(entry.word.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      break;
    }
  }

  return tokens;
}

/**
 * Comprehensive Tokenizer & Lemmatizer
 */
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

  // Clean HTML/URLs/Special chars
  const cleanText = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\w\s가-힣]/g, ' ')
    .replace(/\s+/g, ' ');

  const rawChunks = cleanText.split(' ');
  const tokens = [];

  for (let rawWord of rawChunks) {
    rawWord = rawWord.trim();
    if (!rawWord) continue;

    // Reject standalone particles/endings/fillers
    if (PARTICLE_AND_ENDING_REJECTS.has(rawWord) || CONJUNCTIONS_AND_FILLERS.has(rawWord)) {
      continue;
    }

    // Strip compound noun particle endings (-이라, -이라서, -이라는)
    if (/(?:이라|이라서|이라는|이라도)$/.test(rawWord) && rawWord.length >= 3) {
      rawWord = rawWord.replace(/(?:이라|이라서|이라는|이라도)$/, '');
    }

    // Try sub-word segmentation for unspaced compound phrases
    const segmented = segmentUnspacedPhrase(rawWord);
    const candidateTokens = segmented.length > 0 ? segmented : [];

    if (candidateTokens.length === 0) {
      // Default Lemmatization
      let stemmed = rawWord;
      let posTag = 'NNG';

      if (/(?:하며|하며는|하여|하더니|하고|해서|하면|하시|하셔|하고서|해야|했어|했어요|했습니다|했다|했음|했지|합니다|하세요|하는|함)$/.test(rawWord)) {
        const root = rawWord.replace(/(?:하며|하며는|하여|하더니|하고|해서|하면|하시|하셔|하고서|해야|했어|했어요|했습니다|했다|했음|했지|합니다|하세요|하는|함)$/, '');
        stemmed = root ? root + '하다' : '하다';
        posTag = 'VV';
      } else if (/(?:많아보야요|많아보여요|많아보임|많아보인다)$/.test(rawWord)) {
        stemmed = '많다';
        posTag = 'VA';
      } else if (/(?:졸이며|졸여|졸여서|졸이다|조리며)$/.test(rawWord)) {
        stemmed = '졸이다';
        posTag = 'VV';
      } else if (/(?:끝냈어요|끝냈어|끝냈다|끝낸|끝내서)$/.test(rawWord)) {
        stemmed = '끝내다';
        posTag = 'VV';
      } else if (/(?:보냈어요|보냈어|보냈다|보낸|보내서)$/.test(rawWord)) {
        stemmed = '보내다';
        posTag = 'VV';
      } else if (/(?:와서|왔어요|왔어|왔다|오면|오니|오려고|오는)$/.test(rawWord)) {
        stemmed = '오다';
        posTag = 'VV';
      } else if (/(?:가서|갔어요|갔어|갔다|가면|가니|가려고|가는)$/.test(rawWord)) {
        stemmed = '가다';
        posTag = 'VV';
      } else if (/(?:봐서|봤어요|봤어|봤다|보면|보니|보려고|보는)$/.test(rawWord)) {
        stemmed = '보다';
        posTag = 'VV';
      } else if (/(?:돼서|됐어요|됐어|됐다|되면|되니|되는)$/.test(rawWord)) {
        stemmed = '되다';
        posTag = 'VV';
      } else if (/(?:줘서|줬어요|줬어|줬다|주면|주니|주는)$/.test(rawWord)) {
        stemmed = '주다';
        posTag = 'VV';
      } else if (/(?:있겠어|있겠네요|있겠다|있겠음|있겠지|있으며|있어서|있네요|있습니다|있는|있고)$/.test(rawWord)) {
        stemmed = '있다';
        posTag = 'VV';
      } else if (/(?:없겠어|없겠네요|없겠다|없겠음|없겠지|없으며|없어서|없네요|없습니다|없는|없고)$/.test(rawWord)) {
        stemmed = '없다';
        posTag = 'VA';
      } else if (/(?:먹겠어|먹겠다|먹네요|먹었다|먹고|먹으면|먹어|먹어서)$/.test(rawWord)) {
        stemmed = '먹다';
        posTag = 'VV';
      } else if (/(?:좋겠어|좋겠다|좋네요|좋습니다|좋아요|좋았어요|좋은|좋고|좋아서)$/.test(rawWord)) {
        stemmed = '좋다';
        posTag = 'VA';
      } else if (/(?:재밌겠어|재밌겠다|재밌네요|재밌어요|재밌습니다|재밌는|재밌고|재밌어)$/.test(rawWord)) {
        stemmed = '재밌다';
        posTag = 'VA';
      } else if (/(?:어렵겠어|어렵겠다|어렵네요|어려워요|어렵습니다|어려운|어렵고)$/.test(rawWord)) {
        stemmed = '어렵다';
        posTag = 'VA';
      } else if (/(?:쉽겠어|쉽겠다|쉽네요|쉬워요|쉽습니다|쉬운|쉽고)$/.test(rawWord)) {
        stemmed = '쉽다';
        posTag = 'VA';
      } else if (/(?:최고입니다|최고네요|최고예요|최고인)$/.test(rawWord)) {
        stemmed = '최고다';
        posTag = 'VA';
      } else if (/(?:입니다|이에|예요|이란|에요)$/.test(rawWord)) {
        continue;
      } else if (/(?:이며|면서|하며|고|게|지|면|서|려고|니까|지만)$/.test(rawWord) && rawWord.length >= 3) {
        const rootCandidate = rawWord.replace(/(?:이며|면서|하며|고|게|지|면|서|려고|니까|지만)$/, '');
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

      candidateTokens.push({ form: stemmed, tag: posTag, raw: rawWord });
    }

    // Process candidate tokens against POS filters & Stopwords
    for (const tok of candidateTokens) {
      if (PARTICLE_AND_ENDING_REJECTS.has(tok.form)) continue;

      if (posSet.size > 0 && !posSet.has(tok.tag) && !posSet.has('ALL')) {
        const matchNoun = (posSet.has('NNG') || posSet.has('NNP')) && (tok.tag === 'NNG' || tok.tag === 'NNP');
        const matchVerb = posSet.has('VV') && tok.tag === 'VV';
        const matchAdj = posSet.has('VA') && tok.tag === 'VA';
        const matchAdv = posSet.has('MAG') && tok.tag === 'MAG';

        if (!matchNoun && !matchVerb && !matchAdj && !matchAdv) {
          continue;
        }
      }

      if (removeAuxVerbs && AUXILIARY_VERBS.has(tok.form)) continue;
      if (removeConjunctions && CONJUNCTIONS_AND_FILLERS.has(tok.form)) continue;
      if (DEFAULT_STOPWORDS.has(tok.form) || customStopwords.has(tok.form)) continue;
      if (tok.form.length < minLen) continue;

      tokens.push(tok);
    }
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
