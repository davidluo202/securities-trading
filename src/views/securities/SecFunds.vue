<script setup lang="ts">
import { ref } from 'vue'
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
function maskAccount(num: string) {
  if (num.length <= 4) return num
  return '****' + num.slice(-4)
}

// Deposit flow
const showDeposit = ref(false)
const depositAmount = ref('')
const depositSubmitted = ref(false)

function submitDeposit() {
  if (!depositAmount.value || parseFloat(depositAmount.value) <= 0) return
  depositSubmitted.value = true
  setTimeout(() => {
    depositSubmitted.value = false
    showDeposit.value = false
    depositAmount.value = ''
  }, 2000)
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('資金管理', 'Funds', '资金管理') }}</h2>

    <!-- Paper Mode -->
    <template v-if="isPaper">
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-semibold text-yellow-800">{{ t('模擬資金', 'Virtual Funds', '模拟资金') }}</span>
          <span class="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">{{ t('模擬盤', 'Paper', '模拟盘') }}</span>
        </div>
        <p class="text-2xl font-bold text-yellow-900">HK$ 1,000,000.00</p>
        <p class="text-xs text-yellow-700 mt-2">{{ t('模擬交易資金，不涉及真實金額', 'Virtual funds for paper trading, no real money involved', '模拟交易资金，不涉及真实金额') }}</p>
      </div>
    </template>

    <!-- Live Mode -->
    <template v-else>
      <!-- Balance Card -->
      <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-semibold text-slate-700">HKD</span>
          <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{{ t('活期', 'Cash', '活期') }}</span>
        </div>
        <p class="text-xl font-bold text-slate-800 mb-3">0.00</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-slate-400">{{ t('可用', 'Available', '可用') }}</span>
            <p class="text-slate-700 font-medium">0.00</p>
          </div>
          <div>
            <span class="text-slate-400">{{ t('凍結', 'Frozen', '冻结') }}</span>
            <p class="text-slate-700 font-medium">0.00</p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          class="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          @click="showDeposit = !showDeposit"
        >
          {{ t('入金', 'Deposit', '入金') }}
        </button>
      </div>

      <!-- Deposit Form -->
      <div v-if="showDeposit" class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">{{ t('入金申請', 'Deposit Request', '入金申请') }}</h3>

        <!-- No bank accounts -->
        <div v-if="bankAccounts.length === 0" class="text-center py-4">
          <p class="text-slate-400 text-sm mb-3">{{ t('請先在設置中添加銀行賬戶', 'Please add a bank account in Settings first', '请先在设置中添加银行账户') }}</p>
          <RouterLink to="/sec/settings" class="inline-block px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            {{ t('前往設置', 'Go to Settings', '前往设置') }}
          </RouterLink>
        </div>

        <div v-else-if="depositSubmitted" class="text-center py-4">
          <p class="text-green-600 text-sm font-medium">{{ t('申請已提交，請等待審核', 'Request submitted, pending review', '申请已提交，请等待审核') }}</p>
        </div>
        <div v-else class="space-y-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">{{ t('轉入銀行賬戶', 'From Bank Account', '转入银行账户') }}</label>
            <select v-model="selectedBankIndex" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
              <option v-for="(acct, idx) in bankAccounts" :key="idx" :value="idx">
                {{ acct.bankName }} - {{ maskAccount(acct.accountNumber) }} ({{ acct.currency }})
              </option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">{{ t('金額 (HKD)', 'Amount (HKD)', '金额 (HKD)') }}</label>
            <input
              v-model="depositAmount"
              type="number"
              min="0"
              step="1000"
              placeholder="0.00"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button
            class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            @click="submitDeposit"
          >
            {{ t('提交', 'Submit', '提交') }}
          </button>
        </div>
      </div>

      <!-- Empty transactions -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100">
        <div class="px-5 py-4 border-b border-slate-100">
          <h3 class="text-sm font-semibold text-slate-700">{{ t('近期資金記錄', 'Recent Transactions', '近期资金记录') }}</h3>
        </div>
        <div class="px-5 py-6 text-center text-sm text-slate-400">
          {{ t('暫無記錄', 'No transactions yet', '暂无记录') }}
        </div>
      </div>
    </template>
  </div>
</template>
