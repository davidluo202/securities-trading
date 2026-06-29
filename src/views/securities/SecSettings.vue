<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLanguage, type LangMode } from '../../composables/useLanguage'
const { t, langMode, setLang } = useLanguage()

const notifications = ref(true)
const confirmBeforeOrder = ref(true)
const defaultOrderType = ref('market')
const defaultMarket = ref('HK')

// --- Personal Info (loaded from DB) ---
const userSurname = ref('')
const userFirstname = ref('')
const userName = ref('')
const userSurnameEn = ref('')
const userFirstnameEn = ref('')
const userNameEn = ref('')
const userGender = ref('male')
const userDob = ref('')
const dobYear = ref('')
const dobMonth = ref('')
const dobDay = ref('')
const years = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - 18 - i))
const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const daysInMonth = computed(() => {
  const y = parseInt(dobYear.value) || 2000
  const m = parseInt(dobMonth.value) || 1
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => String(i + 1).padStart(2, '0'))
})
function syncDob() {
  if (dobYear.value && dobMonth.value && dobDay.value) {
    userDob.value = `${dobYear.value}-${dobMonth.value}-${dobDay.value}`
  }
}
const profileSaved = ref(false)
const profileSaving = ref(false)
const userEmail = ref(localStorage.getItem('sec-user-email') || '')

onMounted(async () => {
  if (!userEmail.value) return
  try {
    const res = await fetch(`/api/profile?email=${encodeURIComponent(userEmail.value)}`)
    const data = await res.json()
    if (data.success) {
      if (data.surname) userSurname.value = data.surname
      if (data.firstname) userFirstname.value = data.firstname
      if (data.surname_en) userSurnameEn.value = data.surname_en
      if (data.firstname_en) userFirstnameEn.value = data.firstname_en
      userNameEn.value = ((data.firstname_en || '') + ' ' + (data.surname_en || '')).trim()
      if (data.gender) userGender.value = data.gender
      if (data.dob) {
        userDob.value = data.dob.split('T')[0]
        const parts = userDob.value.split('-')
        if (parts.length === 3) { dobYear.value = parts[0]; dobMonth.value = parts[1]; dobDay.value = parts[2] }
      }
      userName.value = (data.surname || '') + (data.firstname || '')
      if (data.phone) {
        const cc = data.phoneCountry || '+852'
        phoneCountry.value = cc
        phoneNumber.value = data.phone.startsWith(cc) ? data.phone.slice(cc.length) : data.phone
      }
      if (data.phoneVerified) phoneVerified.value = true
      // Sync to localStorage for Layout greeting
      localStorage.setItem('sec-user-surname', userSurname.value)
      localStorage.setItem('sec-user-name', userName.value)
      localStorage.setItem('sec-user-gender', userGender.value)
    }
  } catch { /* silent */ }
})

async function saveAndExit() {
  await saveProfile()
  history.back()
}

