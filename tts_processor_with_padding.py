#!/usr/bin/env python3
"""
TTS Processor with Silence Padding — EP-2026-0001
Generates TTS audio and pads each scene to its target_seconds duration using silence
"""

import subprocess
import json
import os
import time
from pathlib import Path
import sys

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
    sys.exit(1)

print("="*70)
print("TTS Processor with Silence Padding — EP-2026-0001")
print("="*70)

# Load TTS spec
SPEC_FILE = "/Users/beye/.paperclip/instances/default/workspaces/42b07f9e-6ebf-4d9b-8bf2-58badf92fe65/tts_spec.json"
OUTPUT_DIR = "/Users/beye/.paperclip/instances/default/workspaces/42b07f9e-6ebf-4d9b-8bf2-58badf92fe65/episodes/EP-2026-0001/40_assets/tts"
MANIFEST_FILE = f"{OUTPUT_DIR}/manifest.json"
VOICE_ID = "4JJwo477JUAx3HV0T7n7"

# Create output directory if needed
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# Load spec
print("\n[1/4] Loading TTS spec...")
with open(SPEC_FILE, 'r', encoding='utf-8') as f:
    spec = json.load(f)

scenes = spec['scenes']
print(f"✓ Loaded {len(scenes)} scenes")

# Process each scene
print("\n[2/4] Generating TTS audio...")
manifest_scenes = []
total_target_seconds = 0
total_actual_seconds = 0
failed_scenes = []

for idx, scene in enumerate(scenes, 1):
    scene_id = scene['scene_id']
    narration = scene['narration']
    target_seconds = scene['target_seconds']
    emphasis_tokens = scene.get('emphasis_tokens', [])

    print(f"[{idx:2d}/{len(scenes)}] {scene_id}...", end=' ', flush=True)

    # Create simple SSML (no prosody adjustment)
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
    raw_mp3 = f"{OUTPUT_DIR}/.raw_{scene_id}.mp3"

    result = subprocess.run([
        'curl', '-s', '-X', 'POST',
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}',
        '-H', f'xi-api-key: {API_KEY}',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps(payload),
        '-o', raw_mp3
    ], capture_output=True, text=True, timeout=30)

    # Check if file was created
    if not os.path.exists(raw_mp3) or os.path.getsize(raw_mp3) < 100:
        print("❌ API failed")
        failed_scenes.append(scene_id)
        continue

    # Measure raw duration
    probe_result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', raw_mp3],
        capture_output=True, text=True
    )

    if probe_result.returncode != 0:
        print(f"⚠️ Duration read failed")
        actual_seconds = target_seconds
        os.remove(raw_mp3)
        continue

    actual_seconds = float(probe_result.stdout.strip())

    # Calculate silence padding needed
    silence_needed = max(0, target_seconds - actual_seconds)

    # Create padded version using ffmpeg
    output_file = f"{OUTPUT_DIR}/scene_{scene_id}.mp3"

    if silence_needed > 0.1:  # Only add silence if more than 100ms needed
        # Generate silence and concatenate
        silence_file = f"{OUTPUT_DIR}/.silence_{scene_id}.mp3"

        # Generate silence with ffmpeg
        ffmpeg_cmd = [
            'ffmpeg', '-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=mono',
            '-t', str(silence_needed), '-q:a', '9', '-acodec', 'libmp3lame',
            silence_file
        ]
        subprocess.run(ffmpeg_cmd, capture_output=True, timeout=30)

        # Concatenate audio + silence
        concat_file = f"{OUTPUT_DIR}/.concat_{scene_id}.txt"
        with open(concat_file, 'w') as f:
            f.write(f"file '{raw_mp3}'\n")
            f.write(f"file '{silence_file}'\n")

        subprocess.run([
            'ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_file,
            '-c', 'copy', output_file
        ], capture_output=True, timeout=30)

        # Cleanup temp files
        os.remove(silence_file)
        os.remove(concat_file)
    else:
        # No padding needed, just copy
        os.rename(raw_mp3, output_file)

    os.remove(raw_mp3)

    # Measure final duration
    final_probe = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', output_file],
        capture_output=True, text=True
    )

    if final_probe.returncode == 0:
        final_seconds = float(final_probe.stdout.strip())
    else:
        final_seconds = actual_seconds + silence_needed

    variance_pct = ((final_seconds - target_seconds) / target_seconds * 100) if target_seconds > 0 else 0

    # Record in manifest
    manifest_scenes.append({
        'scene_id': scene_id,
        'file_path': f'40_assets/tts/scene_{scene_id}.mp3',
        'narration_start': narration[:50],
        'target_seconds': target_seconds,
        'raw_speech_seconds': round(actual_seconds, 2),
        'silence_padding_seconds': round(silence_needed, 2),
        'actual_seconds': round(final_seconds, 2),
        'variance_pct': round(variance_pct, 2),
        'file_size_bytes': os.path.getsize(output_file),
        'emphasis_tokens': emphasis_tokens
    })

    total_target_seconds += target_seconds
    total_actual_seconds += final_seconds

    print(f"✓ {actual_seconds:.1f}s + {silence_needed:.1f}s = {final_seconds:.1f}s")

    time.sleep(0.1)

# Calculate total variance
print("\n[3/4] Validating manifest...")
total_variance_pct = ((total_actual_seconds - spec['target_total_seconds']) / spec['target_total_seconds'] * 100) if spec['target_total_seconds'] > 0 else 0
within_tolerance = abs(total_variance_pct) <= (spec['validation']['tolerance_pct'])

manifest_data = {
    'episode_id': spec['episode_id'],
    'language': spec['language'],
    'voice_style': spec['voice_style'],
    'generated_at': subprocess.check_output(['date', '-u', '+%Y-%m-%dT%H:%M:%SZ']).decode().strip(),
    'voice_profile': {
        'voice_id': VOICE_ID,
        'provider': 'elevenlabs',
        'model': 'eleven_multilingual_v2',
        'stability': 0.5,
        'similarity_boost': 0.75,
        'style': 0.3,
        'output_format': 'mp3_44100_128'
    },
    'scenes': manifest_scenes,
    'total': {
        'scene_count': len(manifest_scenes),
        'target_seconds': spec['target_total_seconds'],
        'actual_seconds': round(total_actual_seconds, 2),
        'variance_pct': round(total_variance_pct, 2),
        'within_tolerance': within_tolerance,
        'tolerance_range': [spec['validation']['min_seconds'], spec['validation']['max_seconds']]
    }
}

if failed_scenes:
    manifest_data['failed_scenes'] = failed_scenes

# Save manifest
print("\n[4/4] Saving manifest...")
with open(MANIFEST_FILE, 'w', encoding='utf-8') as f:
    json.dump(manifest_data, f, indent=2, ensure_ascii=False)

# Summary
print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print(f"Total scenes: {len(scenes)}")
print(f"Successfully processed: {len(manifest_scenes)}")
if failed_scenes:
    print(f"Failed: {len(failed_scenes)} ({', '.join(failed_scenes)})")
print(f"\nTarget total duration: {spec['target_total_seconds']}s")
print(f"Actual total duration: {total_actual_seconds:.1f}s")
print(f"Variance: {total_variance_pct:+.1f}%")
print(f"Tolerance: ±{spec['validation']['tolerance_pct']}% ({spec['validation']['min_seconds']}-{spec['validation']['max_seconds']}s)")
print(f"Within tolerance: {'✅ YES' if within_tolerance else '❌ NO'}")
print(f"\nManifest: {MANIFEST_FILE}")
print("="*70)

sys.exit(0 if within_tolerance else 1)
