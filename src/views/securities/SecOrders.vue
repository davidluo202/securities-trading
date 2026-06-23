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
  <div class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('委託記錄', 'Orders', '委托记录') }}</h2>

    <!-- Tabs -->
    <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      <button
        v-for="tab in (['active', 'filled', 'cancelled'] as const)"
        :key="tab"
        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = tab"
      >
        {{ tab === 'active' ? t('進行中', 'Active', '进行中') : tab === 'filled' ? t('已成交', 'Filled', '已成交') : t('已取消', 'Cancelled', '已取消') }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="currentOrders().length === 0" class="bg-white rounded-xl shadow-sm border border-slate-100 px-5 py-12 text-center">
      <p class="text-slate-400 text-sm mb-4">{{ t('暫無委託記錄', 'No orders yet', '暂无委托记录') }}</p>
      <RouterLink to="/sec/trade" class="inline-block px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        {{ t('去下單', 'Place Order', '去下单') }}
      </RouterLink>
    </div>

    <!-- Orders Table -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-3 font-medium">{{ t('訂單號', 'Order ID', '订单号') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('代碼', 'Symbol', '代码') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('方向', 'Side', '方向') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('類型', 'Type', '类型') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('數量', 'Qty', '数量') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('價格', 'Price', '价格') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('狀態', 'Status', '状态') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('時間', 'Time', '时间') }}</th>
              <th v-if="activeTab === 'active'" class="px-4 py-3 font-medium">{{ t('操作', 'Action', '操作') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in currentOrders()" :key="order.id" class="border-b border-slate-50 hover:bg-slate-50">
              <td class="px-4 py-3 text-xs text-slate-500 font-mono">{{ order.id }}</td>
              <td class="px-4 py-3 font-medium text-blue-600">{{ order.symbol }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs font-medium" :class="order.side === 'Buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'">
                  {{ order.side }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ order.type }}</td>
              <td class="px-4 py-3 text-right">{{ order.qty }}</td>
              <td class="px-4 py-3 text-right">{{ order.price.toFixed(2) }}</td>
              <td class="px-4 py-3">
                <span class="text-xs font-medium" :class="{
                  'text-yellow-600': order.status === 'Pending' || order.status === 'Waiting',
                  'text-green-600': order.status === 'Filled',
                  'text-slate-400': order.status === 'Cancelled',
                }">{{ order.status }}</span>
              </td>
              <td class="px-4 py-3 text-xs text-slate-500">{{ order.time }}</td>
              <td v-if="activeTab === 'active'" class="px-4 py-3">
                <button class="text-xs text-red-500 hover:text-red-700 font-medium">{{ t('取消', 'Cancel', '取消') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
