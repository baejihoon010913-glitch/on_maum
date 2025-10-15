# OnMaum - 청소년 익명 상담 플랫폼

OnMaum은 청소년을 위한 안전하고 익명성이 보장되는 상담 플랫폼입니다.

## 📋 프로젝트 구조

```
webapp/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── api/v1/         # API 엔드포인트
│   │   ├── core/           # 설정 및 보안
│   │   ├── db/             # 데이터베이스 연결
│   │   ├── models/         # SQLAlchemy 모델
│   │   ├── schemas/        # Pydantic 스키마
│   │   └── main.py         # FastAPI 애플리케이션
│   ├── requirements.txt    # Python 의존성
│   └── Dockerfile         # Docker 설정
├── frontend/               # React TypeScript 프론트엔드
│   ├── src/
│   │   ├── api/           # API 클라이언트
│   │   ├── components/    # React 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── store/         # 전역 상태 (Zustand)
│   │   ├── types/         # TypeScript 타입 정의
│   │   └── utils/         # 유틸리티 함수
│   ├── package.json       # Node.js 의존성
│   └── vite.config.ts     # Vite 설정
└── docker-compose.yml      # Docker Compose 설정
```

## 🚀 시작하기

### 전체 시스템 실행 (Docker Compose)

1. 프로젝트 클론
```bash
git clone <repository-url>
cd webapp
```

2. 환경 변수 설정
```bash
# 백엔드 환경 변수
cp backend/.env.example backend/.env

# 프론트엔드 환경 변수
cp frontend/.env.example frontend/.env
```

3. Docker Compose로 실행
```bash
docker-compose up -d
```

4. 서비스 접속
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/api/docs

### 개발 환경 설정

#### 백엔드 (FastAPI)

1. Python 가상환경 생성 및 활성화
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 의존성 설치
```bash
pip install -r requirements.txt
```

3. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값으로 수정
```

4. 데이터베이스 실행 (PostgreSQL)
```bash
# Docker로 PostgreSQL 실행
docker run -d --name onmaum-db \
  -e POSTGRES_DB=onmaum_db \
  -e POSTGRES_USER=onmaum_user \
  -e POSTGRES_PASSWORD=onmaum_password \
  -p 5432:5432 \
  postgres:15
```

5. 애플리케이션 실행
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 프론트엔드 (React)

1. Node.js 의존성 설치
```bash
cd frontend
npm install
```

2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값으로 수정
```

3. 개발 서버 실행
```bash
npm run dev
```

## 🏗️ 기술 스택

### 백엔드
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Pydantic
- **OAuth**: Naver OAuth 2.0

### 프론트엔드
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query

### 인프라
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Reverse Proxy**: 개발 시 Vite Dev Server

## 📱 모바일 최적화

이 프로젝트는 **모바일 우선(Mobile-First)** 접근 방식으로 개발되었습니다:

- **반응형 디자인**: Tailwind CSS를 사용한 모바일부터 데스크톱까지 대응
- **터치 친화적 UI**: 모바일 터치 인터페이스에 최적화된 컴포넌트
- **PWA 준비**: 향후 Progressive Web App 기능 추가 가능
- **하단 네비게이션**: 모바일에서 쉽게 접근 가능한 하단 탭 네비게이션

## 🔐 인증 시스템

- **네이버 OAuth**: 간편한 소셜 로그인
- **JWT 토큰**: Access Token (24시간) + Refresh Token (7일)
- **자동 토큰 갱신**: API 요청 시 자동으로 토큰 갱신
- **보안**: CORS 설정, 토큰 보안 저장

## 📝 주요 기능

### 현재 구현된 기능
- ✅ 사용자 인증 (네이버 OAuth)
- ✅ 회원가입 온보딩
- ✅ 반응형 레이아웃
- ✅ 기본 네비게이션
- ✅ API 클라이언트 및 상태 관리

### 향후 구현 예정
- 📝 공감노트 (공개 게시글)
- 📔 쉼표노트 (개인 다이어리)
- 💬 실시간 상담 채팅
- 👥 상담사 매칭 시스템
- 🔔 실시간 알림
- 📊 감정 분석 및 통계

## 🚦 API 문서

백엔드 서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## 🔧 개발 도구

### 코드 품질
- **ESLint**: JavaScript/TypeScript 코드 린팅
- **Prettier**: 코드 포매팅
- **TypeScript**: 정적 타입 검사
- **Black**: Python 코드 포매팅

### 개발 명령어

#### 프론트엔드
```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run lint         # ESLint 실행
npm run format       # Prettier 포매팅
```

#### 백엔드
```bash
uvicorn app.main:app --reload  # 개발 서버 실행
black app/                     # 코드 포매팅
```

## 📄 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다.

## 🤝 기여하기

1. 프로젝트 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add some amazing feature'`)
4. 브랜치 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 Issue를 생성해주세요.