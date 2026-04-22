#!/usr/bin/env python3
"""
render-subtitle.py — 자막 PNG 렌더링 (PIL)

ffmpeg drawtext 필터 불가 시 우회용. 자막 텍스트를 1080x280 투명 PNG로 그림.
자동 줄바꿈 지원, 중앙 정렬, 흰색 + 반투명 검정 박스 배경.

Usage:
  python render-subtitle.py "자막 내용" output.png [--width 1080] [--fontsize 52] [--maxlines 3]
"""

import sys
import argparse
from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    '/System/Library/Fonts/AppleSDGothicNeo.ttc',
    '/System/Library/Fonts/Supplemental/NanumGothic.ttc',
    '/System/Library/Fonts/Helvetica.ttc',
]


def pick_font(size):
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def wrap_text(text, font, max_width):
    """한국어 자동 줄바꿈 — 단어/공백 단위로 width 측정"""
    tokens = []
    buf = ''
    for ch in text:
        if ch in ' ,.!?':
            if buf:
                tokens.append(buf)
                buf = ''
            tokens.append(ch)
        else:
            buf += ch
    if buf:
        tokens.append(buf)

    lines = []
    current = ''
    for tk in tokens:
        test = current + tk
        bbox = font.getbbox(test)
        w = bbox[2] - bbox[0]
        if w > max_width and current.strip():
            lines.append(current.strip())
            current = tk.lstrip()
        else:
            current = test
    if current.strip():
        lines.append(current.strip())
    return lines


def render(text, out_path, width=1080, fontsize=56, maxlines=3, padding_x=40, line_spacing=12):
    font = pick_font(fontsize)
    max_text_width = width - padding_x * 2
    lines = wrap_text(text, font, max_text_width)
    # 줄 수가 maxlines 초과하면 fontsize 자동 축소로 모든 텍스트 수용
    shrink_attempts = 0
    while len(lines) > maxlines and fontsize > 36 and shrink_attempts < 6:
        fontsize -= 4
        font = pick_font(fontsize)
        lines = wrap_text(text, font, max_text_width)
        shrink_attempts += 1

    line_heights = []
    for line in lines:
        bbox = font.getbbox(line)
        line_heights.append(bbox[3] - bbox[1])
    total_h = sum(line_heights) + line_spacing * (len(lines) - 1)
    img_h = total_h + 30 * 2

    img = Image.new('RGBA', (width, img_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 반투명 검정 박스 배경 — 텍스트 폭 계산 후 가로만 감싸기
    max_line_w = 0
    for line in lines:
        bbox = font.getbbox(line)
        w = bbox[2] - bbox[0]
        max_line_w = max(max_line_w, w)

    box_x0 = (width - max_line_w) // 2 - 24
    box_x1 = box_x0 + max_line_w + 48
    box_y0 = 10
    box_y1 = img_h - 10
    draw.rounded_rectangle([box_x0, box_y0, box_x1, box_y1], radius=12, fill=(0, 0, 0, 140))

    # 텍스트 중앙 배치
    y = 30
    for i, line in enumerate(lines):
        bbox = font.getbbox(line)
        tw = bbox[2] - bbox[0]
        x = (width - tw) // 2
        # 검은 stroke + 흰 fill
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255),
                  stroke_width=3, stroke_fill=(0, 0, 0, 255))
        y += line_heights[i] + line_spacing

    img.save(out_path, 'PNG')
    return img_h


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('text')
    parser.add_argument('out')
    parser.add_argument('--width', type=int, default=1080)
    parser.add_argument('--fontsize', type=int, default=56)
    parser.add_argument('--maxlines', type=int, default=3)
    args = parser.parse_args()

    h = render(args.text, args.out, args.width, args.fontsize, args.maxlines)
    print(f'{args.out}:{h}', flush=True)
