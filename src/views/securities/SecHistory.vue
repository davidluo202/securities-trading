<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const dateRange = ref('7d')

const trades = [
  { date: '2026-06-21 14:22:10', symbol: '1810.HK', side: 'Buy', qty: 1000, price: 19.80, amount: 19800.00, fee: 50.00 },
  { date: '2026-06-21 11:05:33', symbol: '0700.HK', side: 'Sell', qty: 100, price: 350.00, amount: 35000.00, fee: 50.00 },
  { date: '2026-06-20 15:30:00', symbol: '9988.HK', side: 'Buy', qty: 500, price: 82.50, amount: 41250.00, fee: 50.00 },
  { date: '2026-06-19 10:12:45', symbol: 'AAPL', side: 'Buy', qty: 50, price: 178.50, amount: 8925.00, fee: 15.00 },
  { date: '2026-06-18 09:45:00', symbol: '3690.HK', side: 'Buy', qty: 300, price: 128.00, amount: 38400.00, fee: 50.00 },
  { date: '2026-06-17 14:00:22', symbol: '0005.HK', side: 'Buy', qty: 400, price: 62.80, amount: 25120.00, fee: 50.00 },
  { date: '2026-06-16 11:33:10', symbol: 'TSLA', side: 'Buy', qty: 20, price: 242.00, amount: 4840.00, fee: 15.00 },
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-800">{{ t('交易歷史', 'Trade History', '交易历史') }}</h2>
      <div class="flex gap-1 bg-slate-100 rounded-lg p-1">
        <button v-for="r in ['7d', '30d', '90d', 'all']" :key="r" class="px-3 py-1 rounded text-xs font-medium" :class="dateRange === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'" @click="dateRange = r">
          {{ r === 'all' ? t('全部', 'All', '全部') : r }}
        </button>
      </div>
    </div>

    <!-- Trade Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('交易筆數', 'Total Trades', '交易笔数') }}</p>
        <p class="text-lg font-semibold text-slate-800">{{ trades.length }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('買入金額', 'Buy Amount', '买入金额') }}</p>
        <p class="text-lg font-semibold text-slate-800">HK$ 138,335.00</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('賣出金額', 'Sell Amount', '卖出金额') }}</p>
        <p class="text-lg font-semibold text-slate-800">HK$ 35,000.00</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('總手續費', 'Total Fees', '总手续费') }}</p>
        <p class="text-lg font-semibold text-slate-800">HK$ 280.00</p>
      </div>
    </div>

    <!-- Trade Table -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-3 font-medium">{{ t('時間', 'Time', '时间') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('代碼', 'Symbol', '代码') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('方向', 'Side', '方向') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('數量', 'Qty', '数量') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('價格', 'Price', '价格') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('金額', 'Amount', '金额') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('手續費', 'Fee', '手续费') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(trade, i) in trades" :key="i" class="border-b border-slate-50 hover:bg-slate-50">
              <td class="px-4 py-3 text-xs text-slate-500">{{ trade.date }}</td>
              <td class="px-4 py-3 font-medium text-blue-600">{{ trade.symbol }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs font-medium" :class="trade.side === 'Buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'">{{ trade.side }}</span>
              </td>
              <td class="px-4 py-3 text-right">{{ trade.qty }}</td>
              <td class="px-4 py-3 text-right">{{ trade.price.toFixed(2) }}</td>
              <td class="px-4 py-3 text-right font-medium">{{ trade.amount.toLocaleString('en', { minimumFractionDigits: 2 }) }}</td>
              <td class="px-4 py-3 text-right text-slate-500">{{ trade.fee.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
