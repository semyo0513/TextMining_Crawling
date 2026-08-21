# **🚀 \[최종 계획서\] 북마클릿(Bookmarklet) 연동형 YouTube 댓글 텍스트마이닝 웹앱 (plan.md)**

> **배포 방식**: 100% Serverless 정적 웹앱 (GitHub Pages 호스팅)  
> **핵심 입력 방식**: **원클릭 북마클릿 영역 추출(API 키 불필요)** \+ **YouTube API v3 직접 수집(대량 수집)** 듀얼 모드 지원  
> **핵심 기술 스택**: Vanilla JS(ES Modules), Kiwi WASM(kiwi-nlp), D3.js v7, WordCloud2.js, Chart.js v4, Tailwind CSS, LZ-String(URL 압축 전달)

## **1\. 시스템 아키텍처 및 데이터 흐름**

크롬 확장 프로그램 설치나 Google Apps Script(GAS) 설정 없이, 북마크바의 스크립트(Bookmarklet)를 통해 유튜브 탭에서 DOM 영역을 시각적으로 추출하고 정적 웹앱으로 데이터를 전송합니다.

\[YouTube 시청 탭\]  
   │  
   ├── ① 북마클릿 클릭 ──\> 파란색 영역 선택기(DOM Inspector) 활성화  
   ├── ② 댓글 영역 클릭/자동 인식 ──\> DOM 파싱 (작성자, 댓글, 좋아요)  
   └── ③ 데이터 압축(LZ-String) 후 웹앱 탭 열기 (window.open 또는 URL Hash 전달)  
         │  
         ▼  
