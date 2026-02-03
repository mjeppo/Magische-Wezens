import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AdminLogin from '../views/AdminLogin.vue'
import AdminEdit from '../views/AdminEdit.vue'
import pb from '@/lib/pocketbase'

const requireAuth = (to, from, next) => {
  if (pb.authStore.isValid) return next()
  next({ name: 'admin-login' })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AdminLogin,
    },
    {
      path: '/admin/:id?',
      name: 'admin',
      component: AdminEdit,
      beforeEnter: requireAuth,
      props: true,
    },
  ],
})

export default router
