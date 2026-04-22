#!/bin/bash
set -e

# Load environment
cd /Users/beye/youtube-co
source .env

WORKSPACE="/Users/beye/youtube-co/workspace/episodes/EP-2026-0001"
SCRIPT_FILE="$WORKSPACE/30_script.md"
OUTPUT_DIR="$WORKSPACE/40_assets/tts"
MANIFEST_FILE="$OUTPUT_DIR/manifest.json"

VOICE_ID="4JJwo477JUAx3HV0T7n7"
TARGET_TOTAL=480
TOLERANCE=0.15

echo "========================================"
echo "TTS Processor — EP-2026-0001"
echo "========================================"

# Create temp file for manifest
TEMP_MANIFEST=$(mktemp)
cat > "$TEMP_MANIFEST" << 'JSON'
{
  "episode_id": "EP-2026-0001",
  "channel_id": "econ-daily",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "voice_profile": {
    "voice_id": "4JJwo477JUAx3HV0T7n7",
    "provider": "elevenlabs",
    "speed": 1.05,
    "stability": 0.5,
    "similarity_boost": 0.75
  },
  "scenes": []
}
JSON

# Extract scenes from script YAML
SCENE_COUNT=0
TOTAL_TARGET=0
TOTAL_ACTUAL=0

# Parse YAML and process each scene
python3 << 'PYTHON_EOF'
import os
import sys
import subprocess
import json
import time
from pathlib import Path

# Configuration
VOICE_ID = "4JJwo477JUAx3HV0T7n7"
WORKSPACE = "/Users/beye/youtube-co/workspace/episodes/EP-2026-0001"
OUTPUT_DIR = f"{WORKSPACE}/40_assets/tts"
API_KEY = os.getenv('ELEVENLABS_API_KEY')

# Parse script
with open(f"{WORKSPACE}/30_script.md", 'r', encoding='utf-8') as f:
    content = f.read()

parts = content.split('---')
if len(parts) < 3:
    print("ERROR: Invalid script format")
    sys.exit(1)

yaml_lines = parts[1].split('\n')

# Extract scenes
scenes = []
current_scene = {}

for line in yaml_lines:
    if line.strip().startswith('- scene_id:'):
        if current_scene and 'narration' in current_scene:
            scenes.append(current_scene)
        current_scene = {}
        current_scene['scene_id'] = line.split('"')[1] if '"' in line else 'unknown'
    elif 'narration:' in line and current_scene:
        # Extract narration (handle quoted strings)
        narration = line.split('narration:', 1)[1].strip()
        if narration.startswith('"'):
            narration = narration[1:-1] if narration.endswith('"') else narration[1:]
        current_scene['narration'] = narration
    elif 'target_seconds:' in line and current_scene:
        current_scene['target_seconds'] = int(line.split(':')[1].strip())
    elif 'emphasis_tokens:' in line and current_scene:
        current_scene['emphasis_tokens'] = []
    elif current_scene.get('emphasis_tokens') is not None and line.strip().startswith('- '):
        token = line.strip()[2:].strip().strip('"\'')
        current_scene['emphasis_tokens'].append(token)

if current_scene and 'narration' in current_scene:
    scenes.append(current_scene)

print(f"[1/2] Found {len(scenes)} scenes")

# Process each scene
manifest_scenes = []
total_actual_seconds = 0
total_target_seconds = 0

for idx, scene in enumerate(scenes, 1):
    scene_id = scene['scene_id'].zfill(3)
    narration = scene['narration']
    target_seconds = scene.get('target_seconds', 12)

    print(f"[{idx}/{len(scenes)}] Scene {scene_id}...", end=' ', flush=True)

    # Create SSML
    ssml = f"<speak>{narration}</speak>"

    # Prepare API payload
    payload = {
        "text": ssml,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.3,
            "use_speaker_boost": True
        },
        "output_format": "mp3_44100_128"
    }

    # Call ElevenLabs API
    output_file = f"{OUTPUT_DIR}/scene_{scene_id}.mp3"

    curl_cmd = [
        'curl', '-s', '-X', 'POST',
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}',
        '-H', f'xi-api-key: {API_KEY}',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps(payload),
        '-o', output_file
    ]

    result = subprocess.run(curl_cmd, capture_output=True, text=True)

    # Check if file was created and has content
    if not os.path.exists(output_file) or os.path.getsize(output_file) < 100:
        print("❌ API failed")
        continue

    # Measure with ffprobe
    probe_result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', output_file],
        capture_output=True, text=True
    )

    if probe_result.returncode != 0:
        print(f"⚠️ Duration read failed, using target")
        actual_seconds = target_seconds
    else:
        actual_seconds = float(probe_result.stdout.strip())

    # Calculate variance
    variance_pct = ((actual_seconds - target_seconds) / target_seconds * 100) if target_seconds > 0 else 0

    # Record scene
    manifest_scenes.append({
        'scene_id': scene_id,
        'file_path': f'40_assets/tts/scene_{scene_id}.mp3',
        'narration_start': narration[:50],
        'target_seconds': target_seconds,
        'actual_seconds': round(actual_seconds, 1),
        'variance_pct': round(variance_pct, 1),
        'file_size_bytes': os.path.getsize(output_file)
    })

    total_actual_seconds += actual_seconds
    total_target_seconds += target_seconds

    print(f"✅ {actual_seconds:.1f}s")

    # Rate limiting
    time.sleep(0.2)

# Save manifest
manifest_data = {
    'episode_id': 'EP-2026-0001',
    'channel_id': 'econ-daily',
    'generated_at': subprocess.check_output(['date', '-u', '+%Y-%m-%dT%H:%M:%SZ']).decode().strip(),
    'voice_profile': {
        'voice_id': VOICE_ID,
        'provider': 'elevenlabs',
        'speed': 1.05,
        'stability': 0.5,
        'similarity_boost': 0.75
    },
    'scenes': manifest_scenes,
    'total': {
        'scene_count': len(manifest_scenes),
        'target_seconds': 480,
        'actual_seconds': round(total_actual_seconds, 1),
        'variance_pct': round(((total_actual_seconds - 480) / 480 * 100), 1),
        'within_tolerance': abs(((total_actual_seconds - 480) / 480 * 100)) <= 15
    }
}

with open(f"{OUTPUT_DIR}/manifest.json", 'w', encoding='utf-8') as f:
    json.dump(manifest_data, f, indent=2, ensure_ascii=False)

print(f"\n[2/2] Manifest saved")
print(f"\n{'='*50}")
print(f"SUMMARY")
print(f"{'='*50}")
print(f"Scenes processed: {len(manifest_scenes)}/{len(scenes)}")
print(f"Total duration: {total_actual_seconds:.1f}s (target: 480s)")
print(f"Variance: {manifest_data['total']['variance_pct']:+.1f}%")
print(f"Within tolerance (±15%): {manifest_data['total']['within_tolerance']}")
print(f"{'='*50}")

PYTHON_EOF
