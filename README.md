# 🏘️ 나의 안식처

원하는 재료로 자신만의 집을 지을 수 있는 레트로 2D 웹 게임 프로젝트입니다. 다양한 재료를 파밍하고 조합하여 , 나만의 집을 ai에게 요청해 보세요!

---

## ⌨️ How to Play (실행 방법)

### 🌐 웹에서 바로 플레이하기
* 브라우저를 통해 설치 없이 간편하게 게임을 즐기실 수 있습니다.
* **[🎮 게임 실행 링크 바로가기](https://prod.d1nk6v7wg21d6c.amplifyapp.com/)**

### 💻 소스 코드로 로컬 실행하기
로컬 환경에서 직접 소스 코드를 실행하려면 아래의 터미널 명령어를 순서대로 입력하세요.

```bash
# 1. 의존성 패키지 설치
npm install

# 2. 개발 서버 구동
npm run dev
```

---


## 🚀 Tech Stack (기술 스택)

* **Game Engine:** Phaser.js (v3)
* **Language:** JavaScript (ES6+)
* **Environment:** HTML5 Canvas / Web Browser

---

## ✨ Key Features (주요 기능)

### 1. 메인 메뉴 및 세이브/로드 시스템
* 저장 데이터 유무에 따른 **'게임 시작'** 및 **'이어하기'** 동적 분기 처리
* 브라우저 기본 다이얼로그를 배제한 **사이버펑크 테마의 커스텀 모달 UI** 기반 데이터 초기화 기능 제공

### 2. 커뮤니티 갤러리 시스템
* 게임 내에서 완성한 결과물을 감상하고 공유할 수 있는 온라인 갤러리
* 다른 플레이어의 작품에 '좋아요'를 누르고 상세 정보를 확인할 수 있는 모달 뷰어 탑재

### 3. 필드 탐색 및 아이템 파밍
* **BaseCamp**, **NorthSide**, **NorthForest**, **Cave** 등 다양한 맵 지역 구성
* 모래, 나무, 바람 등 필드별 특수 재료 에셋 파밍 및 충돌 범위 최적화
* AI 고양이(`ai-cat`) 및 퀘스트 부품(`powerImg`) 등 다양한 오브젝트 상호작용

### 4. 연금술 및 작업대(Workbench) 컷신
* 서버 DB에서 레시피를 동적으로 연동하여 조합을 진행
* 작업대 청소 상태 및 조합 콤보에 따른 몰입감 있는 컷신 연출

---

## 🛠️ Project Structure (프로젝트 구조)

```text
public/
├── images/               # 이미지 에셋
└── sounds/               # 사운드 에셋
src/
├── scenes/               # Phaser 씬 관리 (MainMenuScene, BaseCampScene, StartScene, GalleryScene 등)
├── utils/                # 충돌 범위 생성 및 공통 유틸리티 (CollisionGenerator.js 등)
├── css/                  # 스타일시트 (style.css)
└── assets/               # 이미지, 사운드 및 폰트 에셋
```
