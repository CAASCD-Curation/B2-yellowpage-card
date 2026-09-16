import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './index.css'
import App from './App.vue'
import Entry from './pages/Entry.vue'
import Home from './pages/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Entry },
    { path: '/main', component: Home },
  ],
})

createApp(App).use(router).mount('#app')
