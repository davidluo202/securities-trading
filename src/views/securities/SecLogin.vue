<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage, type LangMode } from '../../composables/useLanguage'
import { APP_VERSION } from '../../version'

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

// Mode
const paperMode = ref(false)
function toggleMode() { paperMode.value = !paperMode.value }

const cardClass = computed(() =>
  paperMode.value
    ? 'bg-yellow-50 border-2 border-yellow-300'
    : 'bg-white border border-gray-300'
)

// Tab
const tab = ref<'login' | 'register'>('login')

// --- LOGIN ---
const loginEmail = ref('')
const loginPassword = ref('')
const loginCaptcha = ref('')
const loginCaptchaToken = ref('')
const loginCaptchaImage = ref('')
const loginError = ref('')
const loginSubmitting = ref(false)

async function loadCaptcha() {
  loginCaptcha.value = ''
  try {
    const res = await fetch('/api/captcha')
    const data = await res.json()
    loginCaptchaToken.value = data.captchaToken
    loginCaptchaImage.value = data.image
  } catch {
    loginCaptchaImage.value = ''
  }
}

onMounted(loadCaptcha)

function handleLogin() {
  loginError.value = ''
  if (!loginEmail.value) { loginError.value = t('請輸入郵箱', 'Please enter email', '请输入邮箱'); return }
  if (!loginPassword.value) { loginError.value = t('請輸入密碼', 'Please enter password', '请输入密码'); return }
  if (!loginCaptcha.value || loginCaptcha.value.length < 4) { loginError.value = t('請輸入驗證碼', 'Please enter captcha', '请输入验证码'); return }

  // TODO: call backend login API
  loginSubmitting.value = true
  setTimeout(() => {
    loginSubmitting.value = false
    localStorage.setItem('sec-trade-mode', paperMode.value ? 'paper' : 'live')
    localStorage.setItem('sec-authenticated', 'true')
    router.push('/sec')
  }, 500)
}

// --- REGISTER ---
const regEmail = ref('')
const regCode = ref('')
const regPassword = ref('')
const regPasswordConfirm = ref('')
const regError = ref('')
const regToken = ref('')
const regStep = ref<'email' | 'verify' | 'password'>('email')
const regCountdown = ref(0)
const regSubmitting = ref(false)
let regTimer: ReturnType<typeof setInterval> | null = null

