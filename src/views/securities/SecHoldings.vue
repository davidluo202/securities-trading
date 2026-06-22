<script setup lang="ts">
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const holdings = [
  { symbol: '0700.HK', name: '騰訊控股', qty: 200, avgCost: 320.00, current: 348.60, pnl: 5720.00, pnlPct: 8.94 },
  { symbol: '9988.HK', name: '阿里巴巴', qty: 500, avgCost: 82.50, current: 86.20, pnl: 1850.00, pnlPct: 4.48 },
  { symbol: '1810.HK', name: '小米集團', qty: 1000, avgCost: 18.20, current: 19.80, pnl: 1600.00, pnlPct: 8.79 },
  { symbol: 'AAPL', name: 'Apple Inc.', qty: 50, avgCost: 178.50, current: 185.20, pnl: 335.00, pnlPct: 3.75 },
  { symbol: '3690.HK', name: '美團', qty: 300, avgCost: 128.00, current: 132.40, pnl: 1320.00, pnlPct: 3.44 },
  { symbol: 'TSLA', name: 'Tesla Inc.', qty: 20, avgCost: 242.00, current: 238.50, pnl: -70.00, pnlPct: -1.45 },
  { symbol: '0005.HK', name: '匯豐控股', qty: 400, avgCost: 62.80, current: 64.10, pnl: 520.00, pnlPct: 2.07 },
  { symbol: '2269.HK', name: '藥明生物', qty: 600, avgCost: 15.40, current: 15.10, pnl: -180.00, pnlPct: -1.95 },
]
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('持倉明細', 'Holdings', '持仓明细') }}</h2>

    <!-- Summary Row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('持倉市值', 'Market Value', '持仓市值') }}</p>
        <p class="text-lg font-semibold text-slate-800">HK$ 892,450.00</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('總成本', 'Total Cost', '总成本') }}</p>
        <p class="text-lg font-semibold text-slate-800">HK$ 881,355.00</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('未實現盈虧', 'Unrealized P&L', '未实现盈亏') }}</p>
        <p class="text-lg font-semibold text-green-600">+HK$ 11,095.00</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('收益率', 'Return', '收益率') }}</p>
        <p class="text-lg font-semibold text-green-600">+1.26%</p>
      </div>
    </div>

    <!-- Position Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="h in holdings" :key="h.symbol" class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div class="flex justify-between items-start mb-3">
          <div>
            <span class="font-semibold text-blue-600 text-sm">{{ h.symbol }}</span>
            <p class="text-xs text-slate-500 mt-0.5">{{ h.name }}</p>
          </div>
          <div class="text-right">
            <p class="font-semibold text-sm" :class="h.pnl >= 0 ? 'text-green-600' : 'text-red-500'">
              {{ h.pnl >= 0 ? '+' : '' }}{{ h.pnl.toFixed(2) }}
            </p>
            <p class="text-xs" :class="h.pnl >= 0 ? 'text-green-600' : 'text-red-500'">
              {{ h.pnl >= 0 ? '+' : '' }}{{ h.pnlPct.toFixed(2) }}%
            </p>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span class="text-slate-400">{{ t('數量', 'Qty', '数量') }}</span>
            <p class="text-slate-700 font-medium">{{ h.qty }}</p>
          </div>
          <div>
            <span class="text-slate-400">{{ t('成本', 'Cost', '成本') }}</span>
            <p class="text-slate-700 font-medium">{{ h.avgCost.toFixed(2) }}</p>
          </div>
          <div>
            <span class="text-slate-400">{{ t('現價', 'Price', '现价') }}</span>
            <p class="text-slate-700 font-medium">{{ h.current.toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
