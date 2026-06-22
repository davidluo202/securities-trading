<script setup lang="ts">
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const balances = [
  { currency: 'HKD', available: 680400.00, frozen: 45000.00, total: 725400.00 },
  { currency: 'USD', available: 12500.00, frozen: 2000.00, total: 14500.00 },
  { currency: 'CNY', available: 35000.00, frozen: 0, total: 35000.00 },
]

const recentTxns = [
  { date: '2026-06-20', type: 'Deposit', currency: 'HKD', amount: 100000.00, status: 'Completed' },
  { date: '2026-06-18', type: 'Withdraw', currency: 'HKD', amount: -50000.00, status: 'Completed' },
  { date: '2026-06-15', type: 'Deposit', currency: 'USD', amount: 5000.00, status: 'Completed' },
  { date: '2026-06-12', type: 'FX', currency: 'HKD→USD', amount: 0, status: 'Completed' },
]
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('資金管理', 'Funds', '资金管理') }}</h2>

    <!-- Balance Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="b in balances" :key="b.currency" class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-semibold text-slate-700">{{ b.currency }}</span>
          <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{{ t('活期', 'Cash', '活期') }}</span>
        </div>
        <p class="text-xl font-bold text-slate-800 mb-3">{{ b.total.toLocaleString('en', { minimumFractionDigits: 2 }) }}</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-slate-400">{{ t('可用', 'Available', '可用') }}</span>
            <p class="text-slate-700 font-medium">{{ b.available.toLocaleString('en', { minimumFractionDigits: 2 }) }}</p>
          </div>
          <div>
            <span class="text-slate-400">{{ t('凍結', 'Frozen', '冻结') }}</span>
            <p class="text-slate-700 font-medium">{{ b.frozen.toLocaleString('en', { minimumFractionDigits: 2 }) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3">
      <button class="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        {{ t('入金', 'Deposit', '入金') }}
      </button>
      <button class="px-6 py-2.5 bg-white text-slate-700 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors">
        {{ t('出金', 'Withdraw', '出金') }}
      </button>
      <button class="px-6 py-2.5 bg-white text-slate-700 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors">
        {{ t('換匯', 'FX Exchange', '换汇') }}
      </button>
    </div>

    <!-- Recent Transactions -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100">
      <div class="px-5 py-4 border-b border-slate-100">
        <h3 class="text-sm font-semibold text-slate-700">{{ t('近期資金記錄', 'Recent Transactions', '近期资金记录') }}</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
              <th class="px-5 py-3 font-medium">{{ t('日期', 'Date', '日期') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('類型', 'Type', '类型') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('幣種', 'Currency', '币种') }}</th>
              <th class="px-5 py-3 font-medium text-right">{{ t('金額', 'Amount', '金额') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('狀態', 'Status', '状态') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(tx, i) in recentTxns" :key="i" class="border-b border-slate-50 hover:bg-slate-50">
              <td class="px-5 py-3 text-slate-600">{{ tx.date }}</td>
              <td class="px-5 py-3 text-slate-700">{{ tx.type }}</td>
              <td class="px-5 py-3 text-slate-600">{{ tx.currency }}</td>
              <td class="px-5 py-3 text-right font-medium" :class="tx.amount > 0 ? 'text-green-600' : tx.amount < 0 ? 'text-red-500' : 'text-slate-500'">
                {{ tx.amount !== 0 ? (tx.amount > 0 ? '+' : '') + tx.amount.toLocaleString('en', { minimumFractionDigits: 2 }) : '-' }}
              </td>
              <td class="px-5 py-3 text-xs text-green-600">{{ tx.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
