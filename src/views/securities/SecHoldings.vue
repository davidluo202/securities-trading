<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()
const router = useRouter()

const isPaper = localStorage.getItem('sec-trade-mode') === 'paper'
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('持倉明細', 'Holdings', '持仓明细') }}</h2>

    <!-- Paper mode balance card -->
    <div v-if="isPaper" class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
      <p class="text-xs text-yellow-700 mb-1">{{ t('模擬資金', 'Virtual Balance', '模拟资金') }}</p>
      <p class="text-xl font-bold text-yellow-800">HK$ 1,000,000.00</p>
    </div>

    <!-- Empty state -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 px-5 py-12 text-center">
      <div class="text-slate-400 mb-2">
        <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p class="text-sm">{{ t('暫無持倉，請先進行交易', 'No holdings yet. Start trading to see your positions here.', '暂无持仓，请先进行交易') }}</p>
      </div>
      <button
        class="mt-3 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        @click="router.push('/sec/trade')"
      >
        {{ t('前往交易', 'Go to Trading', '前往交易') }}
      </button>
    </div>
  </div>
</template>