async function sendRegCode() {
  if (regCountdown.value > 0 || !regEmail.value) return
  regError.value = ''
  regSubmitting.value = true
  try {
    const res = await fetch('/api/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regEmail.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    regToken.value = data.token
    regStep.value = 'verify'
  } catch (e: any) {
    regError.value = e.message || t('發送失敗', 'Failed to send', '发送失败')
    regSubmitting.value = false
    return
  }
  regSubmitting.value = false
  regCountdown.value = 60
  regTimer = setInterval(() => {
    regCountdown.value--
    if (regCountdown.value <= 0) { if (regTimer) clearInterval(regTimer); regTimer = null }
  }, 1000)
}

async function verifyRegCode() {
  if (!regCode.value) { regError.value = t('請輸入驗證碼', 'Please enter code', '请输入验证码'); return }
  regError.value = ''
  regSubmitting.value = true
  try {
    const res = await fetch('/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: regToken.value, code: regCode.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Verification failed')
    regStep.value = 'password'
  } catch (e: any) {
    regError.value = e.message || t('驗證失敗', 'Verification failed', '验证失败')
  }
  regSubmitting.value = false
}

function handleRegister() {
  regError.value = ''
  if (!regPassword.value || regPassword.value.length < 8) { regError.value = t('密碼至少8位', 'Password must be at least 8 characters', '密码至少8位'); return }
  if (regPassword.value !== regPasswordConfirm.value) { regError.value = t('兩次密碼不一致', 'Passwords do not match', '两次密码不一致'); return }
  // TODO: call backend register API
  regSubmitting.value = true
  setTimeout(() => {
    regSubmitting.value = false
    tab.value = 'login'
    loginEmail.value = regEmail.value
    regStep.value = 'email'; regEmail.value = ''; regCode.value = ''; regPassword.value = ''; regPasswordConfirm.value = ''
  }, 500)
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <main class="flex-1 flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-lg rounded-2xl shadow-xl p-8 md:p-12 relative" :class="cardClass">
        <!-- Language + Paper mode inside card -->
        <div class="flex justify-between items-center mb-6">
          <select
            :value="langMode"
            @change="setLang(($event.target as HTMLSelectElement).value as LangMode)"
            class="text-base border-2 border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-700 font-medium"
          >
            <option v-for="opt in langOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <button
            class="px-5 py-2.5 rounded-xl text-base font-bold transition-colors"
            :class="paperMode ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500' : 'bg-blue-600 text-white hover:bg-blue-700'"
            @click="toggleMode"
          >
            {{ paperMode ? t('模擬盤 Paper', 'Paper Trade', '模拟盘 Paper') : t('實盤 Live', 'Live Trade', '实盘 Live') }}
          </button>
        </div>

        <!-- Logo & Title -->
        <div class="text-center mb-10">
          <img :src="logoSrc" alt="CM Financial" class="h-20 w-auto mx-auto mb-6" />
          <p class="text-2xl md:text-3xl font-bold text-gray-900">
            {{ t('誠港金融證券交易', 'CM Financial Securities Trading', '诚港金融证券交易') }}
          </p>
          <p class="text-lg md:text-xl font-bold text-gray-700 mt-2">
            {{ t('客戶端 Client Portal', 'Client Portal', '客户端 Client Portal') }}
          </p>
          <div v-if="paperMode" class="mt-3 inline-block bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
            {{ t('模擬交易模式', 'Paper Trade Mode', '模拟交易模式') }}
          </div>
        </div>

        <!-- ========== LOGIN ========== -->
        <div v-if="tab === 'login'">
          <div v-if="loginError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ loginError }}</div>

          <div class="mb-5">
            <label class="block text-base font-bold text-gray-800 mb-2">{{ t('郵箱', 'Email', '邮箱') }}</label>
            <input v-model="loginEmail" type="email" :placeholder="t('請輸入郵箱', 'Enter your email', '请输入邮箱')"
              class="w-full border-2 border-gray-500 rounded-lg px-4 py-3.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
              @keyup.enter="handleLogin" />
          </div>

          <div class="mb-5">
            <label class="block text-base font-bold text-gray-800 mb-2">{{ t('密碼', 'Password', '密码') }}</label>
            <input v-model="loginPassword" type="password" :placeholder="t('請輸入密碼', 'Enter password', '请输入密码')"
              class="w-full border-2 border-gray-500 rounded-lg px-4 py-3.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
              @keyup.enter="handleLogin" />
          </div>

          <div class="mb-5">
            <label class="block text-base font-bold text-gray-800 mb-2">{{ t('驗證碼', 'Captcha', '验证码') }}</label>
            <div class="flex gap-2 items-center">
              <input v-model="loginCaptcha" type="text" maxlength="4" :placeholder="t('驗證碼', 'Code', '验证码')"
                class="w-28 border-2 border-gray-500 rounded-lg px-3 py-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white tracking-widest text-center uppercase"
                autocapitalize="characters" style="text-transform: uppercase;"
                @input="loginCaptcha = loginCaptcha.toUpperCase()"
                @keyup.enter="handleLogin" />
              <img v-if="loginCaptchaImage" :src="loginCaptchaImage" alt="captcha"
                class="h-11 rounded-lg border cursor-pointer shrink-0" @click="loadCaptcha" />
              <div v-else class="h-11 w-24 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 cursor-pointer shrink-0" @click="loadCaptcha">
                {{ t('載入中', 'Load', '加载') }}
              </div>
            </div>
          </div>

          <button
            class="w-full py-3.5 rounded-lg text-lg font-bold text-white transition-colors disabled:opacity-50"
            :class="paperMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'"
            :disabled="loginSubmitting"
            @click="handleLogin"
          >
            {{ loginSubmitting ? '...' : t('登錄', 'Sign in', '登录') }}
          </button>

          <div class="text-center mt-5 space-y-2">
            <p class="text-sm text-gray-600">
              {{ t('沒有賬戶？', "Don't have an account?", '没有账户？') }}
              <a class="text-blue-600 font-semibold cursor-pointer" @click="tab = 'register'; regStep = 'email'">
                {{ t('註冊', 'Register', '注册') }}
              </a>
            </p>
            <p class="text-sm">
              <a class="text-gray-500 cursor-pointer hover:text-gray-700">
                {{ t('忘記密碼？', 'Forgot Password?', '忘记密码？') }}
              </a>
            </p>
          </div>
        </div>

        <!-- ========== REGISTER ========== -->
        <div v-if="tab === 'register'">
          <div v-if="regError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ regError }}</div>

          <!-- Step 1: Email -->
          <div v-if="regStep === 'email'">
            <div class="mb-5">
              <label class="block text-base font-bold text-gray-800 mb-2">{{ t('郵箱', 'Email', '邮箱') }}</label>
              <input v-model="regEmail" type="email" :placeholder="t('請輸入郵箱', 'Enter your email', '请输入邮箱')"
                class="w-full border-2 border-gray-500 rounded-lg px-4 py-3.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white" />
            </div>
            <button class="w-full py-3.5 rounded-lg text-lg font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              :disabled="!regEmail || regSubmitting" @click="sendRegCode">
              {{ regSubmitting ? '...' : t('發送驗證碼', 'Send Verification Code', '发送验证码') }}
            </button>
          </div>

          <!-- Step 2: Verify -->
          <div v-if="regStep === 'verify'">
            <p class="text-sm text-gray-600 mb-4">{{ t('驗證碼已發送至', 'Code sent to', '验证码已发送至') }} <strong>{{ regEmail }}</strong></p>
            <div class="mb-5">
              <label class="block text-base font-bold text-gray-800 mb-2">{{ t('驗證碼', 'Verification Code', '验证码') }}</label>
              <input v-model="regCode" type="text" maxlength="6"
                class="w-full border-2 border-gray-500 rounded-lg px-4 py-3.5 text-xl text-center tracking-widest outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white"
                :placeholder="t('6位驗證碼', '6-digit code', '6位验证码')" />
            </div>
            <button class="w-full py-3.5 rounded-lg text-lg font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              :disabled="regSubmitting" @click="verifyRegCode">
              {{ regSubmitting ? '...' : t('驗證', 'Verify', '验证') }}
            </button>
            <button class="w-full mt-2 py-2 text-sm text-gray-500" :disabled="regCountdown > 0" @click="sendRegCode">
              {{ regCountdown > 0 ? `${t('重新發送', 'Resend', '重新发送')} (${regCountdown}s)` : t('重新發送驗證碼', 'Resend Code', '重新发送验证码') }}
            </button>
          </div>

          <!-- Step 3: Password -->
          <div v-if="regStep === 'password'">
            <p class="text-sm text-green-600 mb-4 bg-green-50 rounded-lg px-3 py-2">✓ {{ t('郵箱驗證通過', 'Email verified', '邮箱验证通过') }}</p>
            <div class="mb-4">
              <label class="block text-base font-bold text-gray-800 mb-2">{{ t('設置密碼', 'Set Password', '设置密码') }}</label>
              <input v-model="regPassword" type="password" :placeholder="t('至少8位字符', 'At least 8 characters', '至少8位字符')"
                class="w-full border-2 border-gray-500 rounded-lg px-4 py-3.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white" />
            </div>
            <div class="mb-5">
              <label class="block text-base font-bold text-gray-800 mb-2">{{ t('確認密碼', 'Confirm Password', '确认密码') }}</label>
              <input v-model="regPasswordConfirm" type="password" :placeholder="t('再次輸入密碼', 'Re-enter password', '再次输入密码')"
                class="w-full border-2 border-gray-500 rounded-lg px-4 py-3.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 bg-white" />
            </div>
            <button class="w-full py-3.5 rounded-lg text-lg font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              :disabled="regSubmitting" @click="handleRegister">
              {{ regSubmitting ? '...' : t('完成註冊', 'Complete Registration', '完成注册') }}
            </button>
          </div>

          <p class="text-center mt-5 text-sm text-gray-600">
            {{ t('已有賬戶？', 'Already have an account?', '已有账户？') }}
            <a class="text-blue-600 font-semibold cursor-pointer" @click="tab = 'login'">{{ t('登入', 'Login', '登录') }}</a>
          </p>
        </div>

        <p class="text-center text-sm font-bold text-blue-600 mt-6 tracking-wide">{{ APP_VERSION }}</p>
      </div>
    </main>
  </div>
</template>
