#!/usr/bin/env python3
"""
TTS Processor for BarroTube Episode EP-2026-0001
Converts scene narrations to MP3 audio using ElevenLabs API
Measures actual durations and generates manifest.json
"""

import os
import sys
import json
import subprocess
import time
import requests
from pathlib import Path
import re
from datetime import datetime

# Configuration
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
WORKSPACE_ROOT = Path('/Users/beye/youtube-co/workspace/episodes/EP-2026-0001')
SCRIPT_FILE = WORKSPACE_ROOT / '30_script.md'
OUTPUT_DIR = WORKSPACE_ROOT / '40_assets' / 'tts'
MANIFEST_FILE = OUTPUT_DIR / 'manifest.json'

# Voice Profile (from style-guide.md)
VOICE_CONFIG = {
    'voice_id': '4JJwo477JUAx3HV0T7n7',
    'stability': 0.5,
    'similarity_boost': 0.75,
    'style': 0.3,
    'speed': 1.05,
    'model_id': 'eleven_multilingual_v2',
    'output_format': 'mp3_44100_128'
}

TARGET_TOTAL_SECONDS = 480
TOLERANCE_PCT = 0.15

def parse_script():
    """Extract scenes from 30_script.md YAML front matter"""
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract YAML front matter between --- markers
    parts = content.split('---')
    if len(parts) < 3:
        raise ValueError("Script file must have YAML front matter")

    yaml_content = parts[1]

    # Parse YAML manually (simple approach)
    scenes = []
    current_scene = None
    for line in yaml_content.split('\n'):
        line = line.strip()
        if line.startswith('- scene_id:'):
            if current_scene:
                scenes.append(current_scene)
            current_scene = {}
        elif current_scene is not None:
            if line.startswith('scene_id:'):
                current_scene['scene_id'] = line.split('"')[1] if '"' in line else line.split(':')[1].strip().strip('"\'')
            elif line.startswith('narration:'):
                current_scene['narration'] = line.split('"', 1)[1].rsplit('"', 1)[0] if '"' in line else line.split(':', 1)[1].strip()
            elif line.startswith('target_seconds:'):
                current_scene['target_seconds'] = int(line.split(':')[1].strip())
            elif line.startswith('emphasis_tokens:'):
                # Parse list of emphasis tokens
                current_scene['emphasis_tokens'] = []
            elif line.startswith('- ') and current_scene.get('emphasis_tokens') is not None:
                token = line[2:].strip().strip('"\'')
                current_scene['emphasis_tokens'].append(token)

    if current_scene:
        scenes.append(current_scene)

    return scenes

def narration_to_ssml(narration, emphasis_tokens):
    """Convert narration text to SSML with emphasis markup"""
    ssml = '<speak>'

    # Add narration with emphasis on specified tokens
    text = narration
    for token in emphasis_tokens:
        # Find token in text (case-insensitive, word boundary)
        pattern = r'\b' + re.escape(token) + r'\b'
        text = re.sub(pattern, f'<emphasis level="strong">{token}</emphasis>', text)

    # Add breaks at sentence boundaries
    text = text.replace('。', '<break time="300ms"/>')
    text = text.replace('。', '<break time="300ms"/>')
    text = text.replace('!', '<break time="300ms"/>')
    text = text.replace('?', '<break time="300ms"/>')
    text = re.sub(r'([.!?])', r'\1<break time="300ms"/>', text)
    text = text.replace('，', '<break time="150ms"/>')

    ssml += text + '</speak>'
    return ssml

def call_elevenlabs_api(ssml_text):
    """Call ElevenLabs API to synthesize speech"""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_CONFIG['voice_id']}"

    headers = {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
    }

    data = {
        'text': ssml_text,
        'model_id': VOICE_CONFIG['model_id'],
        'voice_settings': {
            'stability': VOICE_CONFIG['stability'],
            'similarity_boost': VOICE_CONFIG['similarity_boost'],
            'style': VOICE_CONFIG['style'],
            'use_speaker_boost': True
        },
        'output_format': VOICE_CONFIG['output_format']
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        response.raise_for_status()
        return response.content  # Returns MP3 bytes
    except requests.exceptions.RequestException as e:
        print(f"❌ API Error: {e}", file=sys.stderr)
        return None

def measure_audio_duration(mp3_file):
    """Use ffprobe to measure actual audio duration"""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3_file)],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"❌ ffprobe error: {e}", file=sys.stderr)
    return None

