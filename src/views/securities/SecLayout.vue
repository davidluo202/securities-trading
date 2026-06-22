<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLanguage, type LangMode } from '../../composables/useLanguage'

const route = useRoute()
const router = useRouter()
const { t, setLang, langLabel, langMode } = useLanguage()
const sidebarOpen = ref(false)
const langDropdown = ref(false)
const paperMode = ref(localStorage.getItem('sec-trade-mode') === 'paper')

// Dynamic logo based on language
const sidebarLogo = computed(() => {
  if (langMode.value === 'en' || langMode.value === 'bilingual') return '/logo-en-black.jpg'
  return '/logo-zh.jpg'
})

// Time greeting
const currentTime = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  clockTimer = setInterval(() => { currentTime.value = new Date() }, 1000)
})
onUnmounted(() => { if (clockTimer) clearInterval(clockTimer) })

const greeting = computed(() => {
  const h = currentTime.value.getHours()
  if (h < 6) return t('凌晨好', 'Good evening', '凌晨好')
  if (h < 12) return t('早上好', 'Good morning', '早上好')
  if (h < 14) return t('午安', 'Good afternoon', '午安')
  if (h < 18) return t('下午好', 'Good afternoon', '下午好')
  return t('晚上好', 'Good evening', '晚上好')
})

const userName = computed(() => {
  // TODO: get from auth store
  return 'David'
})

