import { createRouter, createWebHistory } from 'vue-router'
import SecLayout from '../views/securities/SecLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/sec/dashboard',
    },
    {
      path: '/sec',
      component: SecLayout,
      redirect: '/sec/dashboard',
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/securities/SecDashboard.vue') },
        { path: 'trade', name: 'trade', component: () => import('../views/securities/SecTrading.vue') },
        { path: 'orders', name: 'orders', component: () => import('../views/securities/SecOrders.vue') },
        { path: 'holdings', name: 'holdings', component: () => import('../views/securities/SecHoldings.vue') },
        { path: 'market', name: 'market', component: () => import('../views/securities/SecMarket.vue') },
        { path: 'funds', name: 'funds', component: () => import('../views/securities/SecFunds.vue') },
        { path: 'paper-trade', name: 'paper-trade', component: () => import('../views/securities/SecPaperTrade.vue') },
        { path: 'history', name: 'history', component: () => import('../views/securities/SecHistory.vue') },
        { path: 'settings', name: 'settings', component: () => import('../views/securities/SecSettings.vue') },
      ],
    },
  ],
})

export default router
