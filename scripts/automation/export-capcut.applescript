(*
  export-capcut.applescript
  ─────────────────────────────────────────────────
  CapCut PC 프로젝트를 열고 Export를 자동 트리거한다.

  사전 준비:
  1. System Settings → Privacy & Security → Accessibility
     → 스크립트 실행자(Terminal, osascript, Claude Code 등)를 허용
  2. CapCut에서 한 번은 수동으로 Export 해서 기본 export preset 설정 저장해둘 것
     (파일명, 해상도, 포맷 등이 이전 설정값으로 자동 채움)

  호출 예:
    osascript export-capcut.applescript "BT-Vertical-60s" "/tmp/out/video.mp4"

  인자:
    $1 — CapCut 프로젝트 이름 (draft 폴더명과 동일)
    $2 — 출력 mp4 경로 (디렉토리는 미리 생성되어 있어야 함)

  반환:
    stdout: 출력 파일 경로 (성공 시)
    exit 0 성공 / 1 실패
*)

on run argv
    if (count of argv) < 2 then
        error "Usage: osascript export-capcut.applescript <project_name> <output_path>"
    end if

    set projectName to item 1 of argv
    set outputPath to item 2 of argv

    -- 1. CapCut 활성화 (CapCut 2.app 우선, 없으면 CapCut.app)
    try
        tell application "CapCut 2" to activate
    on error
        try
            tell application "CapCut" to activate
        on error errMsg
            error "Cannot launch CapCut: " & errMsg
        end try
    end try

    delay 2

    -- 2. 프로젝트 열기 — CapCut 런처 화면에서 프로젝트 카드 검색
    --    CapCut UI는 버전마다 구조가 달라 키보드 단축키로 접근 권장
    --    대안: Finder에서 draft_info.json을 더블클릭 (CapCut이 자동 연결)
    set draftPath to (POSIX path of (path to home folder)) & "Movies/CapCut/User Data/Projects/com.lveditor.draft/" & projectName & "/draft_info.json"
    do shell script "open -a 'CapCut 2' " & quoted form of draftPath & " 2>/dev/null || open -a 'CapCut' " & quoted form of draftPath

    delay 4 -- 프로젝트 로딩 대기

    -- 3. Export 메뉴 트리거 (Cmd+E 기본 단축키)
    tell application "System Events"
        tell process "CapCut"
            keystroke "e" using command down
        end tell
    end tell

    delay 3 -- Export 다이얼로그 열림 대기

    -- 4. Export 다이얼로그에서 출력 경로 설정 후 Export 클릭
    --    CapCut의 Export 다이얼로그는 버전마다 위젯 ID가 다르므로
    --    가장 안정적인 방법은 이미 설정된 preset 그대로 Enter로 확정하는 것
    tell application "System Events"
        tell process "CapCut"
            -- 파일명 필드에 자동 포커스 되어있다고 가정, 이름 입력
            keystroke projectName
            delay 0.5
            -- Return 키로 Export 실행 (대부분의 버전에서 기본 액션)
            key code 36 -- Return
        end tell
    end tell

    -- 5. Export 완료 대기 — 출력 파일 생성 감지 (최대 600초)
    --    CapCut은 기본적으로 ~/Movies 에 저장하므로 거기서 최근 파일 감지
    set exportDir to (POSIX path of (path to movies folder))
    set expectedFile to exportDir & projectName & ".mp4"

    set waitSeconds to 0
    set maxWait to 600
    repeat while waitSeconds < maxWait
        try
            do shell script "test -f " & quoted form of expectedFile
            -- 파일 존재 — 추가 5초 대기하여 완전 쓰기 보장
            delay 5
            -- 출력 경로로 이동
            do shell script "mv " & quoted form of expectedFile & " " & quoted form of outputPath
            return outputPath
        on error
            delay 3
            set waitSeconds to waitSeconds + 3
        end try
    end repeat

    error "Export timeout after " & maxWait & " seconds. Expected file: " & expectedFile
end run
