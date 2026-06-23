<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()
const router = useRouter()

const isPaper = localStorage.getItem('sec-trade-mode') === 'paper'
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-slate-900">{{ t('持倉明細', 'Holdings', '持仓明细') }}</h2>
      <p class="text-sm text-slate-500 mt-1">{{ t('管理您的投資組合和持倉', 'Manage your portfolio and positions', '管理您的投资组合和持仓') }}</p>
    </div>

    <!-- Portfolio Summary Card -->
    <div v-if="isPaper" class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="text-sm font-semibold opacity-90">{{ t('模擬資金', 'Virtual Balance', '模拟资金') }}</span>
        </div>
        <span class="text-xs bg-white/20 text-white px-3 py-1 rounded-lg font-bold">{{ t('模擬盤', 'Paper', '模拟盘') }}</span>
      </div>
      <p class="text-2xl font-bold">HK$ 1,000,000.00</p>
    </div>

    <!-- Empty state -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-16 text-center">
      <svg class="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p class="text-base text-slate-400 mb-5">{{ t('暫無持倉，請先進行交易', 'No holdings yet. Start trading to see your positions here.', '暂无持仓，请先进行交易') }}</p>
      <button
        class="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all"
        @click="router.push('/sec/trade')"
      >
        {{ t('前往交易', 'Go to Trading', '前往交易') }}
      </button>
    </div>
  </div>
</template>
