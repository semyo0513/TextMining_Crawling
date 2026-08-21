/**
 * Kiwi WASM & Advanced Korean Morphological Worker
 * Comprehensive Korean Verb/Adjective Conjugation Parser & Lemmatizer (+다)
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

/**
 * Advanced Korean Morphological Conjugation Lemmatizer (+다)
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

    // 1. Check '-하다' Compound Conjugations (e.g. 쌍욕하며 -> 쌍욕하다, 전화해서 -> 전화하다)
    if (/(?:하며|하며는|하여|하더니|하고|해서|하면|하시|하셔|하고서|해야|했어|했어요|했습니다|했다|했음|했지|합니다|하세요|하는|함)$/.test(rawWord)) {
      const root = rawWord.replace(/(?:하며|하며는|하여|하더니|하고|해서|하면|하시|하셔|하고서|해야|했어|했어요|했습니다|했다|했음|했지|합니다|하세요|하는|함)$/, '');
      stemmed = root ? root + '하다' : '하다';
      posTag = 'VV';
    }
    // 2. Check Past Tense Suffixes (-냈-, -왔-, -갔-, -봤-, -줬-, -됐-, -았-, -었-)
    else if (/(?:끝냈어요|끝냈어|끝냈다|끝낸|끝내서)$/.test(rawWord)) {
      stemmed = '끝내다';
      posTag = 'VV';
    } else if (/(?:보냈어요|보냈어|보냈다|보낸|보내서)$/.test(rawWord)) {
      stemmed = '보내다';
      posTag = 'VV';
    } else if (/(?:꺼냈어요|꺼냈어|꺼냈다|꺼낸|꺼내서)$/.test(rawWord)) {
      stemmed = '꺼내다';
      posTag = 'VV';
    } else if (/(?:지냈어요|지냈어|지냈다|지낸|지내서)$/.test(rawWord)) {
      stemmed = '지내다';
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
    } else if (/(?:알아서|알았어요|알았어|알았다|알면|알니|아는|알며)$/.test(rawWord)) {
      stemmed = '알다';
      posTag = 'VV';
    } else if (/(?:받아서|받았어요|받았어|받았다|받으면|받으며)$/.test(rawWord)) {
      stemmed = '받다';
      posTag = 'VV';
    } else if (/(?:만들어|만들어서|만들었어요|만들었어|만들었다|만들며)$/.test(rawWord)) {
      stemmed = '만들다';
      posTag = 'VV';
    } else if (/(?:웃어서|웃었어요|웃었어|웃었다|웃으며|웃고)$/.test(rawWord)) {
      stemmed = '웃다';
      posTag = 'VV';
    } else if (/(?:울어서|울었어요|울었어|울었다|울며|울고)$/.test(rawWord)) {
      stemmed = '울다';
      posTag = 'VV';
    } else if (/(?:살아서|살았어요|살았어|살았다|살며|살고)$/.test(rawWord)) {
      stemmed = '살다';
      posTag = 'VV';
    }
    // 3. Check Future/Presumptive Suffixes (-겠-)
    else if (/(?:있겠어|있겠네요|있겠다|있겠음|있겠지|있으며|있어서|있네요|있습니다|있는|있고)$/.test(rawWord)) {
      stemmed = '있다';
      posTag = 'VV';
    } else if (/(?:없겠어|없겠네요|없겠다|없겠음|없겠지|없으며|없어서|없네요|없습니다|없는|없고)$/.test(rawWord)) {
      stemmed = '없다';
      posTag = 'VA';
    } else if (/(?:하겠어|하겠다|하겠네|하겠음|하겠지)$/.test(rawWord)) {
      stemmed = '하다';
      posTag = 'VV';
    } else if (/(?:오겠어|오겠다|오겠네|오겠음)$/.test(rawWord)) {
      stemmed = '오다';
      posTag = 'VV';
    } else if (/(?:가겠어|가겠다|가겠네|가겠음)$/.test(rawWord)) {
      stemmed = '가다';
      posTag = 'VV';
    } else if (/(?:보겠어|보겠다|보겠네|보겠음)$/.test(rawWord)) {
      stemmed = '보다';
      posTag = 'VV';
    } else if (/(?:먹겠어|먹겠다|먹겠네|먹겠음|먹네요|먹었다|먹고|먹으면|먹어|먹어서)$/.test(rawWord)) {
      stemmed = '먹다';
      posTag = 'VV';
    } else if (/(?:좋겠어|좋겠다|좋겠네|좋네요|좋습니다|좋아요|좋았어요|좋은|좋고|좋아서)$/.test(rawWord)) {
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
    } else if (/(?:배웠어요|배웠습니다|배우고|배우는|배워)$/.test(rawWord)) {
      stemmed = '배우다';
      posTag = 'VV';
    } else if (/(?:입니다|이에요|예요|이란)$/.test(rawWord)) {
      stemmed = '이다';
      posTag = 'VCP';
    }
    // 4. General Verb/Adjective Stem Suffix Stripping (-며, -서, -고, -게, -지, -면, -려고, -니까, -지만)
    else if (/(?:이며|면서|하며|고|게|지|면|서|려고|니까|지만)$/.test(rawWord) && rawWord.length >= 3) {
      const rootCandidate = rawWord.replace(/(?:이며|면서|하며|고|게|지|면|서|려고|니까|지만)$/, '');
      if (rootCandidate.length >= 1) {
        stemmed = rootCandidate + '다';
        posTag = 'VV';
      }
    }
    // 5. Noun Particle Stripping
    else {
      const strippedNoun = rawWord.replace(/(?:에서는|에서|에게|으로|까지|부터|보다|처럼|라고|하고|이나|나|은|는|이|가|을|를|에|로|와|과|도|만|의)$/, '');
      if (strippedNoun.length >= 1) {
        stemmed = strippedNoun;
        posTag = 'NNG';
      }
    }

    // Check POS Tag Filter
    if (posSet.size > 0 && !posSet.has(posTag) && !posSet.has('ALL')) {
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
