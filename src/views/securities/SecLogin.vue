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

// Tab: login or register
const tab = ref<'login' | 'register'>('login')

// Paper/Live mode
const paperMode = ref(false)
function toggleMode() { paperMode.value = !paperMode.value }

const cardClass = computed(() =>
  paperMode.value
    ? 'bg-yellow-50 border-2 border-yellow-300'
    : 'bg-white border border-slate-200'
)

// Login form
const loginEmail = ref('')
const loginPassword = ref('')
const loginCaptcha = ref('')
const loginCaptchaImage = ref('') // placeholder for captcha image
const loginError = ref('')
const loginSubmitting = ref(false)

// Register form
const regEmail = ref('')
const regCode = ref('')
const regPassword = ref('')
const regPasswordConfirm = ref('')
const regError = ref('')
const regStep = ref<'email' | 'verify' | 'password'>('email')
const regCountdown = ref(0)
const regSubmitting = ref(false)
let regTimer: ReturnType<typeof setInterval> | null = null

function sendRegCode() {
  if (regCountdown.value > 0 || !regEmail.value) return
  // TODO: call API to send verification code
  regStep.value = 'verify'
  regCountdown.value = 60
  regTimer = setInterval(() => {
    regCountdown.value--
    if (regCountdown.value <= 0) {
      if (regTimer) clearInterval(regTimer)
      regTimer = null
    }
  }, 1000)
}

function verifyRegCode() {
  if (!regCode.value) {
    regError.value = t('請輸入驗證碼', 'Please enter verification code', '请输入验证码')
    return
  }
  // TODO: call API to verify code
  regError.value = ''
  regStep.value = 'password'
}

function handleRegister() {
  regError.value = ''
  if (!regPassword.value || regPassword.value.length < 8) {
    regError.value = t('密碼至少8位', 'Password must be at least 8 characters', '密码至少8位')
    return
  }
  if (regPassword.value !== regPasswordConfirm.value) {
    regError.value = t('兩次密碼不一致', 'Passwords do not match', '两次密码不一致')
    return
  }
  // TODO: call API to register
  regSubmitting.value = true
  setTimeout(() => {
    regSubmitting.value = false
    tab.value = 'login'
    loginEmail.value = regEmail.value
    regStep.value = 'email'
    regEmail.value = ''
    regCode.value = ''
    regPassword.value = ''
    regPasswordConfirm.value = ''
  }, 500)
}

function handleLogin() {
  loginError.value = ''
  if (!loginEmail.value) {
    loginError.value = t('請輸入郵箱', 'Please enter email', '请输入邮箱')
    return
  }
  if (!loginPassword.value) {
    loginError.value = t('請輸入密碼', 'Please enter password', '请输入密码')
    return
  }
  if (!loginCaptcha.value) {
    loginError.value = t('請輸入驗證碼', 'Please enter captcha', '请输入验证码')
    return
  }
  // TODO: call API to login
  loginSubmitting.value = true
  setTimeout(() => {
    loginSubmitting.value = false
    localStorage.setItem('sec-trade-mode', paperMode.value ? 'paper' : 'live')
    localStorage.setItem('sec-authenticated', 'true')
    router.push('/sec')
  }, 500)
}

