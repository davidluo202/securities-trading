<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const activeTab = ref<'active' | 'filled' | 'cancelled'>('active')

interface Order {
  orderRef: string
  symbol: string
  name: string
  side: string
  type: string
  quantity: number
  price: number
  status: string
  paper: boolean
  timestamp: string
  shortSell?: boolean
}

const orders = ref<Order[]>([])
const loading = ref(false)

async function loadOrders() {
  loading.value = true
  try {
    const token = localStorage.getItem('sec-auth-token') || ''
    const res = await fetch('/api/orders', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data)) {
      orders.value = data.data.map((r: any) => ({
        orderRef: r.order_ref,
        symbol: r.symbol,
        name: r.name,
        side: r.side,
        type: r.order_type,
        quantity: r.quantity,
        price: Number(r.price),
        status: r.status,
        paper: r.is_paper,
        timestamp: r.created_at,
        shortSell: r.short_sell,
      }))
    }
  } catch {
    // Fallback to localStorage for backward compatibility
    try {
      const raw = localStorage.getItem('sec-orders')
      if (raw) orders.value = JSON.parse(raw)
    } catch { /* silent */ }
  }
  loading.value = false
}

onMounted(loadOrders)

const activeOrders = computed(() =>
  orders.value.filter(o => o.status === 'pending_review' || o.status === 'sent' || o.status === 'pending')
)
const filledOrders = computed(() =>
  orders.value.filter(o => o.status === 'filled')
)
const cancelledOrders = computed(() =>
  orders.value.filter(o => o.status === 'cancelled')
)

const currentOrders = computed(() => {
  if (activeTab.value === 'active') return activeOrders.value
  if (activeTab.value === 'filled') return filledOrders.value
  return cancelledOrders.value
})

function statusLabel(status: string): string {
  switch (status) {
    case 'pending_review': return t('待審核', 'Pending Review', '待审核')
    case 'sent': return t('已發送', 'Sent', '已发送')
    case 'filled': return t('已成交', 'Filled', '已成交')
    case 'cancelled': return t('已取消', 'Cancelled', '已取消')
    case 'pending': return t('處理中', 'Pending', '处理中')
    default: return status
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'pending_review': return 'bg-amber-50 text-amber-700'
    case 'sent': return 'bg-blue-50 text-blue-700'
    case 'filled': return 'bg-green-50 text-green-700'
    case 'cancelled': return 'bg-slate-100 text-slate-500'
    case 'pending': return 'bg-amber-50 text-amber-600'
    default: return 'bg-slate-100 text-slate-500'
  }
}

function sideLabel(side: string): string {
  if (side === 'buy') return t('買入', 'Buy', '买入')
  return t('賣出', 'Sell', '卖出')
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return ts }
}

async function cancelOrder(order: Order) {
  try {
    const token = localStorage.getItem('sec-auth-token') || ''
    await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ orderRef: order.orderRef, status: 'cancelled' }),
    })
  } catch { /* silent */ }
  const idx = orders.value.findIndex(o => o.orderRef === order.orderRef)
  if (idx >= 0) orders.value[idx].status = 'cancelled'
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
        <span v-if="tab === 'active' && activeOrders.length > 0" class="ml-1.5 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{{ activeOrders.length }}</span>
        <span v-if="tab === 'filled' && filledOrders.length > 0" class="ml-1.5 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{{ filledOrders.length }}</span>
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="currentOrders.length === 0" class="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-16 text-center">
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
              <th class="px-6 py-4 font-semibold">{{ t('訂單號', 'Order Ref', '订单号') }}</th>
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
            <tr v-for="order in currentOrders" :key="order.orderRef" class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 text-sm text-slate-500 font-mono">{{ order.orderRef }}</td>
              <td class="px-6 py-4 font-bold text-blue-700">{{ order.symbol }}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-lg text-sm font-bold" :class="order.side === 'buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'">
                  {{ sideLabel(order.side) }}
                  <span v-if="order.shortSell" class="ml-1 text-xs">({{ t('賣空', 'Short', '卖空') }})</span>
                </span>
              </td>
              <td class="px-6 py-4 text-slate-600">{{ order.type }}</td>
              <td class="px-6 py-4 text-right font-medium">{{ order.quantity }}</td>
              <td class="px-6 py-4 text-right font-medium">{{ order.price.toFixed(2) }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold px-2.5 py-1 rounded-lg" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span>
                  <span v-if="order.paper" class="text-xs font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{{ t('模擬', 'Paper', '模拟') }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-slate-500">{{ formatTime(order.timestamp) }}</td>
              <td v-if="activeTab === 'active'" class="px-6 py-4">
                <button class="text-sm text-red-600 hover:text-red-700 font-bold" @click="cancelOrder(order)">{{ t('取消', 'Cancel', '取消') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
