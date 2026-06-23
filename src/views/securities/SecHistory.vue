<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const dateRange = ref('all')

interface HistoryItem {
  date: string
  type: 'trade' | 'deposit' | 'withdrawal'
  symbol?: string
  side?: string
  qty?: number
  price?: number
  amount: number
  currency: string
  fee?: number
  status: string
  ref?: string
}

// Load trades from localStorage
function loadHistory(): HistoryItem[] {
  const items: HistoryItem[] = []

  // Load trading orders (filled ones)
  try {
    const orders = JSON.parse(localStorage.getItem('sec-orders') || '[]')
    for (const o of orders) {
      if (o.status === 'filled' || o.status === 'pending_review' || o.status === 'sent') {
        items.push({
          date: o.timestamp || o.createdAt || '',
          type: 'trade',
          symbol: o.symbol,
          side: o.side,
          qty: o.quantity,
          price: o.price,
          amount: (o.quantity || 0) * (o.price || 0),
          currency: o.symbol?.endsWith('.SH') || o.symbol?.endsWith('.SZ') ? 'CNY' : o.symbol?.endsWith('.HK') ? 'HKD' : 'USD',
          fee: o.fee || 0,
          status: o.status,
          ref: o.orderRef,
        })
      }
    }
  } catch { /* silent */ }

  // Load deposit/withdrawal records
  try {
    const deposits = JSON.parse(localStorage.getItem('sec-fund-transactions') || '[]')
    for (const d of deposits) {
      items.push({
        date: d.date || d.timestamp || '',
        type: d.type || 'deposit',
        amount: parseFloat(d.amount) || 0,
        currency: d.currency || 'HKD',
        status: d.status || 'pending',
        ref: d.ref || '',
      })
    }
  } catch { /* silent */ }

  // Sort by date descending
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return items
}

const allHistory = ref<HistoryItem[]>(loadHistory())

const filteredHistory = computed(() => {
  if (dateRange.value === 'all') return allHistory.value
  const days = parseInt(dateRange.value) || 7
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return allHistory.value.filter(h => new Date(h.date) >= cutoff)
})

const tradeCount = computed(() => filteredHistory.value.filter(h => h.type === 'trade').length)
const buyTotal = computed(() => filteredHistory.value.filter(h => h.type === 'trade' && h.side === 'BUY').reduce((s, h) => s + h.amount, 0))
const sellTotal = computed(() => filteredHistory.value.filter(h => h.type === 'trade' && h.side === 'SELL').reduce((s, h) => s + h.amount, 0))
const depositTotal = computed(() => filteredHistory.value.filter(h => h.type === 'deposit').reduce((s, h) => s + h.amount, 0))

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const typeLabel = (type: string) => {
  if (type === 'trade') return t('交易', 'Trade', '交易')
  if (type === 'deposit') return t('入金', 'Deposit', '入金')
  if (type === 'withdrawal') return t('出金', 'Withdrawal', '出金')
  return type
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    filled: t('已成交', 'Filled', '已成交'),
    pending_review: t('待審核', 'Pending', '待审核'),
    sent: t('已發送', 'Sent', '已发送'),
    pending: t('待確認', 'Pending', '待确认'),
    confirmed: t('已確認', 'Confirmed', '已确认'),
    cancelled: t('已取消', 'Cancelled', '已取消'),
  }
  return map[status] || status
}

