<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage, type LangMode } from '../../composables/useLanguage'
const { t, langMode, setLang } = useLanguage()

const notifications = ref(true)
const confirmBeforeOrder = ref(true)
const defaultOrderType = ref('limit')
const defaultMarket = ref('HK')
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('系統設定', 'Settings', '系统设定') }}</h2>

    <!-- Language -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h3 class="text-sm font-semibold text-slate-700 mb-4">{{ t('語言設定', 'Language', '语言设定') }}</h3>
      <div class="grid grid-cols-2 gap-3">
        <button v-for="l in ([
          { mode: 'zh-TW' as LangMode, label: '繁體中文' },
          { mode: 'zh-CN' as LangMode, label: '简体中文' },
          { mode: 'en' as LangMode, label: 'English' },
          { mode: 'bilingual' as LangMode, label: '雙語 Bilingual' },
        ])" :key="l.mode"
          class="px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          :class="langMode === l.mode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
          @click="setLang(l.mode)"
        >{{ l.label }}</button>
      </div>
    </div>

    <!-- Trading Preferences -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h3 class="text-sm font-semibold text-slate-700 mb-4">{{ t('交易偏好', 'Trading Preferences', '交易偏好') }}</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-600">{{ t('下單前確認', 'Confirm Before Order', '下单前确认') }}</span>
          <button
            class="w-10 h-5.5 rounded-full transition-colors relative"
            :class="confirmBeforeOrder ? 'bg-blue-600' : 'bg-slate-300'"
            @click="confirmBeforeOrder = !confirmBeforeOrder"
          >
            <span class="absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform" :class="confirmBeforeOrder ? 'left-5' : 'left-0.5'" />
          </button>
        </div>
        <div>
          <label class="text-sm text-slate-600 block mb-1.5">{{ t('預設委託類型', 'Default Order Type', '默认委托类型') }}</label>
          <select v-model="defaultOrderType" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="limit">{{ t('限價單', 'Limit', '限价单') }}</option>
            <option value="market">{{ t('市價單', 'Market', '市价单') }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-slate-600 block mb-1.5">{{ t('預設市場', 'Default Market', '默认市场') }}</label>
          <select v-model="defaultMarket" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="HK">{{ t('港股', 'HK Stock', '港股') }}</option>
            <option value="US">{{ t('美股', 'US Stock', '美股') }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h3 class="text-sm font-semibold text-slate-700 mb-4">{{ t('通知設定', 'Notifications', '通知设定') }}</h3>
      <div class="flex items-center justify-between">
        <span class="text-sm text-slate-600">{{ t('訂單成交通知', 'Order Fill Notifications', '订单成交通知') }}</span>
        <button
          class="w-10 h-5.5 rounded-full transition-colors relative"
          :class="notifications ? 'bg-blue-600' : 'bg-slate-300'"
          @click="notifications = !notifications"
        >
          <span class="absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform" :class="notifications ? 'left-5' : 'left-0.5'" />
        </button>
      </div>
    </div>

    <!-- Account Info -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h3 class="text-sm font-semibold text-slate-700 mb-4">{{ t('帳戶資訊', 'Account Info', '账户信息') }}</h3>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-500">{{ t('帳戶號碼', 'Account No.', '账户号码') }}</span>
          <span class="text-slate-700 font-mono">SEC-2026-00001</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">{{ t('帳戶類型', 'Account Type', '账户类型') }}</span>
          <span class="text-slate-700">{{ t('現金帳戶', 'Cash Account', '现金账户') }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">{{ t('開戶日期', 'Open Date', '开户日期') }}</span>
          <span class="text-slate-700">2026-01-15</span>
        </div>
      </div>
    </div>
  </div>
</template>
