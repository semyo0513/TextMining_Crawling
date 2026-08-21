/**
 * Text Mining & Frequency / Co-occurrence Matrix Calculation Engine
 */

export function calculateWordFrequencies(analyzedComments, topN = 100) {
  const freqMap = new Map();

  analyzedComments.forEach(item => {
    // Unique tokens per comment to calculate document frequency or total term frequency
    const seenInComment = new Set();
    item.tokens.forEach(token => {
      const word = token.form;
      if (!word) return;
      
      freqMap.set(word, (freqMap.get(word) || 0) + 1);
      seenInComment.add(word);
    });
  });

  // Sort by count descending
  const sorted = Array.from(freqMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  return sorted.slice(0, topN);
}

export function calculateCoOccurrenceMatrix(analyzedComments, topWordsList, maxNodes = 40, minCoCount = 1) {
  const topWordsSet = new Set(topWordsList.slice(0, maxNodes).map(w => w.word));
  const wordCountMap = new Map(topWordsList.map(w => [w.word, w.count]));
  
  const pairFreq = new Map();

  analyzedComments.forEach(item => {
    // Collect unique words in this comment that belong to topWordsSet
    const wordsInDoc = Array.from(new Set(item.tokens.map(t => t.form)))
      .filter(w => topWordsSet.has(w));

    // Calculate pairwise combinations
    for (let i = 0; i < wordsInDoc.length; i++) {
      for (let j = i + 1; j < wordsInDoc.length; j++) {
        const w1 = wordsInDoc[i];
        const w2 = wordsInDoc[j];
        // Alphabetical key pair to avoid duplicates (w1-w2 vs w2-w1)
        const pairKey = w1 < w2 ? `${w1}:::${w2}` : `${w2}:::${w1}`;
        pairFreq.set(pairKey, (pairFreq.get(pairKey) || 0) + 1);
      }
    }
  });

  // Build D3 node & link format
  const activeNodesSet = new Set();
  const links = [];

  pairFreq.forEach((coCount, pairKey) => {
    if (coCount >= minCoCount) {
      const [source, target] = pairKey.split(':::');
      links.push({
        source,
        target,
        value: coCount
      });
      activeNodesSet.add(source);
      activeNodesSet.add(target);
    }
  });

  const nodes = Array.from(activeNodesSet).map(word => ({
    id: word,
    count: wordCountMap.get(word) || 1
  }));

  // Sort links by value descending
  links.sort((a, b) => b.value - a.value);

  return { nodes, links };
}

export function filterCommentsByWord(analyzedComments, word) {
  if (!word) return analyzedComments;
  const targetLower = word.toLowerCase();
  return analyzedComments.filter(item => {
    const hasInToken = item.tokens.some(t => t.form.toLowerCase() === targetLower);
    const hasInRaw = item.text.toLowerCase().includes(targetLower);
    return hasInToken || hasInRaw;
  });
}
