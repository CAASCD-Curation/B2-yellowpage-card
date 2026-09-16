# -*- coding: utf-8 -*-
"""由 public/data.json 生成 src/data/archive.json 与 src/data/mapdots.json。

五感归属规则（确定性、可复现）：
  1. type/媒介 含「声音」        → 听觉
  2. type/媒介 含「实物」        → 触觉
  3. type 含 图/影像 或 媒介为 标志/海报/字体/影像/图/数字 → 视觉
  4. 其余文字类：媒介为「印刷」或主题含「印刷工艺」       → 嗅觉（纸墨气息）
  5. 名称/摘要含 食物/餐厅/食谱/味道/咖啡/茶/酒 等关键词   → 味觉
  6. 兜底：按条目序号的奇偶在 嗅觉/味觉 间交替，保证两列都有内容
"""
import json
import math
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'data.json'
OUT_DIR = ROOT / 'src' / 'data'
OUT_DIR.mkdir(parents=True, exist_ok=True)

raw = json.loads(SRC.read_text(encoding='utf-8'))
SHEET_ORDER = ['经典艺术档案', '文学意象', '社会素材', '形式灵感']

TASTE_RE = re.compile(r'食物|餐厅|食谱|味道|咖啡|茶馆|酒|宴|餐|烹饪|食谱|美味')
SMELL_MEDIA = {'印刷'}
VISUAL_MEDIA = {'标志', '海报', '字体', '影像', '图', '数字'}


def tag_pairs(tags: str):
    return [(m.group(1), m.group(2)) for m in re.finditer(r'＃([^:：\s]+)[:：]([^\s＃]+)', tags)]


def pick_sense(e, seq: int) -> str:
    t = e.get('type', '')
    media = {v for k, v in tag_pairs(e.get('tags', '')) if k == '媒介'}
    theme = {v for k, v in tag_pairs(e.get('tags', '')) if k == '主题'}
    text = e.get('name', '') + ' ' + e.get('summary', '')
    if '声音' in t or '声音' in media:
        return '听觉'
    if '实物' in t or '实物' in media:
        return '触觉'
    if ('图' in t) or ('影像' in t) or (media & VISUAL_MEDIA):
        return '视觉'
    if (media & SMELL_MEDIA) or ('印刷工艺' in theme):
        return '嗅觉'
    if TASTE_RE.search(text):
        return '味觉'
    return '嗅觉' if seq % 2 == 0 else '味觉'


entries = []
seq = 0
for sheet in SHEET_ORDER:
    for e in raw[sheet]['entries']:
        seq += 1
        entries.append({
            'id': e['id'],
            'name': e['name'],
            'type': e['type'],
            'summary': e['summary'],
            'source': e.get('source', ''),
            'link': e.get('link', ''),
            'year': e.get('year', ''),
            'tags': e.get('tags', ''),
            'channel': e.get('channel', ''),
            'note': e.get('note', ''),
            'status': e.get('status', ''),
            'category': sheet,
            'images': e.get('images', []),
            'sense': pick_sense(e, seq),
        })

sense_counts = Counter(e['sense'] for e in entries)
region_count = Counter()
for e in entries:
    for k, v in tag_pairs(e['tags']):
        if k == '地域':
            region_count[v] += 1

SENSE_EN_SUB = {
    '视觉': 'THE ICONOGRAPHY · 标志 / 字体 / 海报 / 影像',
    '听觉': 'THE RING · 电话铃 / 铃声 / 声波标识',
    '嗅觉': 'THE INK · 印刷油墨与纸的气味记忆',
    '触觉': 'THE PAPER · 纸样 / 实物 / 行走的手指',
    '味觉': 'THE AFTER-TASTE · 黄页里的餐饮与食谱想象',
}
sense_meta = {
    s: {'subtitle': SENSE_EN_SUB[s], 'count': str(sense_counts.get(s, 0))}
    for s in ['视觉', '听觉', '嗅觉', '触觉', '味觉']
}
overview = [
    {
        'sense': s,
        'title': {'视觉': 'SIGHT', '听觉': 'HEARING', '嗅觉': 'SMELL', '触觉': 'TOUCH', '味觉': 'TASTE'}[s],
        'desc': SENSE_EN_SUB[s],
        'count': str(sense_counts.get(s, 0)),
    }
    for s in ['视觉', '听觉', '嗅觉', '触觉', '味觉']
]

archive = {
    'entries': entries,
    'extEntries': [],
    'senseMeta': sense_meta,
    'overview': overview,
    'regionCount': dict(region_count),
}
(OUT_DIR / 'archive.json').write_text(
    json.dumps(archive, ensure_ascii=False, indent=1), encoding='utf-8'
)

# ---- 大陆点阵（等距圆柱投影下的装饰性点阵，lon/lat 坐标） ----
ELLIPSES = [  # (lon_c, lat_c, r_lon, r_lat)
    (-100, 48, 27, 17),   # 北美
    (-100, 28, 14, 9),    # 墨西哥/中美
    (-60, -12, 13, 19),   # 南美
    (15, 50, 20, 10),     # 欧洲
    (20, 5, 17, 24),      # 非洲
    (88, 46, 42, 19),     # 亚洲
    (108, 4, 11, 7),      # 东南亚/印尼
    (134, -25, 13, 8),    # 澳大利亚
]
dots = []
lat = -9.0
while lat <= 73.0:
    lon = -125.0
    while lon <= 155.0:
        inside = any(
            ((lon - c) / a) ** 2 + ((lat - d) / b) ** 2 <= 1.0
            for c, d, a, b in ELLIPSES
        )
        if inside:
            dots.append([round(lon, 2), round(lat, 2)])
        lon += 3.2
    lat += 2.8
(OUT_DIR / 'mapdots.json').write_text(
    json.dumps({'dots': dots}, ensure_ascii=False), encoding='utf-8'
)

print('entries:', len(entries))
print('sense:', dict(sense_counts))
print('regions:', dict(region_count))
print('dots:', len(dots))