\[텍스트마이닝 웹앱 (GitHub Pages)\]  
   │  
   ├── ④ URL Hash(\#import=...)에서 데이터 수신 및 디코딩  
   ├── ⑤ Kiwi WASM (Web Worker) 비동기 형태소 분석 & 용언 원형화(+다)  
   └── ⑥ 3대 시각화 대시보드 렌더링  
         ├── 워드클라우드 (WordCloud2.js) ── 클릭 시 해당 댓글 교차 필터링  
         ├── 동시출현 연관어 네트워크 (D3.js Force Simulation)  
         └── 감정 분석 차트 (KNU 정적 사전 \+ Chart.js)

## **2\. 수집 파이프라인 (듀얼 모드)**

### **모드 A. 북마클릿 시각적 영역 추출기 (API 키 0원, 무설치)**

* **북마클릿 설치 UI**: 웹앱 상단에 \[✂️ 댓글 영역 추출기\] 버튼을 두고, 사용자가 브라우저 북마크바(Ctrl+Shift+B)로 드래그 앤 드롭하여 등록.  
* **유튜브 탭 내 동작**:  
  1. 마우스 호버 시 대상 요소에 **반투명 파란색 하이라이트 박스 & 태그 툴팁** 표시.  
  2. ytd-comment-thread-renderer, ytd-comment-view-model 등 유튜브 최신 웹 컴포넌트 자동 인식.  
  3. 클릭 시 화면에 렌더링된 댓글(작성자, 본문 텍스트, 좋아요 수)을 즉시 객체 배열로 추출.  
  4. 대용량 데이터 전달을 위해 LZ-String으로 압축하여 https://\<username\>.github.io/\<repo\>/\#data=\<압축문자열\> 형태로 웹앱 탭 오픈.

### **모드 B. YouTube Data API v3 수집기 (대량 심층 수집)**

* API Key 및 영상 URL 입력을 통한 최대 500개 수집 및 대댓글(Replies) 병렬 수집.  
* 정렬 기준(인기순/최신순) 선택 지원.

## **3\. 텍스트마이닝 및 시각화 엔진 명세**

### **3.1 Kiwi WASM 형태소 분석 (kiwi-worker.js)**

* **메인 스레드 분리**: 대량 텍스트 분석 중 UI 프리징을 방지하기 위해 Web Worker 환경에서 구동.  
* **품사 필터링 및 원형 복원(Lemmatization)**:  
  * 명사: NNG(일반명사), NNP(고유명사)  
  * 용언 복원: VV(동사 어간), VA(형용사 어간) 뒤에 \+ '다' 접미 결합 (먹 $\\rightarrow$ 먹다, 좋 $\\rightarrow$ 좋다).  
  * 부사: MAG  
* **필터 옵션**: 최소 글자 수 제한(2자 이상), 상위 50/100/200개 단어 선택, 사용자 정의 불용어(Stopwords) 실시간 태그 관리.

### **3.2 3대 시각화 및 인터랙션**

| 시각화 모듈 | 구현 기술 | 주요 인터랙션 및 애니메이션 |
| :---- | :---- | :---- |
| **빈도 분석 (WordCloud)** | WordCloud2.js | • 회전 각도 및 빈도별 컬러 그라데이션 • **단어 클릭 시 해당 단어가 포함된 댓글 목록으로 즉시 필터링** |
| **연관어 네트워크** | D3.js v7 (Force) | • 중심 키워드 노드 고정 (펄스 링 애니메이션) • 동시 출현 빈도($N\_{co}$)에 따른 연결선(Edge) 굵기 동적 렌더링 • 노드 드래그 & 줌/팬(Zoom & Pan) 지원 |
| **감정 분석 대시보드** | Chart.js v4 \+ KNU 사전 | • 긍정/중립/부정 도넛 차트 (부드러운 진입 애니메이션) • 감정 점수 분포 히스토그램 • 베스트 긍정 / 워스트 부정 댓글 하이라이트 카드 |

## **4\. 디렉터리 구조 (GitHub Repository)**

youtube-comment-miner/  
├── index.html              \# 단일 페이지 메인 대시보드 (Tailwind CDN, 탭 인터페이스)  
├── css/  
│   └── style.css           \# 커스텀 스타일 (인스펙터 박스, 스크롤바, 애니메이션)  
├── data/  
│   └── sentiment-dict.json \# KNU 한국어 감성사전 (14,850 단어, Key-Value JSON)  
├── js/  
│   ├── app.js              \# 전역 State 관리, 탭 전환, URL Hash Import 수신  
│   ├── bookmarklet-code.js \# 북마크바에 등록할 인스펙터 인젝션 스크립트 원본  
│   ├── youtube-api.js      \# YouTube Data API v3 호출 모듈 (대댓글 페이징)  
│   ├── kiwi-worker.js      \# Kiwi WASM Web Worker  
│   ├── textmining.js       \# 전처리, 형태소 정제, 빈도/동시출현 행렬 계산  
│   ├── wordcloud-view.js   \# WordCloud2.js 캔버스 렌더링 모듈  
│   ├── network-view.js     \# D3.js Force Simulation 네트워크 그래프  
│   ├── sentiment.js        \# 감정 사전 로드 및 점수 산출, Chart.js 연동  
│   └── utils.js            \# LZ-String 압축/해제, CSV Export, Toast 알림  
├── plan.md                 \# 본 설계 문서  
└── README.md               \# 북마클릿 사용법 및 배포 가이드

## **5\. 핵심 모듈 코드 설계**

### **5.1 북마클릿 인젝션 코드 (js/bookmarklet-code.js)**

JavaScript  
javascript:(function(){  
  if(window.\_\_yt\_extractor\_active) return;  
  window.\_\_yt\_extractor\_active \= true;

  // 1\. 오버레이 하이라이터 박스 생성  
  const box \= document.createElement('div');  
  box.style.cssText \= 'position:fixed;pointer-events:none;border:3px solid \#3b82f6;background:rgba(59,130,246,0.2);z-index:999999;transition:all 0.1s ease;display:none;';  
  document.body.appendChild(box);

  // 2\. 마우스 호버 인스펙터  
  function onMouseOver(e) {  
    const el \= e.target.closest('ytd-comment-thread-renderer, ytd-comment-view-model, \#comment');  
    if(el) {  
      const rect \= el.getBoundingClientRect();  
      box.style.display \= 'block';  
      box.style.top \= rect.top \+ 'px';  
      box.style.left \= rect.left \+ 'px';  
      box.style.width \= rect.width \+ 'px';  
      box.style.height \= rect.height \+ 'px';  
    }  
  }

  // 3\. 클릭 시 댓글 일괄 추출  
  function onClick(e) {  
    e.preventDefault();  
    e.stopPropagation();  
      
    const items \= document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model');  
    const results \= \[\];  
      
    items.forEach((item, idx) \=\> {  
      const author \= item.querySelector('\#author-text, .ytd-comment-view-model-author')?.innerText?.trim() || \`작성자${idx+1}\`;  
      const text \= item.querySelector('\#content-text, .ytd-comment-view-model-content')?.innerText?.trim();  
      const likes \= item.querySelector('\#vote-count-middle')?.innerText?.trim() || '0';  
      if(text) results.push({ id: idx+1, author, text, likes });  
    });

    if(results.length \=== 0) {  
      alert('추출할 댓글을 찾지 못했습니다. 화면을 아래로 스크롤한 후 다시 시도해주세요.');  
      cleanup();  
      return;  
    }

    // 웹앱 호스팅 주소로 데이터 전달 (LZ-String 압축 권장)  
    const targetUrl \= 'https://YOUR\_GITHUB\_ID.github.io/youtube-comment-miner/\#data=' \+ encodeURIComponent(JSON.stringify(results));  
    window.open(targetUrl, '\_blank');  
    cleanup();  
  }

  function cleanup() {  
    window.\_\_yt\_extractor\_active \= false;  
    box.remove();  
    document.removeEventListener('mouseover', onMouseOver);  
    document.removeEventListener('click', onClick, true);  
  }

  document.addEventListener('mouseover', onMouseOver);  
  document.addEventListener('click', onClick, true);  
  alert('🔍 댓글 영역 추출기가 활성화되었습니다. 유튜브 댓글 위를 클릭하세요\!');  
})();

### **5.2 웹앱 데이터 수신 (js/app.js)**

JavaScript  
window.addEventListener('DOMContentLoaded', () \=\> {  
  // URL Hash로부터 북마클릿 데이터 감지  
  if (window.location.hash.startsWith('\#data=')) {  
    try {  
      const rawData \= decodeURIComponent(window.location.hash.replace('\#data=', ''));  
      const parsedComments \= JSON.parse(rawData);  
        
      // 상태 저장 및 UI 업데이트  
      AppState.comments \= parsedComments;  
      renderCommentList(parsedComments);  
      triggerTextMiningPipeline(); // 형태소 분석 및 시각화 자동 실행  
        
      // URL 클린업  
      history.replaceState(null, '', window.location.pathname);  
      showToast(\`🎉 ${parsedComments.length}개의 댓글을 성공적으로 추출했습니다\!\`);  
    } catch (err) {  
      console.error('데이터 파싱 오류:', err);  
    }  
  }  
});

## **6\. 개발 단계별 체크리스트 (AntiGravity 개발용)**

* \[ \] **Phase 1 (UI & 북마클릿 배포 가이드)**  
  * index.html 탭 인터페이스 구성 (수집 목록, 워드클라우드, 연관어 네트워크, 감정 분석).  
  * 북마클릿 드래그 등록 카드 및 단계별 사용 안내 모달 제작.  
* \[ \] **Phase 2 (북마클릿 및 API 파서 구축)**  
  * bookmarklet-code.js 인스펙터 하이라이트 및 유튜브 DOM 파싱 정규화.  
  * YouTube Data API v3 수집기 병행 탑재 (URL 파서 및 대댓글 수집).  
* \[ \] **Phase 3 (Kiwi 형태소 엔진 연동)**  
  * data/sentiment-dict.json 정적 감성사전 배치.  
  * kiwi-worker.js Web Worker 구축 및 용언 원형화(+다), 품사 체크박스 연동.  
* \[ \] **Phase 4 (인터랙티브 시각화 & 애니메이션)**  
  * wordcloud-view.js: 캔버스 반응형 렌더링 및 단어 클릭 교차 필터링.  
  * network-view.js: D3 Force Simulation 연관어 네트워크 애니메이션.  
  * sentiment.js: 긍/부정 도넛 차트 및 감정 극성별 코멘트 뷰.  
* \[ \] **Phase 5 (GitHub Pages 최종 배포)**  
  * 정적 호스팅 배포 및 브라우저 크로스 테스트.