<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const isPaper = localStorage.getItem('sec-trade-mode') === 'paper'

// Bank accounts from settings
interface BankAccount {
  bankName: string
  accountNumber: string
  currency: string
  holderName: string
}
function loadBankAccounts(): BankAccount[] {
  try { return JSON.parse(localStorage.getItem('sec-bank-accounts') || '[]') } catch { return [] }
}
const bankAccounts = ref<BankAccount[]>(loadBankAccounts())
const selectedBankIndex = ref(bankAccounts.value.length > 0 ? 0 : -1)
const selectedCurrency = computed(() => {
  const idx = selectedBankIndex.value
  if (idx >= 0 && idx < bankAccounts.value.length) return bankAccounts.value[idx].currency
  return 'HKD'
})
function maskAccount(num: string) {
  if (num.length <= 4) return num
  return '****' + num.slice(-4)
}

// Deposit flow
const showDeposit = ref(false)
const depositAmount = ref('')
const depositDisplay = ref('')
const depositSubmitted = ref(false)

function formatAmountInput(val: string, addDecimals = false) {
  const num = val.replace(/[^0-9.]/g, '')
  if (!num) return ''
  const parts = num.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (addDecimals) {
    const dec = parts.length > 1 ? parts[1].slice(0, 2).padEnd(2, '0') : '00'
    return intPart + '.' + dec
  }
  const decPart = parts.length > 1 ? '.' + parts[1].slice(0, 2) : ''
  return intPart + decPart
}
function onAmountInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/,/g, '')
  depositAmount.value = raw
  depositDisplay.value = formatAmountInput(raw)
}
function onAmountBlur() {
  if (depositAmount.value) {
    depositDisplay.value = formatAmountInput(depositAmount.value, true)
  }
}

async function submitDeposit() {
  if (!depositAmount.value || parseFloat(depositAmount.value) <= 0) return
  const userEmail = localStorage.getItem('sec-user-email') || ''
  try {
    // Look up client ID by email
    const clientRes = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`)
    const clientData = await clientRes.json()
    const clientId = clientData?.data?.client_id || clientData?.data?.id
    if (clientId) {
      await fetch('/api/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          type: 'deposit',
          amount: depositAmount.value,
          currency: selectedCurrency.value,
          bankName: selectedBankIndex.value >= 0 ? bankAccounts.value[selectedBankIndex.value]?.bankName : '',
          remarks: '证券系统入金',
        }),
      })
    }
  } catch { /* silent - also save to localStorage as fallback */ }
  // Keep localStorage fallback
  try {
    const txns = JSON.parse(localStorage.getItem('sec-fund-transactions') || '[]')
    const now = new Date()
    txns.unshift({
      type: 'deposit',
      amount: depositAmount.value,
      currency: selectedCurrency.value,
      status: 'pending',
      date: now.toISOString().replace('T', ' ').slice(0, 19),
    })
    localStorage.setItem('sec-fund-transactions', JSON.stringify(txns))
  } catch { /* silent */ }
  depositSubmitted.value = true
  setTimeout(() => {
    depositSubmitted.value = false
    showDeposit.value = false
    depositAmount.value = ''
    depositDisplay.value = ''
  }, 2000)
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-2xl font-bold text-slate-900">{{ t('資金管理', 'Funds', '资金管理') }}</h2>
      <p class="text-sm text-slate-500 mt-1">{{ t('管理您的帳戶資金', 'Manage your account funds', '管理您的账户资金') }}</p>
    </div>

    <!-- Paper Mode -->
    <template v-if="isPaper">
      <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="text-base font-semibold opacity-90">{{ t('模擬資金', 'Virtual Funds', '模拟资金') }}</span>
          </div>
          <span class="text-xs bg-white/20 text-white px-3 py-1 rounded-lg font-bold">{{ t('模擬盤', 'Paper', '模拟盘') }}</span>
        </div>
        <p class="text-3xl font-bold">HK$ 1,000,000.00</p>
        <p class="text-sm opacity-80 mt-2">{{ t('模擬交易資金，不涉及真實金額', 'Virtual funds for paper trading, no real money involved', '模拟交易资金，不涉及真实金额') }}</p>
      </div>
    </template>

    <!-- Live Mode -->
    <template v-else>
      <!-- Balance Card -->
      <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="text-base font-semibold opacity-90">HKD</span>
          </div>
          <span class="text-xs bg-white/20 text-white px-3 py-1 rounded-lg font-bold">{{ t('活期', 'Cash', '活期') }}</span>
        </div>
        <p class="text-3xl font-bold mb-4">0.00</p>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white/10 rounded-xl px-4 py-3">
            <span class="text-sm opacity-80">{{ t('可用', 'Available', '可用') }}</span>
            <p class="text-lg font-bold mt-0.5">0.00</p>
          </div>
          <div class="bg-white/10 rounded-xl px-4 py-3">
            <span class="text-sm opacity-80">{{ t('凍結', 'Frozen', '冻结') }}</span>
            <p class="text-lg font-bold mt-0.5">0.00</p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4">
        <button
          class="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all"
          @click="showDeposit = !showDeposit"
        >
          {{ t('入金', 'Deposit', '入金') }}
        </button>
      </div>

      <!-- Deposit Form -->
      <div v-if="showDeposit" class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800 mb-5">{{ t('入金申請', 'Deposit Request', '入金申请') }}</h3>

        <!-- No bank accounts -->
        <div v-if="bankAccounts.length === 0" class="text-center py-6">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          <p class="text-slate-400 text-base mb-4">{{ t('請先在設置中添加銀行賬戶', 'Please add a bank account in Settings first', '请先在设置中添加银行账户') }}</p>
          <RouterLink to="/sec/settings" class="inline-block px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all">
            {{ t('前往設置', 'Go to Settings', '前往设置') }}
          </RouterLink>
        </div>

        <div v-else-if="depositSubmitted" class="text-center py-8">
          <svg class="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p class="text-green-600 text-base font-bold">{{ t('申請已提交，請等待審核', 'Request submitted, pending review', '申请已提交，请等待审核') }}</p>
        </div>
        <div v-else class="space-y-5">
          <!-- Step 1 -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center">1</span>
              <label class="text-sm font-semibold text-slate-700">{{ t('轉入銀行賬戶', 'From Bank Account', '转入银行账户') }}</label>
            </div>
            <select v-model="selectedBankIndex" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
              <option v-for="(acct, idx) in bankAccounts" :key="idx" :value="idx">
                {{ acct.bankName }} - {{ maskAccount(acct.accountNumber) }} ({{ acct.currency }})
              </option>
            </select>
          </div>
          <!-- Step 2 -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center">2</span>
              <label class="text-sm font-semibold text-slate-700">{{ t('金額', 'Amount', '金额') }} ({{ selectedCurrency }})</label>
            </div>
            <input
              :value="depositDisplay"
              @input="onAmountInput"
              @blur="onAmountBlur"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              class="max-w-[240px] border-2 border-slate-600 rounded-xl px-4 py-3 text-lg font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-right"
            />
          </div>
          <button
            class="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 shadow-sm hover:shadow transition-all"
            @click="submitDeposit"
          >
            {{ t('提交', 'Submit', '提交') }}
          </button>
        </div>
      </div>

      <!-- Empty transactions -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div class="px-6 py-5 border-b border-slate-200">
          <h3 class="text-lg font-semibold text-slate-800">{{ t('近期資金記錄', 'Recent Transactions', '近期资金记录') }}</h3>
        </div>
        <div class="px-6 py-10 text-center">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <p class="text-base text-slate-400">{{ t('暫無記錄', 'No transactions yet', '暂无记录') }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