async function saveProfile() {
  if (!userEmail.value) return
  profileSaving.value = true
  try {
    const fullName = userSurname.value + userFirstname.value
    userName.value = fullName
    userNameEn.value = ((userFirstnameEn.value || '') + ' ' + (userSurnameEn.value || '')).trim()
    await fetch(`/api/profile?email=${encodeURIComponent(userEmail.value)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surname: userSurname.value,
        firstname: userFirstname.value,
        surname_en: userSurnameEn.value,
        firstname_en: userFirstnameEn.value,
        gender: userGender.value,
        dob: userDob.value || null,
        phone: phoneVerified.value ? (phoneCountry.value + phoneNumber.value.replace(/\s/g, '')) : '',
        phoneCountry: phoneCountry.value,
        phoneVerified: phoneVerified.value,
      }),
    })
    // Sync to localStorage for Layout greeting
    localStorage.setItem('sec-user-surname', userSurname.value)
    localStorage.setItem('sec-user-name', fullName)
    localStorage.setItem('sec-user-gender', userGender.value)
    localStorage.setItem('sec-user-surname-en', userSurnameEn.value)
    localStorage.setItem('sec-user-name-en', userNameEn.value)
    profileSaved.value = true
    setTimeout(() => { profileSaved.value = false }, 2000)
  } catch { /* silent */ }
  finally { profileSaving.value = false }
}

// --- Phone Verification ---
const countryCodes = [
  { code: '+1', label: 'US (+1)', digits: 10 },
  { code: '+852', label: 'HK (+852)', digits: 8 },
  { code: '+86', label: 'CN (+86)', digits: 11 },
  { code: '+853', label: 'MO (+853)', digits: 8 },
  { code: '+65', label: 'SG (+65)', digits: 8 },
  { code: '+61', label: 'AU (+61)', digits: 9 },
  { code: '+81', label: 'JP (+81)', digitsMin: 10, digits: 11 },
  { code: '+82', label: 'KR (+82)', digitsMin: 10, digits: 11 },
  { code: '+44', label: 'UK (+44)', digits: 10 },
] as const

type CountryEntry = typeof countryCodes[number]

const phoneCountry = ref(localStorage.getItem('sec-phone-country') || '+852')
const phoneNumber = ref(localStorage.getItem('sec-phone') || '')
const phoneVerified = ref(localStorage.getItem('sec-phone-verified') === 'true')
const phoneSending = ref(false)
const phoneOtpSent = ref(false)
const phoneOtpToken = ref('')
const phoneOtpCode = ref('')
const phoneVerifying = ref(false)
const phoneError = ref('')

const selectedCountry = computed<CountryEntry>(() =>
  countryCodes.find(c => c.code === phoneCountry.value) || countryCodes[1]
)

const phoneDigitsHint = computed(() => {
  const c = selectedCountry.value
  const min = (c as any).digitsMin
  return min ? `${min}-${c.digits}` : String(c.digits)
})

function validatePhone(): boolean {
  const digits = phoneNumber.value.replace(/\s/g, '')
  if (!/^\d+$/.test(digits)) return false
  const c = selectedCountry.value
  const min = (c as any).digitsMin || c.digits
  return digits.length >= min && digits.length <= c.digits
}

async function sendPhoneOtp() {
  phoneError.value = ''
  if (!validatePhone()) {
    phoneError.value = t(
      `請輸入${phoneDigitsHint.value}位數字`,
      `Please enter ${phoneDigitsHint.value} digits`,
      `请输入${phoneDigitsHint.value}位数字`
    )
    return
  }
  phoneSending.value = true
  try {
    const fullPhone = phoneCountry.value + phoneNumber.value.replace(/\s/g, '')
    const resp = await fetch('/api/sms/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone }),
    })
    const data = await resp.json()
    if (!resp.ok || !data.success) {
      phoneError.value = data.error || t('發送失敗', 'Failed to send', '发送失败')
      return
    }
    phoneOtpToken.value = data.token
    phoneOtpSent.value = true
  } catch {
    phoneError.value = t('網絡錯誤', 'Network error', '网络错误')
  } finally {
    phoneSending.value = false
  }
}

async function verifyPhoneOtp() {
  phoneError.value = ''
  if (phoneOtpCode.value.length !== 6) {
    phoneError.value = t('請輸入6位驗證碼', 'Please enter 6-digit code', '请输入6位验证码')
    return
  }
  phoneVerifying.value = true
  try {
    const resp = await fetch('/api/sms/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: phoneOtpToken.value, code: phoneOtpCode.value }),
    })
    const data = await resp.json()
    if (!resp.ok || !data.success) {
      phoneError.value = data.error || t('驗證失敗', 'Verification failed', '验证失败')
      return
    }
    phoneVerified.value = true
    localStorage.setItem('sec-phone-verified', 'true')
    localStorage.setItem('sec-phone', phoneNumber.value.replace(/\s/g, ''))
    localStorage.setItem('sec-phone-country', phoneCountry.value)
    phoneOtpSent.value = false
    phoneOtpCode.value = ''
  } catch {
    phoneError.value = t('網絡錯誤', 'Network error', '网络错误')
  } finally {
    phoneVerifying.value = false
  }
}

function resetPhoneVerification() {
  phoneVerified.value = false
  phoneOtpSent.value = false
  phoneOtpCode.value = ''
  phoneOtpToken.value = ''
  phoneError.value = ''
  localStorage.removeItem('sec-phone-verified')
}

// --- Bank Accounts ---
interface BankAccount {
  bankName: string
  accountNumber: string
  currency: string
  holderName: string
}

function loadBankAccounts(): BankAccount[] {
  try {
    return JSON.parse(localStorage.getItem('sec-bank-accounts') || '[]')
  } catch { return [] }
}

const bankAccounts = ref<BankAccount[]>(loadBankAccounts())
const showBankForm = ref(false)
const bankFormError = ref('')
const newBank = ref({ bankName: '', accountNumber: '', currency: 'HKD', holderName: '' })

// Auto-fill holder name when opening bank form
function openBankForm() {
  showBankForm.value = true
  // 优先使用英文姓名作为户名
  newBank.value.holderName = userNameEn.value || userName.value || ''
}

const hkBanks = ['HSBC', 'Hang Seng', 'BOC', 'Standard Chartered', 'ICBC Asia', 'CMB Wing Lung', 'DBS', 'Citibank']

function saveBankAccount() {
  bankFormError.value = ''
  newBank.value.holderName = userName.value || newBank.value.holderName
  if (!newBank.value.bankName || !newBank.value.accountNumber || !newBank.value.holderName) {
    bankFormError.value = t('請填寫所有必填項', 'Please fill in all required fields', '请填写所有必填项')
    return
  }
  const acctNum = newBank.value.accountNumber.replace(/\s/g, '')
  if (!/^\d{9,12}$/.test(acctNum)) {
    bankFormError.value = t('賬戶號碼須為9-12位數字', 'Account number must be 9-12 digits', '账户号码须为9-12位数字')
    return
  }
  if (userName.value && newBank.value.holderName !== userName.value) {
    bankFormError.value = t('持有人姓名必須與個人信息中的客戶姓名一致', 'Holder name must match your profile name', '持有人姓名必须与个人信息中的客户姓名一致')
    return
  }
  bankAccounts.value.push({ ...newBank.value, accountNumber: acctNum })
  localStorage.setItem('sec-bank-accounts', JSON.stringify(bankAccounts.value))
  newBank.value = { bankName: '', accountNumber: '', currency: 'HKD', holderName: '' }
  showBankForm.value = false
}

function deleteBankAccount(index: number) {
  bankAccounts.value.splice(index, 1)
  localStorage.setItem('sec-bank-accounts', JSON.stringify(bankAccounts.value))
}

function maskAccount(num: string) {
  if (num.length <= 4) return num
  return '****' + num.slice(-4)
}
</script>

<template>
  <div class="space-y-8 max-w-2xl">
    <div>
      <h2 class="text-2xl font-bold text-slate-900">{{ t('系統設定', 'Settings', '系统设定') }}</h2>
      <p class="text-sm text-slate-500 mt-1">{{ t('個人信息、銀行賬戶和交易偏好', 'Personal info, bank accounts, and trading preferences', '个人信息、银行账户和交易偏好') }}</p>
    </div>

    <!-- Personal Info -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-5">{{ t('個人信息', 'Personal Info', '个人信息') }}</h3>
      <div class="space-y-4">
        <p class="text-xs text-slate-400 mb-2">{{ t('中文姓名', '中文姓名', 'Chinese Name') }}</p>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('姓', 'Last Name (CN)', '姓') }}</label>
            <input v-model="userSurname" type="text" :placeholder="t('如：张', 'e.g. 张', '如：张')" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('名', 'First Name (CN)', '名') }}</label>
            <input v-model="userFirstname" type="text" :placeholder="t('如：三', 'e.g. 三', '如：三')" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>
        </div>
        <p class="text-xs text-slate-400 mb-2 mt-4">{{ t('英文姓名', '英文姓名', 'English Name') }}</p>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('英文姓', 'Last Name (EN)', '英文姓') }}</label>
            <input v-model="userSurnameEn" type="text" placeholder="e.g. Zhang" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('英文名', 'First Name (EN)', '英文名') }}</label>
            <input v-model="userFirstnameEn" type="text" placeholder="e.g. San" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('性別', 'Gender', '性别') }}</label>
          <select v-model="userGender" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
            <option value="male">{{ t('男', 'Male', '男') }}</option>
            <option value="female">{{ t('女', 'Female', '女') }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('出生日期', 'Date of Birth', '出生日期') }} <span class="text-slate-400 font-normal">({{ t('選填', 'Optional', '选填') }})</span></label>
          <div class="flex gap-3">
            <select v-model="dobYear" @change="syncDob()" class="flex-1 border-2 border-slate-300 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
              <option value="">{{ t('年', 'Year', '年') }}</option>
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
            <select v-model="dobMonth" @change="syncDob()" class="flex-1 border-2 border-slate-300 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
              <option value="">{{ t('月', 'Month', '月') }}</option>
              <option v-for="m in months" :key="m" :value="m">{{ m }}{{ t('月', '', '月') }}</option>
            </select>
            <select v-model="dobDay" @change="syncDob()" class="flex-1 border-2 border-slate-300 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
              <option value="">{{ t('日', 'Day', '日') }}</option>
              <option v-for="d in daysInMonth" :key="d" :value="d">{{ d }}{{ t('日', '', '日') }}</option>
            </select>
          </div>
        </div>
        <div class="flex items-center gap-4 pt-1">
          <button class="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all disabled:opacity-50" :disabled="profileSaving" @click="saveProfile">
            {{ profileSaving ? t('保存中...', 'Saving...', '保存中...') : t('保存', 'Save', '保存') }}
          </button>
          <button class="px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 shadow-sm hover:shadow transition-all disabled:opacity-50" :disabled="profileSaving" @click="saveAndExit">
            {{ t('保存並退出', 'Save & Exit', '保存并退出') }}
          </button>
          <span v-if="profileSaved" class="text-green-600 text-sm font-bold">{{ t('已保存', 'Saved', '已保存') }}</span>
        </div>
      </div>
    </div>

    <!-- Phone Verification -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-5">{{ t('手機號碼', 'Phone Number', '手机号码') }}</h3>
      <div class="space-y-4">
        <div class="flex gap-3">
          <div :class="phoneVerified ? 'w-44' : 'w-36'">
            <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('區號', 'Code', '区号') }}</label>
            <select v-model="phoneCountry" :disabled="phoneVerified" class="w-full border-2 border-slate-300 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:bg-slate-100 disabled:text-slate-400">
              <option v-for="c in countryCodes" :key="c.code" :value="c.code">{{ c.label }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="text-sm font-semibold text-slate-700 block mb-2">
              {{ t('手機號碼', 'Phone Number', '手机号码') }}
              <span class="text-slate-400 font-normal">({{ phoneDigitsHint }}{{ t('位', ' digits', '位') }})</span>
            </label>
            <div class="flex gap-3">
              <input
                v-model="phoneNumber"
                type="tel"
                inputmode="numeric"
                :disabled="phoneVerified"
                :placeholder="phoneDigitsHint + t('位數字', ' digits', '位数字')"
                class="flex-1 border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span v-if="phoneVerified" class="flex items-center gap-1.5 text-green-600 font-bold text-sm whitespace-nowrap px-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                {{ t('已驗證', 'Verified', '已验证') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Send OTP / Change -->
        <div v-if="!phoneVerified && !phoneOtpSent" class="flex items-center gap-4 pt-1">
          <button
            class="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all disabled:opacity-50"
            :disabled="phoneSending"
            @click="sendPhoneOtp"
          >
            {{ phoneSending ? t('發送中...', 'Sending...', '发送中...') : t('發送驗證碼', 'Send OTP', '发送验证码') }}
          </button>
        </div>

        <!-- OTP Input -->
        <div v-if="phoneOtpSent && !phoneVerified" class="space-y-3">
          <div>
            <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('驗證碼', 'Verification Code', '验证码') }}</label>
            <input
              v-model="phoneOtpCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              :placeholder="t('輸入6位驗證碼', 'Enter 6-digit code', '输入6位验证码')"
              class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono tracking-widest text-center text-lg"
            />
          </div>
          <div class="flex gap-3">
            <button
              class="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all disabled:opacity-50"
              :disabled="phoneVerifying"
              @click="verifyPhoneOtp"
            >
              {{ phoneVerifying ? t('驗證中...', 'Verifying...', '验证中...') : t('驗證', 'Verify', '验证') }}
            </button>
            <button class="px-6 py-3 border-2 border-slate-300 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors" @click="phoneOtpSent = false; phoneOtpCode = ''; phoneError = ''">
              {{ t('取消', 'Cancel', '取消') }}
            </button>
          </div>
        </div>

        <!-- Change phone -->
        <div v-if="phoneVerified" class="pt-1">
          <button class="text-sm text-blue-600 hover:text-blue-700 font-bold hover:underline" @click="resetPhoneVerification">
            {{ t('更換號碼', 'Change Number', '更换号码') }}
          </button>
        </div>

        <p v-if="phoneError" class="text-red-600 text-sm font-semibold">{{ phoneError }}</p>
      </div>
    </div>

    <!-- Bank Accounts -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-5">{{ t('銀行賬戶', 'Bank Accounts', '银行账户') }}</h3>

      <!-- Saved accounts list -->
      <div v-if="bankAccounts.length > 0" class="space-y-3 mb-5">
        <div v-for="(acct, idx) in bankAccounts" :key="idx" class="flex items-center justify-between border-2 border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 transition-colors">
          <div class="text-base">
            <span class="font-bold text-slate-800">{{ acct.bankName }}</span>
            <span class="text-slate-300 mx-3">|</span>
            <span class="font-mono text-slate-500">{{ maskAccount(acct.accountNumber) }}</span>
            <span class="text-slate-300 mx-3">|</span>
            <span class="text-slate-500">{{ acct.currency }}</span>
            <span class="text-slate-300 mx-3">|</span>
            <span class="text-slate-500">{{ acct.holderName }}</span>
          </div>
          <button class="text-sm text-red-600 hover:text-red-700 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors" @click="deleteBankAccount(idx)">{{ t('刪除', 'Delete', '删除') }}</button>
        </div>
      </div>
      <div v-else class="text-base text-slate-400 mb-5">{{ t('暫無銀行賬戶', 'No bank accounts saved', '暂无银行账户') }}</div>

      <!-- Add bank account button -->
      <button v-if="!showBankForm" class="px-5 py-3 border-2 border-blue-600 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors" @click="openBankForm()">
        {{ t('添加銀行賬戶', 'Add Bank Account', '添加银行账户') }}
      </button>

      <!-- Add bank account form -->
      <div v-if="showBankForm" class="border-2 border-slate-200 rounded-2xl p-6 space-y-4 bg-slate-50">
        <div>
          <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('銀行名稱', 'Bank Name', '银行名称') }}</label>
          <select v-model="newBank.bankName" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white">
            <option value="" disabled>{{ t('請選擇', 'Select', '请选择') }}</option>
            <option v-for="b in hkBanks" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('賬戶號碼', 'Account Number', '账户号码') }}</label>
          <input v-model="newBank.accountNumber" type="text" inputmode="numeric" :placeholder="t('9-12位數字', '9-12 digits', '9-12位数字')" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('幣種', 'Currency', '币种') }}</label>
          <select v-model="newBank.currency" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white">
            <option value="HKD">HKD</option>
            <option value="CNY">CNY</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('持有人姓名', 'Account Holder Name', '持有人姓名') }}</label>
          <input :value="userNameEn || userName || newBank.holderName" readonly
            class="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base bg-slate-50 text-slate-600 cursor-not-allowed" />
          <p class="text-xs text-slate-400 mt-1">{{ t('自動從個人信息帶入', 'Auto-filled from profile', '自动从个人信息带入') }}</p>
        </div>
        <p v-if="bankFormError" class="text-red-600 text-sm font-semibold">{{ bankFormError }}</p>
        <div class="flex gap-3 pt-1">
          <button class="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all" @click="saveBankAccount">
            {{ t('保存', 'Save', '保存') }}
          </button>
          <button class="px-6 py-3 border-2 border-slate-300 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors" @click="showBankForm = false; bankFormError = ''">
            {{ t('取消', 'Cancel', '取消') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Language -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-5">{{ t('語言設定', 'Language', '语言设定') }}</h3>
      <div class="grid grid-cols-2 gap-4">
        <button v-for="l in ([
          { mode: 'zh-TW' as LangMode, label: '繁體中文' },
          { mode: 'zh-CN' as LangMode, label: '简体中文' },
          { mode: 'en' as LangMode, label: 'English' },
          { mode: 'bilingual' as LangMode, label: '雙語 Bilingual' },
        ])" :key="l.mode"
          class="px-5 py-3.5 rounded-xl text-base font-bold border-2 transition-all"
          :class="langMode === l.mode ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'"
          @click="setLang(l.mode)"
        >{{ l.label }}</button>
      </div>
    </div>

    <!-- Trading Preferences -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-5">{{ t('交易偏好', 'Trading Preferences', '交易偏好') }}</h3>
      <div class="space-y-5">
        <div class="flex items-center justify-between py-1">
          <span class="text-base text-slate-700 font-medium">{{ t('下單前確認', 'Confirm Before Order', '下单前确认') }}</span>
          <button
            class="w-12 h-7 rounded-full transition-colors relative"
            :class="confirmBeforeOrder ? 'bg-blue-600' : 'bg-slate-300'"
            @click="confirmBeforeOrder = !confirmBeforeOrder"
          >
            <span class="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform" :class="confirmBeforeOrder ? 'left-5.5' : 'left-0.5'" />
          </button>
        </div>
        <div>
          <label class="text-base text-slate-700 font-medium block mb-2">{{ t('預設委託類型', 'Default Order Type', '默认委托类型') }}</label>
          <select v-model="defaultOrderType" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
            <option value="limit">{{ t('限價單', 'Limit', '限价单') }}</option>
            <option value="market">{{ t('市價單', 'Market', '市价单') }}</option>
          </select>
        </div>
        <div>
          <label class="text-base text-slate-700 font-medium block mb-2">{{ t('預設市場', 'Default Market', '默认市场') }}</label>
          <select v-model="defaultMarket" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
            <option value="HK">{{ t('港股', 'HK Stock', '港股') }}</option>
            <option value="A">{{ t('A股', 'A-Share', 'A股') }}</option>
            <option value="US">{{ t('美股', 'US Stock', '美股') }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-5">{{ t('通知設定', 'Notifications', '通知设定') }}</h3>
      <div class="flex items-center justify-between py-1">
        <span class="text-base text-slate-700 font-medium">{{ t('訂單成交通知', 'Order Fill Notifications', '订单成交通知') }}</span>
        <button
          class="w-12 h-7 rounded-full transition-colors relative"
          :class="notifications ? 'bg-blue-600' : 'bg-slate-300'"
          @click="notifications = !notifications"
        >
          <span class="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform" :class="notifications ? 'left-5.5' : 'left-0.5'" />
        </button>
      </div>
    </div>

    <!-- Account Info -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-5">{{ t('帳戶資訊', 'Account Info', '账户信息') }}</h3>
      <div class="space-y-4">
        <div class="flex justify-between items-center py-2 border-b border-slate-100">
          <span class="text-base text-slate-500">{{ t('帳戶號碼', 'Account No.', '账户号码') }}</span>
          <span class="text-base text-slate-800 font-mono font-bold">SEC-2026-00001</span>
        </div>
        <div class="flex justify-between items-center py-2 border-b border-slate-100">
          <span class="text-base text-slate-500">{{ t('帳戶類型', 'Account Type', '账户类型') }}</span>
          <span class="text-base text-slate-800 font-medium">{{ t('現金帳戶', 'Cash Account', '现金账户') }}</span>
        </div>
        <div class="flex justify-between items-center py-2">
          <span class="text-base text-slate-500">{{ t('開戶日期', 'Open Date', '开户日期') }}</span>
          <span class="text-base text-slate-800 font-medium">2026-01-15</span>
        </div>
      </div>
    </div>
  </div>
</template>
