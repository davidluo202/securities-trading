<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage, type LangMode } from '../../composables/useLanguage'

const router = useRouter()
const { t, langMode, setLang } = useLanguage()

const langOptions: { value: LangMode; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'bilingual', label: '中英對照' },
]

const logoSrc = computed(() => {
  if (langMode.value === 'en' || langMode.value === 'bilingual') return '/logo-en-black.jpg'
  return '/logo-zh.jpg'
})

const email = ref('')
const code = ref('')
const error = ref('')
const paperMode = ref(false)
const countdown = ref(0)
const sending = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const cardClass = computed(() =>
  paperMode.value
    ? 'bg-yellow-50 border border-yellow-300'
    : 'bg-white border border-slate-200'
)

function toggleMode() {
  paperMode.value = !paperMode.value
}

function sendCode() {
  if (countdown.value > 0 || !email.value) return
  sending.value = true
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer) clearInterval(timer)
      timer = null
      sending.value = false
    }
  }, 1000)
}

function handleLogin() {
  error.value = ''
  if (!email.value) {
    error.value = t('請輸入郵箱', 'Please enter email', '请输入邮箱')
    return
  }
  if (!code.value) {
    error.value = t('請輸入驗證碼', 'Please enter verification code', '请输入验证码')
    return
  }
  localStorage.setItem('sec-trade-mode', paperMode.value ? 'paper' : 'live')
  localStorage.setItem('sec-authenticated', 'true')
  router.push('/sec')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center px-4">
    <div class="w-full max-w-md rounded-2xl shadow-xl p-8 relative" :class="cardClass">
      <!-- Top bar: Language selector (left) + Live/Paper Toggle (right) -->
      <div class="absolute top-4 left-4">
        <select
          :value="langMode"
          @change="setLang(($event.target as HTMLSelectElement).value as LangMode)"
          class="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 cursor-pointer"
        >
          <option v-for="opt in langOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <div class="absolute top-4 right-4">
        <button
          class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
          :class="paperMode
            ? 'bg-yellow-400 text-yellow-900'
            : 'bg-blue-600 text-white'"
          @click="toggleMode"
        >
          {{ paperMode ? t('模擬盤 Paper', 'Paper', '模拟盘 Paper') : t('實盤 Live', 'Live', '实盘 Live') }}
        </button>
      </div>

      <!-- Logo (changes with language) -->
      <div class="flex flex-col items-center mb-6 mt-8">
        <img :src="logoSrc" alt="CM Financial" class="h-14 mb-4" />
        <h1 class="text-xl font-bold text-slate-800 text-center">
          {{ t('誠港金融證券交易', 'CM Financial Securities Trading', '诚港金融证券交易') }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('客戶端', 'Client Portal', '客户端') }}</p>
      </div>

      <!-- Email -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-slate-700 mb-1">
          {{ t('郵箱', 'Email', '邮箱') }}
        </label>
        <input
          v-model="email"
          type="email"
          class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          :placeholder="t('請輸入郵箱', 'Enter your email', '请输入邮箱')"
        />
      </div>

      <!-- Verification Code -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-slate-700 mb-1">
          {{ t('驗證碼', 'Verification Code', '验证码') }}
        </label>
        <div class="flex gap-2">
          <input
            v-model="code"
            type="text"
            class="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            :placeholder="t('請輸入驗證碼', 'Enter code', '请输入验证码')"
          />
          <button
            class="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            :class="countdown > 0 || !email
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'"
            :disabled="countdown > 0 || !email"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : t('發送驗證碼', 'Send Code', '发送验证码') }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
        {{ error }}
      </div>

      <!-- Login Button -->
      <button
        class="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
        :class="paperMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'"
        @click="handleLogin"
      >
        {{ t('登入', 'Login', '登录') }}
      </button>
    </div>
  </div>
</template>
