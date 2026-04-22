#!/bin/bash
# install-heartbeat-schedule.sh — BarroTube 에이전트 heartbeat 주기 실행 설치
# 5분마다 heartbeat-orchestrator.js 실행. idle → heartbeat.log 추적.

set -e

LABEL="com.barrotube.heartbeat"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PROJECT_DIR="$HOME/youtube-co"
LOG_DIR="$PROJECT_DIR/logs"
INTERVAL_SEC="${1:-300}" # 기본 5분, 인자로 재정의 가능

if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ $PROJECT_DIR 없음"
  exit 1
fi

mkdir -p "$LOG_DIR"
mkdir -p "$HOME/Library/LaunchAgents"

NODE_BIN=$(command -v node)
NPX_BIN=$(command -v npx)
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
        <string>${PROJECT_DIR}/scripts/automation/heartbeat-orchestrator.js</string>
        <string>--timeout-ms</string>
        <string>12000</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/heartbeat.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/heartbeat.err</string>

    <key>StartInterval</key>
    <integer>${INTERVAL_SEC}</integer>

    <key>RunAtLoad</key>
    <true/>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$(dirname "$NPX_BIN"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>HOME</key>
        <string>${HOME}</string>
        <key>TZ</key>
        <string>Asia/Seoul</string>
    </dict>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "✅ Heartbeat 스케줄 설치 완료"
echo ""
echo "  Label:      ${LABEL}"
echo "  Interval:   매 ${INTERVAL_SEC}초 (${INTERVAL_SEC}/60분)"
echo "  Plist:      ${PLIST}"
echo "  Log:        ${LOG_DIR}/heartbeat.log"
echo ""
echo "상태: launchctl list | grep ${LABEL}"
echo "로그: tail -f ${LOG_DIR}/heartbeat.log"
echo "중지: launchctl unload \"${PLIST}\""
echo "즉시 실행: launchctl start ${LABEL}"
echo ""
echo "💡 Paperclip 대시보드(http://127.0.0.1:3100)에서 이슈 진행 실시간 추적"
