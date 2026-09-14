import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './index.css'
import App from './App.vue'
import Home from './pages/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', component: Home }],
})

createApp(App).use(router).mount('#app')
