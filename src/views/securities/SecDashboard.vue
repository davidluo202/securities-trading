<script setup lang="ts">
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const summary = [
  { label: () => t('總資產', 'Total Assets', '总资产'), value: 'HK$ 1,250,800.00', change: '+2.35%', up: true },
  { label: () => t('購買力', 'Buying Power', '购买力'), value: 'HK$ 680,400.00', change: '', up: true },
  { label: () => t('今日盈虧', "Today's P&L", '今日盈亏'), value: '+HK$ 12,350.00', change: '+0.99%', up: true },
  { label: () => t('持倉數量', 'Total Positions', '持仓数量'), value: '8', change: '', up: true },
]

const positions = [
  { symbol: '0700.HK', name: t('騰訊控股', 'Tencent', '腾讯控股'), qty: 200, cost: 320.00, price: 348.60, pnl: 5720.00 },
  { symbol: '9988.HK', name: t('阿里巴巴', 'Alibaba', '阿里巴巴'), qty: 500, cost: 82.50, price: 86.20, pnl: 1850.00 },
  { symbol: '1810.HK', name: t('小米集團', 'Xiaomi', '小米集团'), qty: 1000, cost: 18.20, price: 19.80, pnl: 1600.00 },
  { symbol: 'AAPL', name: 'Apple Inc.', qty: 50, cost: 178.50, price: 185.20, pnl: 335.00 },
]
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('帳戶總覽', 'Account Overview', '账户总览') }}</h2>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="(item, i) in summary" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500 mb-1">{{ item.label() }}</p>
        <p class="text-lg font-semibold text-slate-800">{{ item.value }}</p>
        <p v-if="item.change" class="text-xs mt-1" :class="item.up ? 'text-green-600' : 'text-red-500'">{{ item.change }}</p>
      </div>
    </div>

    <!-- Top Holdings -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100">
      <div class="px-5 py-4 border-b border-slate-100">
        <h3 class="text-sm font-semibold text-slate-700">{{ t('主要持倉', 'Top Holdings', '主要持仓') }}</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-500 border-b border-slate-50">
              <th class="px-5 py-3 font-medium">{{ t('代碼', 'Symbol', '代码') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('名稱', 'Name', '名称') }}</th>
              <th class="px-5 py-3 font-medium text-right">{{ t('數量', 'Qty', '数量') }}</th>
              <th class="px-5 py-3 font-medium text-right">{{ t('現價', 'Price', '现价') }}</th>
              <th class="px-5 py-3 font-medium text-right">{{ t('盈虧', 'P&L', '盈亏') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in positions" :key="p.symbol" class="border-b border-slate-50 hover:bg-slate-50">
              <td class="px-5 py-3 font-medium text-blue-600">{{ p.symbol }}</td>
              <td class="px-5 py-3 text-slate-600">{{ p.name }}</td>
              <td class="px-5 py-3 text-right">{{ p.qty }}</td>
              <td class="px-5 py-3 text-right">{{ p.price.toFixed(2) }}</td>
              <td class="px-5 py-3 text-right" :class="p.pnl >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ p.pnl >= 0 ? '+' : '' }}{{ p.pnl.toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Market Summary -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500 mb-1">{{ t('恒生指數', 'Hang Seng Index', '恒生指数') }}</p>
        <p class="text-lg font-semibold text-slate-800">18,430.25</p>
        <p class="text-xs text-green-600">+156.30 (+0.86%)</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500 mb-1">{{ t('恒生科技指數', 'HS Tech Index', '恒生科技指数') }}</p>
        <p class="text-lg font-semibold text-slate-800">4,128.50</p>
        <p class="text-xs text-green-600">+42.15 (+1.03%)</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500 mb-1">S&P 500</p>
        <p class="text-lg font-semibold text-slate-800">5,482.10</p>
        <p class="text-xs text-red-500">-18.40 (-0.33%)</p>
      </div>
    </div>
  </div>
</template>
