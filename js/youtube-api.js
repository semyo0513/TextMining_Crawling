/**
 * YouTube Data API v3 Comment Fetcher Module
 */

export function extractVideoId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Direct Video ID match (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2];
      }
      return url.searchParams.get('v');
    } else if (url.hostname.includes('youtu.be')) {
      return url.pathname.substring(1);
    }
  } catch (e) {
    // Regex fallbacks
    const match = trimmed.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  
  return null;
}

export async function fetchYoutubeComments({ apiKey, videoId, maxCount = 200, order = 'relevance', includeReplies = true, onProgress }) {
  if (!apiKey) throw new Error('YouTube Data API Key가 입력되지 않았습니다.');
  if (!videoId) throw new Error('유효한 YouTube 비디오 ID 또는 URL이 아닙니다.');

  const comments = [];
  let nextPageToken = '';
  let fetchedCount = 0;

  while (fetchedCount < maxCount) {
    const limit = Math.min(100, maxCount - fetchedCount);
    let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=${limit}&order=${order}&key=${apiKey}`;
    
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson.error?.message || `HTTP 오류: ${response.status}`;
      throw new Error(`YouTube API 호출 실패: ${errMsg}`);
    }

    const data = await response.json();
    const items = data.items || [];

    for (const item of items) {
      const topSnippet = item.snippet?.topLevelComment?.snippet;
      if (topSnippet) {
        comments.push({
          id: comments.length + 1,
          author: topSnippet.authorDisplayName ? topSnippet.authorDisplayName.replace(/^@/, '') : '익명',
          text: topSnippet.textDisplay ? stripHtml(topSnippet.textDisplay) : '',
          likes: String(topSnippet.likeCount || 0),
          publishedAt: topSnippet.publishedAt ? topSnippet.publishedAt.substring(0, 10) : ''
        });
      }

      // Fetch replies if available
      if (includeReplies && item.replies && item.replies.comments) {
        for (const reply of item.replies.comments) {
          const repSnippet = reply.snippet;
          if (repSnippet) {
            comments.push({
              id: comments.length + 1,
              author: (repSnippet.authorDisplayName || '익명 (대댓글)').replace(/^@/, ''),
              text: repSnippet.textDisplay ? stripHtml(repSnippet.textDisplay) : '',
              likes: String(repSnippet.likeCount || 0),
              publishedAt: repSnippet.publishedAt ? repSnippet.publishedAt.substring(0, 10) : ''
            });
          }
        }
      }
    }

    fetchedCount = comments.length;
    if (onProgress) onProgress(fetchedCount, maxCount);

    nextPageToken = data.nextPageToken;
    if (!nextPageToken || items.length === 0) break;
  }

  return comments;
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
