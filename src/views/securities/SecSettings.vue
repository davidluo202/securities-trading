<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage, type LangMode } from '../../composables/useLanguage'
const { t, langMode, setLang } = useLanguage()

const notifications = ref(true)
const confirmBeforeOrder = ref(true)
const defaultOrderType = ref('limit')
const defaultMarket = ref('HK')

// --- Personal Info ---
const userName = ref(localStorage.getItem('sec-user-name') || '')
const userGender = ref(localStorage.getItem('sec-user-gender') || 'male')
const userDob = ref(localStorage.getItem('sec-user-dob') || '')
const profileSaved = ref(false)

function saveProfile() {
  localStorage.setItem('sec-user-name', userName.value)
  localStorage.setItem('sec-user-gender', userGender.value)
  if (userDob.value) localStorage.setItem('sec-user-dob', userDob.value)
  else localStorage.removeItem('sec-user-dob')
  profileSaved.value = true
  setTimeout(() => { profileSaved.value = false }, 2000)
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

const hkBanks = ['HSBC', 'Hang Seng', 'BOC', 'Standard Chartered', 'ICBC Asia', 'CMB Wing Lung', 'DBS', 'Citibank']

function saveBankAccount() {
  bankFormError.value = ''
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
        <div>
          <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('客戶姓名', 'Name', '客户姓名') }}</label>
          <input v-model="userName" type="text" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
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
          <input v-model="userDob" type="date" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
        </div>
        <div class="flex items-center gap-4 pt-1">
          <button class="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all" @click="saveProfile">
            {{ t('保存', 'Save', '保存') }}
          </button>
          <span v-if="profileSaved" class="text-green-600 text-sm font-bold">{{ t('已保存', 'Saved', '已保存') }}</span>
        </div>
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
      <button v-if="!showBankForm" class="px-5 py-3 border-2 border-blue-600 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors" @click="showBankForm = true">
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
          <input v-model="newBank.holderName" type="text" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
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
