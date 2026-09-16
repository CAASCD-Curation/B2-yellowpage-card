import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './index.css'
import App from './App.vue'
import Home from './pages/Home.vue'
import Archive from './pages/Archive.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/archive', name: 'archive', component: Archive },
  ],
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 }
  },
})

createApp(App).use(router).mount('#app')
