/**
 * 翻书音效：界面跳转 / 抽取卡片 / 翻卡时播放。
 * 每次 new 一个 Audio 实例，允许重叠播放；播放被浏览器策略拦截时静默忽略。
 */
export function playFlip(volume = 0.5) {
  try {
    const a = new Audio('/audio/page-flip.mp3')
    a.volume = Math.min(1, Math.max(0, volume))
    void a.play().catch(() => {})
  } catch {
    /* 环境不支持 Audio 时忽略 */
  }
}