const timeString = computed(() => {
  return currentTime.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

const dateString = computed(() => {
  return currentTime.value.toLocaleDateString(langMode.value === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'
  })
})

function logout() {
  localStorage.removeItem('sec-authenticated')
  localStorage.removeItem('sec-trade-mode')
  router.push('/sec/login')
}

const navItems = computed(() => [
  { key: 'dashboard', icon: '📊', label: t('賬戶總覽', 'Dashboard', '账户总览'), labelEn: 'Dashboard', route: '/sec/dashboard' },
  { key: 'trade', icon: '📝', label: t('交易下單', 'Trade', '交易下单'), labelEn: 'Trade', route: '/sec/trade' },
  { key: 'orders', icon: '📋', label: t('委託訂單', 'Orders', '委托订单'), labelEn: 'Orders', route: '/sec/orders' },
  { key: 'holdings', icon: '📁', label: t('持倉', 'Holdings', '持仓'), labelEn: 'Portfolio', route: '/sec/holdings' },
  { key: 'market', icon: '📈', label: t('行情', 'Market', '行情'), labelEn: 'Market', route: '/sec/market' },
  { key: 'funds', icon: '💰', label: t('資金管理', 'Funds', '资金管理'), labelEn: 'Funds', route: '/sec/funds' },
  { key: 'history', icon: '🕐', label: t('交易歷史', 'History', '交易历史'), labelEn: 'History', route: '/sec/history' },
  { key: 'reports', icon: '📄', label: t('報表', 'Reports', '报表'), labelEn: 'Reports', route: '/sec/history' },
  { key: 'settings', icon: '⚙️', label: t('設置', 'Settings', '设置'), labelEn: 'Settings', route: '/sec/settings' },
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
    <aside class="hidden lg:flex flex-col w-64 text-white shrink-0" style="background-color: #0f172a;">
      <!-- Logo (light bg card, matching OTC exactly) -->
      <div class="px-4 py-1 border-b border-slate-700 bg-slate-100 mx-2 mt-2 rounded-lg overflow-hidden" style="max-height: 80px;">
        <img :src="sidebarLogo" alt="CM Financial" class="w-full object-contain" style="margin-top: -15%; margin-bottom: -15%;" />
      </div>

      <!-- Clock + Greeting (yellow bg in paper mode) -->
      <div class="px-5 py-4 border-b border-slate-700" :class="paperMode ? 'bg-yellow-600/20' : ''">
        <div class="text-xs mb-1" :class="paperMode ? 'text-yellow-300' : 'text-slate-400'">🕐 {{ dateString }} {{ timeString }}</div>
        <div class="text-lg font-bold text-white">{{ greeting }}，{{ userName }}{{ t('先生', '', '先生') }}！</div>
        <div v-if="paperMode" class="mt-2 px-2 py-1 rounded bg-yellow-500/30 text-yellow-200 text-xs font-bold text-center">
          {{ t('⚠ 模擬盤模式', '⚠ Paper Trade Mode', '⚠ 模拟盘模式') }}
        </div>
      </div>

      <!-- Navigation (matching OTC exactly) -->
      <nav class="flex-1 py-3 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          :to="item.route"
          :class="[
            'w-full text-left px-5 py-3 flex items-center gap-3 text-lg transition-colors',
            isActive(item.route)
              ? 'bg-blue-600/20 text-white border-l-4 border-blue-400'
              : 'text-slate-300 hover:bg-slate-700/50 border-l-4 border-transparent'
          ]"
        >
          <span class="text-xl">{{ item.icon }}</span>
          <span>
            <span class="block font-semibold">{{ item.label }}</span>
            <span class="block text-xs opacity-60">{{ item.labelEn }}</span>
          </span>
        </RouterLink>
      </nav>

      <!-- Logout + Version (high contrast) -->
      <div class="border-t border-slate-600 p-3 bg-slate-900/50">
        <button
          class="w-full text-left px-4 py-2.5 text-base text-white font-medium hover:bg-red-600/30 rounded-lg border border-slate-600 hover:border-red-500 transition-colors"
          @click="logout"
        >
          🚪 {{ t('退出登錄', 'Logout', '退出登录') }} / Logout
        </button>
        <div class="text-center text-sm text-yellow-400 font-bold mt-2 tracking-wide">v260622.009</div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Header -->
      <header class="border-b flex items-center justify-between px-3 shrink-0" :class="paperMode ? 'bg-yellow-300 border-yellow-400 py-2' : 'bg-white border-slate-200 py-2'">
        <div class="flex items-center gap-2">
          <button class="lg:hidden p-1.5 rounded" :class="paperMode ? 'hover:bg-yellow-400' : 'hover:bg-slate-100'" @click="sidebarOpen = !sidebarOpen">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <img :src="sidebarLogo" alt="CM Financial" class="lg:hidden h-8 object-contain" />
          <span v-if="paperMode" class="lg:hidden text-xs font-bold text-yellow-900 bg-yellow-500/40 px-2 py-0.5 rounded">{{ t('模擬盤', 'Paper', '模拟盘') }}</span>
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
        {{ t('模擬交易模式 Paper Trade Mode', 'Paper Trade Mode', '模拟交易模式 Paper Trade Mode') }}
      </div>

      <!-- Mobile Sidebar Overlay -->
      <div v-if="sidebarOpen" class="lg:hidden fixed inset-0 z-40">
        <div class="absolute inset-0 bg-black/40" @click="sidebarOpen = false" />
        <aside class="absolute left-0 top-0 bottom-0 w-64 bg-[#0f172a] text-white flex flex-col">
          <!-- Mobile Logo -->
          <div class="px-3 py-1 bg-slate-100 mx-2 mt-2 rounded-lg overflow-hidden" style="max-height: 70px;">
            <img :src="sidebarLogo" alt="CM Financial" class="w-full object-contain" style="margin-top: -15%; margin-bottom: -15%;" />
          </div>
          <!-- Mobile Greeting -->
          <div class="px-4 py-3 border-b border-slate-700" :class="paperMode ? 'bg-yellow-600/20' : ''">
            <div class="text-xs" :class="paperMode ? 'text-yellow-300' : 'text-slate-400'">🕐 {{ dateString }} {{ timeString }}</div>
            <div class="text-base font-bold text-white mt-1">{{ greeting }}，{{ userName }}{{ t('先生', '', '先生') }}！</div>
            <div v-if="paperMode" class="mt-1 px-2 py-0.5 rounded bg-yellow-500/30 text-yellow-200 text-xs font-bold text-center">
              {{ t('⚠ 模擬盤', '⚠ Paper', '⚠ 模拟盘') }}
            </div>
          </div>
          <!-- Mobile Nav -->
          <nav class="flex-1 py-2 overflow-y-auto">
            <RouterLink
              v-for="item in navItems"
              :key="item.key"
              :to="item.route"
              :class="[
                'w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors',
                isActive(item.route)
                  ? 'bg-blue-600/20 text-white border-l-4 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-700/50 border-l-4 border-transparent'
              ]"
              @click="sidebarOpen = false"
            >
              <span class="text-lg">{{ item.icon }}</span>
              <span>
                <span class="block font-semibold text-sm">{{ item.label }}</span>
                <span class="block text-[10px] opacity-60">{{ item.labelEn }}</span>
              </span>
            </RouterLink>
          </nav>
          <!-- Mobile Logout -->
          <div class="border-t border-slate-600 p-3 bg-slate-900/50">
            <button class="w-full text-left px-4 py-2 text-sm text-white font-medium hover:bg-red-600/30 rounded-lg border border-slate-600" @click="logout">
              🚪 {{ t('退出登錄', 'Logout', '退出登录') }}
            </button>
            <div class="text-center text-xs text-yellow-400 font-bold mt-2">v260622.009</div>
          </div>
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