function refreshCaptcha() {
  // TODO: call API to get new captcha image
  loginCaptchaImage.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center px-4">
    <div class="w-full max-w-lg rounded-2xl shadow-xl p-8 md:p-10 relative" :class="cardClass">
      <!-- Top bar: Language (left) + Live/Paper (right) -->
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
          :class="paperMode ? 'bg-yellow-400 text-yellow-900' : 'bg-blue-600 text-white'"
          @click="toggleMode"
        >
          {{ paperMode ? t('模擬盤 Paper', 'Paper Trade', '模拟盘 Paper') : t('實盤 Live', 'Live Trade', '实盘 Live') }}
        </button>
      </div>

      <!-- Logo -->
      <div class="flex flex-col items-center mb-6 mt-8">
        <img :src="logoSrc" alt="CM Financial" class="h-16 mb-4" />
        <h1 class="text-xl font-bold text-slate-800 text-center">
          {{ t('誠港金融證券交易', 'CM Financial Securities Trading', '诚港金融证券交易') }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('客戶端', 'Client Portal', '客户端') }}</p>
      </div>

      <!-- Tab switcher -->
      <div class="flex mb-6 border-b border-slate-200">
        <button
          class="flex-1 py-2.5 text-sm font-semibold text-center transition-colors"
          :class="tab === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'"
          @click="tab = 'login'"
        >
          {{ t('登入', 'Login', '登录') }}
        </button>
        <button
          class="flex-1 py-2.5 text-sm font-semibold text-center transition-colors"
          :class="tab === 'register' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'"
          @click="tab = 'register'; regStep = 'email'"
        >
          {{ t('註冊', 'Register', '注册') }}
        </button>
      </div>

      <!-- ========== LOGIN TAB ========== -->
      <div v-if="tab === 'login'">
        <!-- Email -->
        <div class="mb-4">
          <label class="block text-sm font-bold text-slate-700 mb-1.5">{{ t('郵箱', 'Email', '邮箱') }}</label>
          <input
            v-model="loginEmail"
            type="email"
            class="w-full px-3 py-2.5 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
            :placeholder="t('請輸入郵箱', 'Enter your email', '请输入邮箱')"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Password -->
        <div class="mb-4">
          <label class="block text-sm font-bold text-slate-700 mb-1.5">{{ t('密碼', 'Password', '密码') }}</label>
          <input
            v-model="loginPassword"
            type="password"
            class="w-full px-3 py-2.5 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
            :placeholder="t('請輸入密碼', 'Enter your password', '请输入密码')"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Captcha -->
        <div class="mb-4">
          <label class="block text-sm font-bold text-slate-700 mb-1.5">{{ t('驗證碼', 'Captcha', '验证码') }}</label>
          <div class="flex gap-2 items-center">
            <input
              v-model="loginCaptcha"
              type="text"
              maxlength="4"
              class="flex-1 px-3 py-2.5 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
              :placeholder="t('請輸入驗證碼', 'Enter captcha', '请输入验证码')"
              @keyup.enter="handleLogin"
            />
            <div
              class="h-10 w-24 bg-slate-200 rounded-lg flex items-center justify-center cursor-pointer text-xs text-slate-500"
              @click="refreshCaptcha"
            >
              {{ loginCaptchaImage ? '' : t('點擊獲取', 'Click', '点击获取') }}
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="loginError" class="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {{ loginError }}
        </div>

        <!-- Login Button -->
        <button
          class="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
          :class="paperMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'"
          :disabled="loginSubmitting"
          @click="handleLogin"
        >
          {{ loginSubmitting ? t('登入中...', 'Logging in...', '登录中...') : t('登入', 'Login', '登录') }}
        </button>
      </div>

      <!-- ========== REGISTER TAB ========== -->
      <div v-if="tab === 'register'">

        <!-- Step 1: Email -->
        <div v-if="regStep === 'email'">
          <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-1.5">{{ t('郵箱', 'Email', '邮箱') }}</label>
            <input
              v-model="regEmail"
              type="email"
              class="w-full px-3 py-2.5 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
              :placeholder="t('請輸入郵箱', 'Enter your email', '请输入邮箱')"
            />
          </div>
          <button
            class="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            :disabled="!regEmail"
            @click="sendRegCode"
          >
            {{ t('發送驗證碼', 'Send Verification Code', '发送验证码') }}
          </button>
        </div>

        <!-- Step 2: Verify code -->
        <div v-if="regStep === 'verify'">
          <p class="text-sm text-slate-600 mb-4">
            {{ t('驗證碼已發送至', 'Verification code sent to', '验证码已发送至') }} <span class="font-semibold">{{ regEmail }}</span>
          </p>
          <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-1.5">{{ t('驗證碼', 'Verification Code', '验证码') }}</label>
            <input
              v-model="regCode"
              type="text"
              maxlength="6"
              class="w-full px-3 py-2.5 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white tracking-widest text-center text-lg"
              :placeholder="t('請輸入6位驗證碼', 'Enter 6-digit code', '请输入6位验证码')"
            />
          </div>
          <div v-if="regError" class="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ regError }}</div>
          <button
            class="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            @click="verifyRegCode"
          >
            {{ t('驗證', 'Verify', '验证') }}
          </button>
          <button
            class="w-full mt-2 py-2 text-sm text-slate-500 hover:text-slate-700"
            :disabled="regCountdown > 0"
            @click="sendRegCode"
          >
            {{ regCountdown > 0 ? `${t('重新發送', 'Resend', '重新发送')} (${regCountdown}s)` : t('重新發送驗證碼', 'Resend Code', '重新发送验证码') }}
          </button>
        </div>

        <!-- Step 3: Set password -->
        <div v-if="regStep === 'password'">
          <p class="text-sm text-green-600 mb-4 bg-green-50 rounded-lg px-3 py-2">
            ✓ {{ t('郵箱驗證通過，請設置密碼', 'Email verified. Please set your password', '邮箱验证通过，请设置密码') }}
          </p>
          <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-1.5">{{ t('設置密碼', 'Set Password', '设置密码') }}</label>
            <input
              v-model="regPassword"
              type="password"
              class="w-full px-3 py-2.5 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
              :placeholder="t('至少8位字符', 'At least 8 characters', '至少8位字符')"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-1.5">{{ t('確認密碼', 'Confirm Password', '确认密码') }}</label>
            <input
              v-model="regPasswordConfirm"
              type="password"
              class="w-full px-3 py-2.5 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
              :placeholder="t('再次輸入密碼', 'Re-enter password', '再次输入密码')"
            />
          </div>
          <div v-if="regError" class="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ regError }}</div>
          <button
            class="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            :disabled="regSubmitting"
            @click="handleRegister"
          >
            {{ regSubmitting ? t('註冊中...', 'Registering...', '注册中...') : t('完成註冊', 'Complete Registration', '完成注册') }}
          </button>
        </div>
      </div>

      <!-- Version -->
      <p class="text-center text-xs text-slate-400 mt-6">v260622.002</p>
    </div>
  </div>
</template>
