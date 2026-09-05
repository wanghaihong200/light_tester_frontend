import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    // 登录页在布局壳路由外(不套 SideMenu/TopHeader/TabBar)
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/HomeView.vue'),
        },
        {
          path: 'projects/:id',
          name: 'project-detail',
          component: () => import('../views/ProjectView.vue'),
        },
      ],
    },
  ],
})

// 未登录访问受保护路由 → 踢到 /login;登录页自身放行(防循环)
router.beforeEach((to) => {
  if (to.name === 'login') return true
  if (!localStorage.getItem('tt_token')) return { name: 'login' }
  return true
})

export default router
