# Paperclip Agents Package

이 디렉토리는 BarroTube 13개 에이전트의 **Paperclip schema** 산출물을 보관한다.

## Source of Truth

에이전트 프롬프트의 **단일 진실 원천(SoT)** 은 다음이다.

```
.claude/agents/0N-{role}.md   (13 files, frontmatter + monolithic body)
```

이 디렉토리(`paperclip/package/agents/{role}/AGENTS.md`)와
mirror 디렉토리(`claude-code/.claude/agents/0N-{role}.md`)는
**자동 생성된 파생본** 이다.

## ⚠️ 직접 수정 금지

`AGENTS.md` 파일을 손으로 편집하면 다음 sync 시 덮어쓰기된다.
프롬프트를 수정하려면 반드시 SoT(`.claude/agents/0N-{role}.md`)를 편집한 뒤
sync 스크립트를 실행한다.

## 갱신 명령

```bash
# 변경 계획만 미리 보기
node scripts/automation/sync-agents.js --dry-run

# 실제 적용
node scripts/automation/sync-agents.js
```

스크립트는 idempotent — 변경이 없으면 `no changes` 를 출력한다.

### 스크립트가 하는 일

1. **Mirror 출력**: `.claude/agents/0N-{role}.md` → `claude-code/.claude/agents/0N-{role}.md`
   - byte-identical 복사 (frontmatter 포함)
2. **Paperclip 출력**: `.claude/agents/0N-{role}.md` → `paperclip/package/agents/{role}/AGENTS.md`
   - frontmatter 제거 후 본문만

### Role 매핑

| SoT 파일 prefix       | Paperclip 디렉토리 |
| --------------------- | ------------------ |
| `01-ceo`              | `ceo/`             |
| `02-producer`         | `producer/`        |
| `03-market-researcher`| `market-researcher/` |
| `04-strategist`       | `strategist/`      |
| `05-writer`           | `writer/`          |
| `06-fact-checker`     | `fact-checker/`    |
| `07-asset-pm`         | `asset-pm/`        |
| `08-image-generator`  | `image-generator/` |
| `09-voice-engineer`   | `voice-engineer/`  |
| `10-capcut-composer`  | `capcut-composer/` |
| `11-qa-reviewer`      | `qa-reviewer/`     |
| `12-metadata-writer`  | `metadata-writer/` |
| `13-publisher`        | `publisher/`       |

## SOUL / HEARTBEAT / TOOLS 파일

각 `paperclip/package/agents/{role}/` 안의

- `SOUL.md` — 에이전트의 정체성·미션 정의
- `HEARTBEAT.md` — 동작 주기·트리거·게이트
- `TOOLS.md` — 사용 가능한 도구·외부 시스템 명세

세 파일은 **별도 schema** 이며 sync 스크립트가 절대 손대지 않는다.
현재 CEO만 작성되어 있고, 다른 12명은 추후 보강 예정.

## Sync 스크립트 위치

```
scripts/automation/sync-agents.js
```

자동화·스케줄러에서 호출 가능하며 실행 후 `git status` 로 변경분을 확인한 뒤
운영자가 commit/push를 결정한다.

## npm 스크립트

`package.json` 에 등록되어 있어 개발자는 다음을 사용할 수도 있다.

```bash
npm run sync:agents       # 실제 적용
npm run sync:agents:dry   # dry-run 미리보기
```

## 자동 sync — git pre-commit hook (권장)

`.claude/agents/` 하위 파일이 staged 변경에 포함되면 sync-agents.js를 자동
실행하고, 결과 파생본(`claude-code/.claude/agents/`,
`paperclip/package/agents/{role}/AGENTS.md`)을 같이 staged에 추가한다.

### 신규 협업자 onboarding (1회 실행)

```bash
bash scripts/install-git-hooks.sh
```

내부적으로 `git config core.hooksPath .githooks` 를 설정한다. `core.hooksPath` 는
local config 라 `git clone` 시 자동 적용되지 않으므로 협업자 개인이 한 번
실행해야 한다. hook 본체(`.githooks/pre-commit`)는 git-tracked 이라 이후
업데이트는 `git pull` 로 자연스럽게 따라간다.

### 동작 흐름

1. `.claude/agents/0N-{role}.md` 수정
2. `git add .claude/agents/0N-{role}.md`
3. `git commit -m "..."` → pre-commit hook 자동 실행
4. sync-agents.js 가 mirror + paperclip 갱신
5. 갱신된 파생본도 같은 commit 에 staged 로 포함됨

### Bypass

비상시 `git commit --no-verify` 로 hook 우회 가능 — drift 가 다시 발생하므로
권장하지 않는다.

### launchd 일일 자동 sync 는 의도적으로 도입하지 않음

- 일일 작업은 *덮어쓰기 위험* 이 상존: 누군가 mirror/paperclip 측을 직접
  편집한 경우 다음 cron 이 무조건 SoT 로 돌려놓는다 (silent revert).
- pre-commit 트리거가 더 정확: 변경이 발생한 시점에만 sync.
- 이 결정이 바뀌면 본 README 의 본 절을 업데이트한다.
