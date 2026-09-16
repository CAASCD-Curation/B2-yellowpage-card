export const SHEET_ORDER = ['经典艺术档案', '文学意象', '社会素材', '形式灵感']

export const SHEET_EN = {
  '经典艺术档案': 'CLASSIC ART · ART',
  '文学意象': 'LITERARY · LIT',
  '社会素材': 'SOCIETY · SOC',
  '形式灵感': 'FORM · FRM',
}

export const TYPE_GROUPS = {
  '图': ['图', '图文', '图集', '影像截图'],
  '文': ['文', '文（行业传说）'],
  '影像': ['影像', '影像/文', '文/影像', '影像截图'],
  '声音': ['声音', '声音/文', '文/声音'],
  '实物': ['实物', '实物/图', '实物/文'],
}

export const TYPE_PILLS = ['全部', '图', '文', '影像', '声音', '实物']

export function parseTags(t) {
  return (t.match(/＃([^\s＃]+)/g) || []).map((x) => x.slice(1))
}

export function statusClass(s) {
  if (s === '已核实') return 'st-ok'
  if (s === '部分核实') return 'st-part'
  return 'st-todo'
}

export async function loadData() {
  const res = await fetch('/data.json')
  if (!res.ok) throw new Error('data.json 加载失败')
  const data = await res.json()
  const all = []
  SHEET_ORDER.forEach((col) => {
    data[col].entries.forEach((e) => {
      e.collection = col
      e.tagList = parseTags(e.tags)
      all.push(e)
    })
  })
  return { data, all }
}
