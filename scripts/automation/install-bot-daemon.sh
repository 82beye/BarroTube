#!/bin/bash
# install-bot-daemon.sh — Telegram 봇 launchd 상시 구동 설치
#   launchctl unload ~/Library/LaunchAgents/com.barrotube.bot.plist  # 중지
#   launchctl list | grep com.barrotube.bot                          # 상태

set -e

LABEL="com.barrotube.bot"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PROJECT_DIR="$HOME/youtube-co"
LOG_DIR="$PROJECT_DIR/logs"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ $PROJECT_DIR 없음"
  exit 1
fi

mkdir -p "$LOG_DIR"
mkdir -p "$HOME/Library/LaunchAgents"

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
        <string>${PROJECT_DIR}/scripts/automation/telegram-bot.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/telegram-bot.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/telegram-bot.err</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>

    <key>ThrottleInterval</key>
    <integer>10</integer>

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

# 기존 등록 해제
launchctl unload "$PLIST" 2>/dev/null || true

# 로드 + 즉시 실행 (RunAtLoad=true)
launchctl load "$PLIST"

echo "✅ Telegram 봇 데몬 설치 완료"
echo ""
echo "  Label:  ${LABEL}"
echo "  Plist:  ${PLIST}"
echo "  Logs:   ${LOG_DIR}/telegram-bot.{log,err}"
echo ""
echo "중지: launchctl unload \"${PLIST}\""
echo "재시작: launchctl unload \"${PLIST}\" && launchctl load \"${PLIST}\""
echo "상태: launchctl list | grep ${LABEL}"
echo "로그: tail -f ${LOG_DIR}/telegram-bot.log"
echo ""
echo "💡 Telegram 앱에서 @BarroTubeBot에게 /help 입력으로 테스트"
