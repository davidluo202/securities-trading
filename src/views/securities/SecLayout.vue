<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLanguage, type LangMode } from '../../composables/useLanguage'

const route = useRoute()
const router = useRouter()
const { t, setLang, langLabel, langMode } = useLanguage()
const sidebarOpen = ref(false)
const langDropdown = ref(false)
const paperMode = ref(false)

const navItems = computed(() => [
  { key: 'dashboard', icon: '📊', label: t('總覽', 'Dashboard', '总览'), route: '/sec/dashboard' },
  { key: 'trade', icon: '💹', label: t('交易', 'Trade', '交易'), route: '/sec/trade' },
  { key: 'orders', icon: '📋', label: t('委託', 'Orders', '委托'), route: '/sec/orders' },
  { key: 'holdings', icon: '💼', label: t('持倉', 'Holdings', '持仓'), route: '/sec/holdings' },
  { key: 'market', icon: '📈', label: t('行情', 'Market', '行情'), route: '/sec/market' },
  { key: 'funds', icon: '💰', label: t('資金', 'Funds', '资金'), route: '/sec/funds' },
  { key: 'paper-trade', icon: '🎮', label: t('模擬', 'Paper', '模拟'), route: '/sec/paper-trade' },
  { key: 'history', icon: '📜', label: t('歷史', 'History', '历史'), route: '/sec/history' },
  { key: 'settings', icon: '⚙️', label: t('設定', 'Settings', '设定'), route: '/sec/settings' },
])

const mobileNav = computed(() => navItems.value.slice(0, 5))

const isActive = (path: string) => route.path === path

const langs: { mode: LangMode; label: string }[] = [
  { mode: 'zh-TW', label: '繁體中文' },
  { mode: 'zh-CN', label: '简体中文' },
  { mode: 'en', label: 'English' },
  { mode: 'bilingual', label: '雙語 Bilingual' },
]

function togglePaper() {
  paperMode.value = !paperMode.value
  if (paperMode.value) {
    router.push('/sec/paper-trade')
  } else if (route.path === '/sec/paper-trade') {
    router.push('/sec/dashboard')
  }
}
</script>

<template>
  <div class="flex h-screen bg-slate-50">
    <!-- Desktop Sidebar -->
    <aside class="hidden lg:flex flex-col w-60 bg-[#0f172a] text-white shrink-0">
      <div class="px-5 py-5 border-b border-slate-700">
        <h1 class="text-lg font-bold tracking-wide">CMF Securities</h1>
        <p class="text-xs text-slate-400 mt-0.5">{{ t('證券交易系統', 'Trading System', '证券交易系统') }}</p>
      </div>
      <nav class="flex-1 py-3 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          :to="item.route"
          class="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-slate-800"
          :class="isActive(item.route) ? 'bg-slate-800 border-l-3 border-blue-500 text-white' : 'text-slate-300 border-l-3 border-transparent'"
        >
          <span class="text-base">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="px-5 py-4 border-t border-slate-700 text-xs text-slate-500">
        v260622.001
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Header -->
      <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div class="flex items-center gap-3">
          <button class="lg:hidden p-1.5 rounded hover:bg-slate-100" @click="sidebarOpen = !sidebarOpen">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <span class="lg:hidden font-semibold text-sm text-slate-800">CMF Securities</span>
        </div>
        <div class="flex items-center gap-3">
          <!-- Paper Trade Toggle -->
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            :class="paperMode ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="togglePaper"
          >
            <span>🎮</span>
            <span>{{ t('模擬交易', 'Paper Trade', '模拟交易') }}</span>
          </button>
          <!-- Language Switcher -->
          <div class="relative">
            <button
              class="px-2.5 py-1.5 rounded bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200"
              @click="langDropdown = !langDropdown"
            >
              {{ langLabel }}
            </button>
            <div
              v-if="langDropdown"
              class="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
            >
              <button
                v-for="l in langs"
                :key="l.mode"
                class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                :class="langMode === l.mode ? 'text-blue-600 font-medium' : 'text-slate-700'"
                @click="setLang(l.mode); langDropdown = false"
              >
                {{ l.label }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Paper Mode Banner -->
      <div v-if="paperMode" class="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-sm text-yellow-800 font-medium">
        {{ t('模擬交易模式 - 使用虛擬資金', 'Paper Trading Mode - Using Virtual Funds', '模拟交易模式 - 使用虚拟资金') }}
      </div>

      <!-- Mobile Sidebar Overlay -->
      <div v-if="sidebarOpen" class="lg:hidden fixed inset-0 z-40">
        <div class="absolute inset-0 bg-black/40" @click="sidebarOpen = false" />
        <aside class="absolute left-0 top-0 bottom-0 w-60 bg-[#0f172a] text-white">
          <div class="px-5 py-5 border-b border-slate-700">
            <h1 class="text-lg font-bold">CMF Securities</h1>
          </div>
          <nav class="py-3">
            <RouterLink
              v-for="item in navItems"
              :key="item.key"
              :to="item.route"
              class="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-slate-800"
              :class="isActive(item.route) ? 'bg-slate-800 border-l-3 border-blue-500 text-white' : 'text-slate-300 border-l-3 border-transparent'"
              @click="sidebarOpen = false"
            >
              <span class="text-base">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </aside>
      </div>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <RouterView />
      </main>

      <!-- Mobile Bottom Tab -->
      <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-30">
        <RouterLink
          v-for="item in mobileNav"
          :key="item.key"
          :to="item.route"
          class="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px]"
          :class="isActive(item.route) ? 'text-blue-600' : 'text-slate-500'"
        >
          <span class="text-lg">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
