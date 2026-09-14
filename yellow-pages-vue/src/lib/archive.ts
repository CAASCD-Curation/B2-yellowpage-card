// 黄页经典艺术档案 · 数据类型与派生数据
import raw from '../data/archive.json'
import dotsRaw from '../data/mapdots.json'

export interface Entry {
  id: string
  name: string
  type: string
  summary: string
  source: string
  link: string
  year: string
  tags: string
  channel: string
  note: string
  status: string
  category: string
  images: string[]
  sense: string
}

export interface ExtEntry {
  id: string
  sense: string
  name: string
  origin: string
  type: string
  desc: string
  link: string
}

export interface ArchiveData {
  entries: Entry[]
  extEntries: ExtEntry[]
  senseMeta: Record<string, { subtitle: string; count: string }>
  overview: { sense: string; title: string; desc: string; count: string }[]
  regionCount: Record<string, number>
}

export const archive = raw as unknown as ArchiveData
export const mapDots = (dotsRaw as unknown as { dots: [number, number][] }).dots

export const imgUrl = (f: string) => `/images/${f}`

export const SENSES = ['视觉', '听觉', '嗅觉', '触觉', '味觉'] as const

export const SENSE_EN: Record<string, string> = {
  视觉: 'SIGHT',
  听觉: 'HEARING',
  嗅觉: 'SMELL',
  触觉: 'TOUCH',
  味觉: 'TASTE',
}

export interface ParsedTags {
  pairs: { key: string; value: string }[]
  theme: string[]
  region: string
  era: string
}

export function parseTags(tags: string): ParsedTags {
  const pairs: { key: string; value: string }[] = []
  const theme: string[] = []
  let region = ''
  let era = ''
  const re = /＃([^:：\s]+)[:：]([^\s＃]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tags))) {
    pairs.push({ key: m[1], value: m[2] })
    if (m[1] === '主题') theme.push(m[2])
    if (m[1] === '地域') region = m[2]
    if (m[1] === '年代') era = m[2]
  }
  return { pairs, theme, region, era }
}

export function searchEntries(list: Entry[], q: string): Entry[] {
  const query = q.trim().toLowerCase()
  if (!query) return list
  return list.filter((e) =>
    [e.id, e.name, e.summary, e.source, e.year, e.tags, e.category, e.sense, e.type]
      .join(' ')
      .toLowerCase()
      .includes(query),
  )
}

/* ---------- 城市地图 ---------- */
export interface City {
  key: string
  name: string
  country: string
  en: string
  lon: number
  lat: number
  regions: string[]
}

export const CITIES: City[] = [
  { key: 'tokyo', name: '东京', country: '日本', en: 'TOKYO', lon: 139.69, lat: 35.69, regions: ['日本'] },
  { key: 'shanghai', name: '上海', country: '中国', en: 'SHANGHAI', lon: 121.47, lat: 31.23, regions: ['中国', '跨国（中国尤盛）'] },
  { key: 'florence', name: '佛罗伦萨', country: '意大利', en: 'FLORENCE', lon: 11.25, lat: 43.77, regions: ['意大利'] },
  { key: 'paris', name: '巴黎', country: '法国', en: 'PARIS', lon: 2.35, lat: 48.86, regions: ['法国', '欧洲'] },
  { key: 'dc', name: '华盛顿', country: '美国', en: 'WASHINGTON', lon: -77.04, lat: 38.9, regions: ['美国'] },
]

export function cityOfEntry(e: Entry): City | undefined {
  const { region } = parseTags(e.tags)
  return CITIES.find((c) => c.regions.includes(region))
}

export function entriesOfCity(city: City): Entry[] {
  return archive.entries.filter((e) => city.regions.includes(parseTags(e.tags).region))
}

/** 城市间连接：按共享主题标签数 */
export function cityLinks(): { a: City; b: City; themes: string[] }[] {
  const links: { a: City; b: City; themes: string[] }[] = []
  for (let i = 0; i < CITIES.length; i++) {
    for (let j = i + 1; j < CITIES.length; j++) {
      const ta = new Set(entriesOfCity(CITIES[i]).flatMap((e) => parseTags(e.tags).theme))
      const shared = entriesOfCity(CITIES[j])
        .flatMap((e) => parseTags(e.tags).theme)
        .filter((t) => ta.has(t))
      const uniq = Array.from(new Set(shared))
      if (uniq.length > 0) links.push({ a: CITIES[i], b: CITIES[j], themes: uniq })
    }
  }
  return links
}

/** 等距圆柱投影 */
export const MAP = (() => {
  const lon0 = -126
  const lat1 = 74
  const s = 3.55
  return {
    w: 1000,
    h: Math.ceil((lat1 - -10) * s),
    x: (lon: number) => (lon - lon0) * s,
    y: (lat: number) => (lat1 - lat) * s,
  }
})()
