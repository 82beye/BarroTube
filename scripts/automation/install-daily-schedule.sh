#!/bin/bash

# install-daily-schedule.sh
# ─────────────────────────────────────────────────
# macOS launchd 스케줄 설치: 매일 06:00 KST에 daily-episode-batch.js 실행
# 로그: ~/youtube-co/logs/daily-batch.log, daily-batch.err
# 제거: launchctl unload ~/Library/LaunchAgents/com.barrotube.daily.plist

set -e

LABEL="com.barrotube.daily"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PROJECT_DIR="$HOME/youtube-co"
LOG_DIR="$PROJECT_DIR/logs"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ $PROJECT_DIR 없음"
  exit 1
fi

mkdir -p "$LOG_DIR"
mkdir -p "$HOME/Library/LaunchAgents"

# Node 경로 자동 감지 (Homebrew/nvm 등)
NODE_BIN=$(command -v node)
if [ -z "$NODE_BIN" ]; then
  echo "❌ node 실행 파일 찾을 수 없음"
  exit 1
fi

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${NODE_BIN}</string>
        <string>${PROJECT_DIR}/scripts/automation/daily-episode-batch.js</string>
        <string>--channel</string>
        <string>econ-daily</string>
        <string>--count</string>
        <string>2</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/daily-batch.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/daily-batch.err</string>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>RunAtLoad</key>
    <false/>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>HOME</key>
        <string>${HOME}</string>
        <key>TZ</key>
        <string>Asia/Seoul</string>
    </dict>
</dict>
</plist>
EOF

# 기존 등록 해제 (있다면)
launchctl unload "$PLIST" 2>/dev/null || true

# 로드
launchctl load "$PLIST"

echo "✅ launchd 스케줄 설치 완료"
echo ""
echo "  Label:    ${LABEL}"
echo "  Plist:    ${PLIST}"
echo "  When:     매일 06:00 KST"
echo "  Logs:     ${LOG_DIR}/daily-batch.{log,err}"
echo ""
echo "제거: launchctl unload \"${PLIST}\" && rm \"${PLIST}\""
echo "즉시 실행 테스트: launchctl start ${LABEL}"
echo "상태 확인:     launchctl list | grep ${LABEL}"
echo ""
echo "⚠️  Mac이 수면 상태면 스케줄 누락 가능 — 아래 명령으로 수면 중에도 실행:"
echo "   sudo pmset repeat wakeorpoweron MTWRFSU 05:55:00"
