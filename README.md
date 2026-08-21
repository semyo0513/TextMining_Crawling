# 🚀 YouTube 댓글 영역 추출기 & 텍스트마이닝 웹앱 (v2.0 Serverless)

> **100% Serverless 정적 웹앱** (GitHub Pages 호스팅 호환)  
> **듀얼 수집 방식**: 원클릭 북마클릿 시각적 영역 추출 (API 키 필요 없음) + YouTube Data API v3 (대량/대댓글 수집)  
> **핵심 스택**: Vanilla JS (ES Modules), Kiwi WASM (Web Worker), D3.js v7 (Force Simulation), WordCloud2.js, Chart.js v4, Tailwind CSS, LZ-String

---

## 🌟 주요 기능

1. **✂️ 모드 A: 원클릭 북마클릿 시각적 영역 추출기 (API 키 0원, 무설치)**
   - 브라우저 북마크바(Ctrl+Shift+B)에 버튼 하나만 등록하면 사용 준비 완료.
   - 유튜브 시청 페이지에서 마우스 호버 시 **반투명 파란색 하이라이트 박스**가 댓글 영역을 자동으로 인식.
   - 클릭 한 번으로 작성자, 댓글 본문, 좋아요 수, 작성일을 추출하여 압축 URL Hash로 웹앱에 자동 전달.

2. **🔑 모드 B: YouTube Data API v3 심층 수집기**
   - API Key와 영상 URL(또는 Shorts URL/Video ID) 입력으로 최대 500개 댓글 및 대댓글(Replies) 병렬 수집.
   - 인기순 / 최신순 정렬 지원.

3. **🧠 Web Worker 기반 한국어 형태소 분석 엔진**
   - UI 프리징 없는 비동기 Web Worker 전처리.
   - **용언 원형 복원 (Lemmatization)**: 동사/형용사 어간에 `+다` 접미사를 결합하여 표준 원형(`먹다`, `좋다`, `재밌다`)으로 자동 정제.
   - 품사 필터링 (명사, 용언, 부사 등) 및 사용자 정의 불용어(Stopwords) 태그 실시간 관리.

4. **📊 3대 인터랙티브 시각화 대시보드**
   - **워드클라우드 (WordCloud2.js)**: 단어 빈도 시각화 + **단어 클릭 시 해당 단어 포함 댓글 교차 필터링**.
   - **동시출현 연관어 네트워크 (D3.js v7 Force Simulation)**: 중심 키워드 펄스 강조, 동시출현 빈도($N_{co}$) 기반 연결선 굵기 동적 조절, 노드 드래그 & 줌/팬(Zoom & Pan).
   - **감정 분석 대시보드 (Chart.js v4 + KNU 한국어 감성사전)**: 긍정/중립/부정 도넛 차트 & 감정 분포 히스토그램 + 베스트 긍정 / 워스트 부정 코멘트 카드.

5. **📥 데이터 Export**
   - 분석 결과 및 추출 댓글을 CSV 또는 JSON 파일로 원클릭 저장.

---

## 🛠️ 북마클릿 사용법 (Step-by-Step)

1. 웹앱 상단의 **[✂️ 댓글 영역 수집기]** 탭으로 이동합니다.
2. `✂️ 댓글 영역 추출기` 파란색 버튼을 마우스로 클릭하여 브라우저의 **북마크바(Ctrl+Shift+B)**로 드래그 앤 드롭합니다.
3. 분석하고 싶은 **YouTube 영상 시청 페이지**로 이동합니다.
4. 영상 아래로 스크롤하여 댓글이 화면에 보이도록 합니다.
5. 북마크바에서 등록한 **[✂️ 댓글 영역 추출기]**를 클릭합니다. (화면에 파란색 상자가 떠오릅니다)
6. 파란색 상자로 강조된 댓글 위를 클릭하면, 로딩된 댓글이 일괄 추출되며 텍스트마이닝 웹앱 탭이 새로 열리고 자동 분석이 실행됩니다!

---

## 🌐 GitHub Pages 정적 웹 배포 방법

이 프로젝트는 100% 프론트엔드 전용 정적 웹앱이므로 별도의 백엔드 서버 없이 GitHub Pages에서 무상으로 호스팅할 수 있습니다.

1. 본 저장소를 GitHub Repository로 생성하여 push합니다.
2. Repository 설정의 **[Settings] -> [Pages]** 탭으로 이동합니다.
3. **Source**를 `Deploy from a branch`로 선택하고 Branch를 `main` (또는 `master`) / `/ (root)`로 지정 후 Save합니다.
4. 약 1분 후 생성되는 `https://<YOUR_GITHUB_ID>.github.io/<REPO_NAME>/` URL로 접속하여 사용하시면 됩니다!

---

## 📁 디렉터리 구조

```
youtube-comment-miner/
├── index.html              # 단일 페이지 메인 대시보드 (Tailwind CDN, 탭 인터페이스)
├── css/
│   └── style.css           # 커스텀 스타일 (인스펙터 박스, 스크롤바, 애니메이션)
├── data/
│   └── sentiment-dict.json # KNU 한국어 감성사전 (Key-Value JSON)
├── js/
│   ├── app.js              # 전역 State 관리, 탭 전환, URL Hash Import 수신
│   ├── bookmarklet-code.js # 북마크바에 등록할 인스펙터 인젝션 스크립트 원본
│   ├── youtube-api.js      # YouTube Data API v3 호출 모듈 (대댓글 페이징)
│   ├── kiwi-worker.js      # Kiwi WASM Web Worker / Fallback 토크나이저
│   ├── textmining.js       # 전처리, 형태소 정제, 빈도/동시출현 행렬 계산
│   ├── wordcloud-view.js   # WordCloud2.js 캔버스 렌더링 모듈
│   ├── network-view.js     # D3.js Force Simulation 네트워크 그래프
│   ├── sentiment.js        # 감정 사전 로드 및 점수 산출, Chart.js 연동
│   └── utils.js            # LZ-String 압축/해제, CSV Export, Toast 알림
├── plan.md                 # 설계 명세 문서
└── README.md               # 가이드 문서
```