const statusColor = (status: string) => {
  if (status === 'filled' || status === 'confirmed') return 'text-green-700 bg-green-50'
  if (status === 'pending_review' || status === 'pending') return 'text-amber-700 bg-amber-50'
  if (status === 'sent') return 'text-blue-700 bg-blue-50'
  return 'text-slate-600 bg-slate-100'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">{{ t('交易歷史', 'Trade History', '交易历史') }}</h2>
        <p class="text-sm text-slate-500 mt-1">{{ t('查看歷史成交及資金記錄', 'View trade and fund transaction history', '查看历史成交及资金记录') }}</p>
      </div>
      <div class="flex gap-2">
        <button v-for="r in ['7d', '30d', '90d', 'all']" :key="r" class="px-4 py-2 rounded-xl text-sm font-bold transition-all" :class="dateRange === r ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'" @click="dateRange = r">
          {{ r === 'all' ? t('全部', 'All', '全部') : r }}
        </button>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <p class="text-sm text-slate-500 mb-2">{{ t('交易筆數', 'Trades', '交易笔数') }}</p>
        <p class="text-2xl font-bold text-slate-900">{{ tradeCount }}</p>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <p class="text-sm text-slate-500 mb-2">{{ t('買入金額', 'Buy Amount', '买入金额') }}</p>
        <p class="text-2xl font-bold text-green-600">{{ fmt(buyTotal) }}</p>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <p class="text-sm text-slate-500 mb-2">{{ t('賣出金額', 'Sell Amount', '卖出金额') }}</p>
        <p class="text-2xl font-bold text-red-600">{{ fmt(sellTotal) }}</p>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <p class="text-sm text-slate-500 mb-2">{{ t('入金總額', 'Deposits', '入金总额') }}</p>
        <p class="text-2xl font-bold text-blue-600">{{ fmt(depositTotal) }}</p>
      </div>
    </div>

    <!-- History Table -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <table class="w-full text-base">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200">
            <th class="px-6 py-4 text-left font-semibold text-slate-600">{{ t('日期', 'Date', '日期') }}</th>
            <th class="px-6 py-4 text-left font-semibold text-slate-600">{{ t('類型', 'Type', '类型') }}</th>
            <th class="px-6 py-4 text-left font-semibold text-slate-600">{{ t('標的/說明', 'Details', '标的/说明') }}</th>
            <th class="px-6 py-4 text-right font-semibold text-slate-600">{{ t('金額', 'Amount', '金额') }}</th>
            <th class="px-6 py-4 text-center font-semibold text-slate-600">{{ t('幣種', 'Currency', '币种') }}</th>
            <th class="px-6 py-4 text-center font-semibold text-slate-600">{{ t('狀態', 'Status', '状态') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredHistory.length === 0">
            <td colspan="6" class="px-6 py-12 text-center">
              <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p class="text-slate-400 text-base">{{ t('暫無交易記錄', 'No transaction history', '暂无交易记录') }}</p>
            </td>
          </tr>
          <tr v-for="(h, idx) in filteredHistory" :key="idx" class="border-b border-slate-100 hover:bg-slate-50 transition-colors" :class="idx % 2 === 1 ? 'bg-slate-50/50' : ''">
            <td class="px-6 py-4 text-sm text-slate-600">{{ h.date }}</td>
            <td class="px-6 py-4">
              <span class="px-2.5 py-1 rounded-lg text-xs font-bold" :class="h.type === 'trade' ? 'bg-purple-50 text-purple-700' : h.type === 'deposit' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'">
                {{ typeLabel(h.type) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <template v-if="h.type === 'trade'">
                <span class="font-bold" :class="h.side === 'BUY' ? 'text-green-700' : 'text-red-600'">{{ h.side === 'BUY' ? t('買入', 'Buy', '买入') : t('賣出', 'Sell', '卖出') }}</span>
                <span class="text-slate-800 font-semibold ml-2">{{ h.symbol }}</span>
                <span class="text-slate-500 ml-2">x{{ h.qty }} @ {{ h.price?.toFixed(2) }}</span>
              </template>
              <template v-else>
                {{ h.type === 'deposit' ? t('入金', 'Deposit', '入金') : t('出金', 'Withdrawal', '出金') }}
                <span v-if="h.ref" class="text-xs text-slate-400 ml-2">{{ h.ref }}</span>
              </template>
            </td>
            <td class="px-6 py-4 text-right font-bold font-mono" :class="h.type === 'deposit' ? 'text-blue-600' : h.side === 'BUY' ? 'text-green-700' : 'text-red-600'">
              {{ h.type === 'deposit' ? '+' : h.type === 'withdrawal' ? '-' : '' }}{{ fmt(h.amount) }}
            </td>
            <td class="px-6 py-4 text-center text-sm">{{ h.currency }}</td>
            <td class="px-6 py-4 text-center">
              <span class="px-2.5 py-1 rounded-lg text-xs font-bold" :class="statusColor(h.status)">
                {{ statusLabel(h.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
