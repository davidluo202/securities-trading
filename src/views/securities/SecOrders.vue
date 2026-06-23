<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const activeTab = ref<'active' | 'filled' | 'cancelled'>('active')

const activeOrders: any[] = []
const filledOrders: any[] = []
const cancelledOrders: any[] = []

const currentOrders = () => {
  if (activeTab.value === 'active') return activeOrders
  if (activeTab.value === 'filled') return filledOrders
  return cancelledOrders
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-slate-900">{{ t('委託記錄', 'Orders', '委托记录') }}</h2>
      <p class="text-sm text-slate-500 mt-1">{{ t('查看和管理您的委託訂單', 'View and manage your orders', '查看和管理您的委托订单') }}</p>
    </div>

    <!-- Pill Tabs -->
    <div class="flex gap-2">
      <button
        v-for="tab in (['active', 'filled', 'cancelled'] as const)"
        :key="tab"
        class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
        :class="activeTab === tab ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
        @click="activeTab = tab"
      >
        {{ tab === 'active' ? t('進行中', 'Active', '进行中') : tab === 'filled' ? t('已成交', 'Filled', '已成交') : t('已取消', 'Cancelled', '已取消') }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="currentOrders().length === 0" class="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-16 text-center">
      <svg class="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <p class="text-base text-slate-400 mb-5">{{ t('暫無委託記錄', 'No orders yet', '暂无委托记录') }}</p>
      <RouterLink to="/sec/trade" class="inline-block px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all">
        {{ t('去下單', 'Place Order', '去下单') }}
      </RouterLink>
    </div>

    <!-- Orders Table -->
    <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-base">
          <thead>
            <tr class="text-left text-sm text-slate-500 border-b border-slate-200 bg-slate-50">
              <th class="px-6 py-4 font-semibold">{{ t('訂單號', 'Order ID', '订单号') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('代碼', 'Symbol', '代码') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('方向', 'Side', '方向') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('類型', 'Type', '类型') }}</th>
              <th class="px-6 py-4 font-semibold text-right">{{ t('數量', 'Qty', '数量') }}</th>
              <th class="px-6 py-4 font-semibold text-right">{{ t('價格', 'Price', '价格') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('狀態', 'Status', '状态') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('時間', 'Time', '时间') }}</th>
              <th v-if="activeTab === 'active'" class="px-6 py-4 font-semibold">{{ t('操作', 'Action', '操作') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in currentOrders()" :key="order.id" class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 text-sm text-slate-500 font-mono">{{ order.id }}</td>
              <td class="px-6 py-4 font-bold text-blue-700">{{ order.symbol }}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-lg text-sm font-bold" :class="order.side === 'Buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'">
                  {{ order.side }}
                </span>
              </td>
              <td class="px-6 py-4 text-slate-600">{{ order.type }}</td>
              <td class="px-6 py-4 text-right font-medium">{{ order.qty }}</td>
              <td class="px-6 py-4 text-right font-medium">{{ order.price.toFixed(2) }}</td>
              <td class="px-6 py-4">
                <span class="text-sm font-bold" :class="{
                  'text-amber-600': order.status === 'Pending' || order.status === 'Waiting',
                  'text-green-600': order.status === 'Filled',
                  'text-slate-400': order.status === 'Cancelled',
                }">{{ order.status }}</span>
              </td>
              <td class="px-6 py-4 text-sm text-slate-500">{{ order.time }}</td>
              <td v-if="activeTab === 'active'" class="px-6 py-4">
                <button class="text-sm text-red-600 hover:text-red-700 font-bold">{{ t('取消', 'Cancel', '取消') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
