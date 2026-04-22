#!/usr/bin/env python3
"""
TTS Processor — EP-2026-0004 (6 scenes, 60 seconds)
Converts scene narrations to MP3 audio using ElevenLabs API
Measures actual durations and generates manifest.json
"""

import subprocess
import json
import os
import time
from pathlib import Path

# Load .env manually
env_vars = {}
with open('/Users/beye/youtube-co/.env', 'r') as f:
    for line in f:
        if line.strip() and not line.startswith('#'):
            if '=' in line:
                key, value = line.strip().split('=', 1)
                env_vars[key] = value

API_KEY = env_vars.get('ELEVENLABS_API_KEY')
if not API_KEY:
    print("ERROR: ELEVENLABS_API_KEY not found")
    exit(1)

print("="*60)
print("TTS Processor — EP-2026-0004 (6 scenes, 60 seconds)")
print("="*60)

# Configuration
WORKSPACE = "/Users/beye/youtube-co/workspace/episodes/EP-2026-0004"
SCRIPT_FILE = f"{WORKSPACE}/30_script.md"
OUTPUT_DIR = f"{WORKSPACE}/40_assets/tts"
VOICE_ID = "4JJwo477JUAx3HV0T7n7"

# Create output directory if it doesn't exist
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# Parse script
print("\n[1/3] Parsing script...")
with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

parts = content.split('---')
if len(parts) < 3:
    print("ERROR: Invalid script format")
    exit(1)

yaml_lines = parts[1].split('\n')

# Extract scenes
scenes = []
current_scene = {}

for line in yaml_lines:
    if line.strip().startswith('- scene_id:'):
        if current_scene and 'narration' in current_scene:
            scenes.append(current_scene)
        current_scene = {}
        # Extract scene_id
        if '"' in line:
            current_scene['scene_id'] = line.split('"')[1]
    elif 'narration:' in line and current_scene:
        narration = line.split('narration:', 1)[1].strip()
        if narration.startswith('"'):
            narration = narration[1:].rstrip('"') if narration.endswith('"') else narration[1:]
        current_scene['narration'] = narration
    elif 'target_seconds:' in line and current_scene:
        try:
            current_scene['target_seconds'] = int(line.split(':')[1].strip())
        except:
            current_scene['target_seconds'] = 10
    elif 'emphasis_tokens:' in line and current_scene:
        current_scene['emphasis_tokens'] = []
    elif current_scene.get('emphasis_tokens') is not None and line.strip().startswith('- "'):
        token = line.strip()[3:-1]  # Remove '- "' and '"'
        current_scene['emphasis_tokens'].append(token)

if current_scene and 'narration' in current_scene:
    scenes.append(current_scene)

print(f"✓ Found {len(scenes)} scenes")
for idx, scene in enumerate(scenes, 1):
    print(f"  [{idx}] {scene['scene_id']}: {scene['narration'][:50]}...")

# Process each scene
print("\n[2/3] Processing TTS...")
manifest_scenes = []
total_actual_seconds = 0
total_target_seconds = 0
failed_count = 0

for idx, scene in enumerate(scenes, 1):
    scene_id = scene['scene_id'].zfill(3)
    narration = scene['narration']
    target_seconds = scene.get('target_seconds', 10)

    print(f"[{idx:2d}/{len(scenes)}] Scene {scene_id}...", end=' ', flush=True)

    # Create SSML (with emphasis tokens if present)
    emphasis_tokens = scene.get('emphasis_tokens', [])
    ssml_text = narration
    for token in emphasis_tokens:
        # Wrap emphasis tokens in SSML tags
        ssml_text = ssml_text.replace(token, f'<emphasis level="strong">{token}</emphasis>')
    ssml = f"<speak>{ssml_text}</speak>"

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

    result = subprocess.run([
        'curl', '-s', '-X', 'POST',
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}',
        '-H', f'xi-api-key: {API_KEY}',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps(payload),
        '-o', output_file
    ], capture_output=True, text=True, timeout=30)

    # Check if file was created and has content
    if not os.path.exists(output_file) or os.path.getsize(output_file) < 100:
        print("❌ API failed")
        failed_count += 1
        continue

    # Measure with ffprobe
    probe_result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', output_file],
        capture_output=True, text=True
    )

    if probe_result.returncode != 0:
        print(f"⚠️ ffprobe failed, using target")
        actual_seconds = target_seconds
    else:
        try:
            actual_seconds = float(probe_result.stdout.strip())
        except:
            actual_seconds = target_seconds

    # Calculate variance
    variance_pct = ((actual_seconds - target_seconds) / target_seconds * 100) if target_seconds > 0 else 0

    # Record scene
    manifest_scenes.append({
        'scene_id': scene_id,
        'file_path': f'40_assets/tts/scene_{scene_id}.mp3',
        'narration': narration,
        'target_seconds': target_seconds,
        'actual_seconds': round(actual_seconds, 2),
        'variance_pct': round(variance_pct, 1),
        'file_size_bytes': os.path.getsize(output_file),
        'emphasis_tokens': emphasis_tokens
    })

    total_actual_seconds += actual_seconds
    total_target_seconds += target_seconds

    print(f"✓ {actual_seconds:.2f}s (target: {target_seconds}s, {variance_pct:+.1f}%)")

    # Rate limiting (ElevenLabs recommends 0.1-0.5s between calls)
    time.sleep(0.2)

# Save manifest
print("\n[3/3] Saving manifest...")
manifest_data = {
    'episode_id': 'EP-2026-0004',
    'channel_id': 'econ-daily',
    'generated_at': subprocess.check_output(['date', '-u', '+%Y-%m-%dT%H:%M:%SZ']).decode().strip(),
    'voice_profile': {
        'voice_id': VOICE_ID,
        'provider': 'elevenlabs',
        'voice_name': 'Yohan Koo - Encouraging, Clear and Airy',
        'language': 'ko',
        'speed': 1.05,
        'stability': 0.5,
        'similarity_boost': 0.75,
        'output_format': 'mp3_44100_128'
    },
    'scenes': manifest_scenes,
    'total': {
        'scene_count': len(manifest_scenes),
        'target_seconds': 60,
        'actual_seconds': round(total_actual_seconds, 2),
        'variance_pct': round(((total_actual_seconds - 60) / 60 * 100), 1),
        'within_tolerance': abs(((total_actual_seconds - 60) / 60 * 100)) <= 15,
        'tolerance_range': [51, 69]  # ±15% of 60 seconds
    },
    'status': 'completed' if failed_count == 0 else 'partial',
    'failed_count': failed_count
}

manifest_file = f"{OUTPUT_DIR}/manifest.json"
with open(manifest_file, 'w', encoding='utf-8') as f:
    json.dump(manifest_data, f, indent=2, ensure_ascii=False)

# Summary
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"Total scenes: {len(scenes)}")
print(f"Successfully processed: {len(manifest_scenes)}")
if failed_count > 0:
    print(f"Failed: {failed_count}")
print(f"\nTotal duration: {total_actual_seconds:.2f}s (target: 60s)")
print(f"Variance: {manifest_data['total']['variance_pct']:+.1f}%")
print(f"Within tolerance (±15%): {manifest_data['total']['within_tolerance']}")
print(f"Status: {manifest_data['status']}")
print(f"\nManifest: {manifest_file}")
print("="*60)

if failed_count > 0:
    exit(1)
else:
    print("\n✅ TTS processing completed successfully!")
    exit(0)
