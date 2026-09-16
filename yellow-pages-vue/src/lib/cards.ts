// 合并档案卡片（DESIGN.md §8.3）
import raw from '../data/cards.json'
import dotsRaw from '../data/mapdots.json'

export interface Card {
  id: string // SH-xxx / GL-xxx
  source: 'classic' | 'shanghai'
  category: 'clothing' | 'food' | 'housing' | 'transport'
  year: string
  title: string
  summary: string
  detail: string
  sourceRef: { publisher: string; url: string }
  tags: { media: string; form: string; region: string; era: string; theme: string }
  verify: 'verified' | 'partial' | 'lead'
  media: { front: string | null; back: string | null; extra?: string[] }
  mapLink: { scope: 'shanghai' | 'world'; lat: number; lng: number; place: string } | null
}

export const cards = (raw as unknown as { cards: Card[] }).cards
export const mapDots = (dotsRaw as unknown as { dots: [number, number][] }).dots

export const imgUrl = (f: string) => `/images/${f}`

/* 衣食住行四列（标题与卡片列绑定，不可分离） */
export const CATEGORIES = [
  { key: 'clothing', zh: '衣', en: 'CLOTHING', no: '01' },
  { key: 'food', zh: '食', en: 'FOOD', no: '02' },
  { key: 'housing', zh: '住', en: 'HOUSING', no: '03' },
  { key: 'transport', zh: '行', en: 'TRANSPORT', no: '04' },
] as const

export type CategoryKey = (typeof CATEGORIES)[number]['key']

export const byCategory = (key: CategoryKey) => cards.filter((c) => c.category === key)

/** 抽取池：默认排除待核实线索 */
export const drawPool = (key: CategoryKey) =>
  byCategory(key).filter((c) => c.verify !== 'lead')

/* 世界地图城市锚点（沿用五城） */
export const WORLD_CITIES = [
  { key: 'tokyo', name: '东京', en: 'TOKYO', lon: 139.69, lat: 35.69 },
  { key: 'dc', name: '华盛顿', en: 'WASHINGTON', lon: -77.04, lat: 38.9 },
  { key: 'shanghai', name: '上海', en: 'SHANGHAI', lon: 121.47, lat: 31.23 },
  { key: 'paris', name: '巴黎', en: 'PARIS', lon: 2.35, lat: 48.86 },
  { key: 'florence', name: '佛罗伦萨', en: 'FLORENCE', lon: 11.25, lat: 43.77 },
]

/** 等距圆柱投影（与旧版一致） */
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

/** 上海示意地图投影（城区级，坐标为占位散列，见 category_review） */
export const SH_MAP = (() => {
  const w = 1000
  const h = 620
  const x = (lng: number) => ((lng - 121.38) / 0.34) * w
  const y = (lat: number) => ((31.38 - lat) / 0.24) * h
  return { w, h, x, y }
})()

/* 五城分区：城市 → 条目地域标签映射 */
export const CITY_REGIONS: Record<string, string[]> = {
  tokyo: ['日本'],
  dc: ['美国'],
  shanghai: ['中国·上海', '中国', '跨国（中国尤盛）'],
  paris: ['法国', '欧洲'],
  florence: ['意大利'],
}

export const cardsOfCity = (key: string) =>
  cards.filter((c) => CITY_REGIONS[key]?.includes(c.tags.region))

/** 城市间连接：按共享主题标签数（沿用原网站规则） */
export function cityLinks() {
  const links: { a: (typeof WORLD_CITIES)[number]; b: (typeof WORLD_CITIES)[number]; themes: string[] }[] = []
  for (let i = 0; i < WORLD_CITIES.length; i++) {
    for (let j = i + 1; j < WORLD_CITIES.length; j++) {
      const ta = new Set(cardsOfCity(WORLD_CITIES[i].key).map((c) => c.tags.theme).filter(Boolean))
      const shared = cardsOfCity(WORLD_CITIES[j].key)
        .map((c) => c.tags.theme)
        .filter((t) => t && ta.has(t))
      const uniq = Array.from(new Set(shared))
      if (uniq.length > 0) links.push({ a: WORLD_CITIES[i], b: WORLD_CITIES[j], themes: uniq })
    }
  }
  return links
}
