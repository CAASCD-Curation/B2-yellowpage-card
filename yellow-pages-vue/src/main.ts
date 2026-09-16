import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './index.css'
import './table/styles/main.css'
import App from './App.vue'
import TableHome from './table/TableHome.vue'
import Entry from './five-senses/pages/Entry.vue'
import Home from './five-senses/pages/Home.vue'

/**
 * 合并站点路由（与 main 分支 README 约定一致）：
 *  /         五感档案体验 · 入口（地球开场动画）
 *  /main     五感档案体验 · 主界面（老虎机瀑布流 + 五城地图）
 *  /archive  表格图文交互卡（200 条档案 × 4 分类索引）
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Entry },
    { path: '/main', component: Home },
    { path: '/archive', component: TableHome },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

createApp(App).use(router).mount('#app')
