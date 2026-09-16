# -*- coding: utf-8 -*-
"""把旧版全局样式 main.css 作用域化为 archive.css。

所有选择器加 .arch-scope 前缀（档案子路由页面根节点），
避免 body/header/footer/main 等元素选择器污染新站首页：
  - :root 变量保留全局（与新站变量名不冲突）
  - html / * 重置规则删除（Tailwind preflight 已覆盖）
  - body 规则改写到 .arch-scope 自身
输出：src/styles/archive.css（main.css 随后由调用方删除）
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'styles' / 'main.css'
DST = ROOT / 'src' / 'styles' / 'archive.css'

css = SRC.read_text(encoding='utf-8')

# 去掉注释（避免干扰解析）
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def split_top_level(s: str):
    """按顶层 {} 把规则串拆成 (prelude, body) 列表，忽略 @keyframes 内部。"""
    rules, i, n = [], 0, len(s)
    while i < n:
        j = s.find('{', i)
        if j == -1:
            break
        prelude = s[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if s[k] == '{':
                depth += 1
            elif s[k] == '}':
                depth -= 1
            k += 1
        rules.append((prelude, s[j + 1:k - 1]))
        i = k
    return rules


def prefix_selectors(prelude: str, keep_star: bool = False) -> str:
    sels = [s.strip() for s in prelude.split(',')]
    out = []
    for sel in sels:
        if not sel:
            continue
        if sel == 'html':
            continue  # 全局 html 规则由新站 index.css 负责
        if sel == '*':
            if keep_star:
                out.append('.arch-scope *')
            continue  # 顶层 * 重置已由 Tailwind preflight 覆盖
        if sel == 'body':
            out.append('.arch-scope')
        elif sel.startswith((':', '::')):
            out.append(f'.arch-scope {sel}')
        else:
            out.append(f'.arch-scope {sel}')
    return ',\n'.join(out)


def transform(block: str, indent: str = '', in_media: bool = False) -> str:
    lines = []
    for prelude, body in split_top_level(block):
        if not prelude:
            continue
        if prelude.startswith('@keyframes'):
            inner = re.sub(r'\n\s*', ' ', body).strip()
            lines.append(f'{indent}{prelude}{{{inner}}}')
        elif prelude.startswith('@media'):
            inner = transform(body, indent + '  ', in_media=True)
            lines.append(f'{indent}{prelude}{{\n{inner}\n{indent}}}')
        elif prelude == ':root':
            inner = body.strip()
            lines.append(f':root{{\n{inner}\n}}')
        else:
            sel = prefix_selectors(prelude, keep_star=in_media)
            if not sel:
                continue
            inner = re.sub(r'\n\s*', '\n  ', '\n' + body.strip())
            lines.append(f'{sel}{{{inner}\n}}')
    return '\n'.join(lines)


out = '/* 档案子路由作用域样式（由 scripts/scope-css.py 从旧 main.css 生成，勿手改） */\n'
out += '.arch-scope{\n  min-height:100vh;\n  background:var(--paper);\n  color:var(--ink);\n  font-family:var(--body);\n  font-size:15px;\n  line-height:1.6;\n  -webkit-font-smoothing:antialiased;\n}\n'
out += transform(css)
DST.write_text(out, encoding='utf-8')
print('written', DST, len(out), 'chars')