def process_scenes(scenes):
    """Process all scenes: synthesize, save, measure"""
    manifest_data = {
        'episode_id': 'EP-2026-0001',
        'channel_id': 'econ-daily',
        'generated_at': datetime.utcnow().isoformat(),
        'voice_profile': VOICE_CONFIG,
        'scenes': []
    }

    total_actual_seconds = 0
    total_target_seconds = 0
    failed_scenes = []

    for idx, scene in enumerate(scenes, 1):
        scene_id = scene['scene_id']
        narration = scene['narration']
        target_seconds = scene.get('target_seconds', 0)
        emphasis_tokens = scene.get('emphasis_tokens', [])

        print(f"[{idx}/{len(scenes)}] Scene {scene_id}... ", end='', flush=True)

        # Convert to SSML
        ssml = narration_to_ssml(narration, emphasis_tokens)

        # Call ElevenLabs API
        mp3_data = call_elevenlabs_api(ssml)
        if not mp3_data:
            print(f"❌ API failed")
            failed_scenes.append(scene_id)
            continue

        # Save MP3 file
        output_file = OUTPUT_DIR / f'scene_{scene_id}.mp3'
        with open(output_file, 'wb') as f:
            f.write(mp3_data)

        # Measure actual duration
        actual_seconds = measure_audio_duration(output_file)
        if actual_seconds is None:
            print(f"⚠️ Duration measurement failed")
            actual_seconds = target_seconds  # fallback

        # Calculate variance
        variance_pct = ((actual_seconds - target_seconds) / target_seconds * 100) if target_seconds > 0 else 0

        # Record in manifest
        manifest_data['scenes'].append({
            'scene_id': scene_id,
            'file_path': f'40_assets/tts/scene_{scene_id}.mp3',
            'narration': narration[:50] + ('...' if len(narration) > 50 else ''),
            'target_seconds': target_seconds,
            'actual_seconds': round(actual_seconds, 1),
            'variance_pct': round(variance_pct, 1),
            'file_size_bytes': len(mp3_data),
            'emphasis_tokens': emphasis_tokens
        })

        total_actual_seconds += actual_seconds
        total_target_seconds += target_seconds

        print(f"✅ {actual_seconds:.1f}s (target: {target_seconds}s, {variance_pct:+.1f}%)")

        # Rate limiting (ElevenLabs recommends ~0.5s between calls)
        time.sleep(0.5)

    # Final validation
    total_variance_pct = ((total_actual_seconds - TARGET_TOTAL_SECONDS) / TARGET_TOTAL_SECONDS * 100)
    within_tolerance = abs(total_variance_pct) <= (TOLERANCE_PCT * 100)

    manifest_data['total'] = {
        'target_seconds': TARGET_TOTAL_SECONDS,
        'actual_seconds': round(total_actual_seconds, 1),
        'total_target_seconds': total_target_seconds,
        'total_actual_seconds': round(total_actual_seconds, 1),
        'variance_pct': round(total_variance_pct, 1),
        'within_tolerance': within_tolerance,
        'tolerance_range': [
            round(TARGET_TOTAL_SECONDS * (1 - TOLERANCE_PCT), 1),
            round(TARGET_TOTAL_SECONDS * (1 + TOLERANCE_PCT), 1)
        ]
    }

    if failed_scenes:
        manifest_data['failed_scenes'] = failed_scenes

    return manifest_data

def save_manifest(manifest_data):
    """Save manifest.json"""
    with open(MANIFEST_FILE, 'w', encoding='utf-8') as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Manifest saved: {MANIFEST_FILE}")

def main():
    if not ELEVENLABS_API_KEY:
        print("❌ ELEVENLABS_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    print("=" * 60)
    print("TTS Processor — EP-2026-0001")
    print("=" * 60)

    # Parse script
    print("\n[1/3] Parsing script...")
    try:
        scenes = parse_script()
        print(f"✅ Found {len(scenes)} scenes")
    except Exception as e:
        print(f"❌ Failed to parse script: {e}", file=sys.stderr)
        sys.exit(1)

    # Process scenes
    print("\n[2/3] Processing TTS...")
    manifest_data = process_scenes(scenes)

    # Save manifest
    print("\n[3/3] Finalizing manifest...")
    save_manifest(manifest_data)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total Scenes: {len(manifest_data['scenes'])}")
    print(f"Total Duration: {manifest_data['total']['actual_seconds']}s (target: {manifest_data['total']['target_seconds']}s)")
    print(f"Variance: {manifest_data['total']['variance_pct']:+.1f}%")
    print(f"Within Tolerance (±15%): {manifest_data['total']['within_tolerance']}")
    if manifest_data.get('failed_scenes'):
        print(f"⚠️ Failed Scenes: {', '.join(manifest_data['failed_scenes'])}")
    print("=" * 60)

if __name__ == '__main__':
    main()
