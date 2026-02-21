---
name: design-tool
description: UI/UX 디자인 컴포넌트를 생성하고 스타일링합니다. 디자인, UI, 컴포넌트, 스타일, 레이아웃, 색상 관련 요청 시 사용합니다.
---

# 디자인 도구

## Instructions

1. 디자인 요청이 들어오면 프로젝트의 디자인 시스템을 먼저 확인한다
2. 색상은 프로젝트에 정의된 팔레트를 따른다
3. 컴포넌트는 재사용 가능하게 만든다
4. Tailwind CSS 클래스를 사용한다

## 디자인 규칙

- 기본 폰트: Inter
- 기본 간격: 4px 단위
- 반응형 필수 (mobile-first)

## Examples

"로그인 페이지 디자인해줘" → 디자인 시스템에 맞는 로그인 UI 생성
"버튼 컴포넌트 만들어줘" → 재사용 가능한 버튼 컴포넌트 생성
```

여기서 핵심은 `description` 부분이에요. Claude가 이걸 읽고 **"아, 이 요청에는 이 Skill을 쓰면 되겠구나"**를 판단하거든요. 그래서 최대한 구체적으로 써야 해요.

### 3단계: 필요하면 참고 파일 추가
```
.claude/skills/design-tool/
├── SKILL.md          ← 필수 (메인 지침서)
├── color-palette.md  ← 선택 (색상 규칙)
├── components.md     ← 선택 (컴포넌트 가이드)
└── templates/
    └── page-template.html  ← 선택 (템플릿)
```

SKILL.md 안에서 이 파일들을 참조하면, Claude가 필요할 때만 읽어요.

### 4단계: 테스트하기

Claude Code를 실행하고 디자인 관련 질문을 해보세요:
```
대시보드 페이지 UI 디자인해줘
