<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLanguage } from '../../composables/useLanguage'

const { t } = useLanguage()

interface Notification {
  id: string
  date: string
  sender: string
  senderEn: string
  subject: string
  subjectEn: string
  subjectCn: string
  actionRequired: boolean
  actionText?: string
  actionTextEn?: string
  actionTextCn?: string
}

const notifications = ref<Notification[]>([
  {
    id: '1',
    date: '2026-06-20 09:00',
    sender: '系統',
    senderEn: 'System',
    subject: '歡迎使用誠港金融證券交易系統',
    subjectEn: 'Welcome to CM Financial Securities Trading System',
    subjectCn: '欢迎使用诚港金融证券交易系统',
    actionRequired: false,
  },
  {
    id: '2',
    date: '2026-06-21 14:30',
    sender: '資金管理',
    senderEn: 'Funds Management',
    subject: '您的入金申請已提交，等待後台確認',
    subjectEn: 'Your deposit application has been submitted, pending back-office confirmation',
    subjectCn: '您的入金申请已提交，等待后台确认',
    actionRequired: true,
    actionText: '查看詳情',
    actionTextEn: 'View Details',
    actionTextCn: '查看详情',
  },
  {
    id: '3',
    date: '2026-06-22 08:00',
    sender: '交易系統',
    senderEn: 'Trading System',
    subject: '港股市場今日正常交易',
    subjectEn: 'HK stock market trading normally today',
    subjectCn: '港股市场今日正常交易',
    actionRequired: false,
  },
  {
    id: '4',
    date: '2026-06-22 10:15',
    sender: '合規部門',
    senderEn: 'Compliance',
    subject: '請完善您的個人信息和銀行賬戶',
    subjectEn: 'Please complete your personal information and bank account details',
    subjectCn: '请完善您的个人信息和银行账户',
    actionRequired: true,
    actionText: '前往設置',
    actionTextEn: 'Go to Settings',
    actionTextCn: '前往设置',
  },
  {
    id: '5',
    date: '2026-06-22 10:30',
    sender: '系統',
    senderEn: 'System',
    subject: '模擬賬戶已分配 HK$ 1,000,000 虛擬資金',
    subjectEn: 'Paper trading account allocated HK$ 1,000,000 virtual funds',
    subjectCn: '模拟账户已分配 HK$ 1,000,000 虚拟资金',
    actionRequired: false,
  },
])

const readIds = ref<string[]>([])
const STORAGE_KEY = 'sec-notif-read'

// Default read IDs: items 1 and 3 are read by default
const DEFAULT_READ = ['1', '3']

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    readIds.value = JSON.parse(saved)
  } else {
    readIds.value = [...DEFAULT_READ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds.value))
  }
})

function isRead(id: string): boolean {
  return readIds.value.includes(id)
}

function markAsRead(id: string) {
  if (!readIds.value.includes(id)) {
    readIds.value.push(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds.value))
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-bold text-slate-800">{{ t('系統通知', 'Notifications', '系统通知') }}</h1>

    <div class="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        class="px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50"
        :class="{
          'bg-blue-50 border-l-4 border-l-blue-500': !isRead(notif.id),
          'border-l-4 border-l-transparent': isRead(notif.id),
        }"
        @click="markAsRead(notif.id)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="!isRead(notif.id) ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-500'"
              >
                {{ t(notif.sender, notif.senderEn, notif.sender) }}
              </span>
              <span class="text-xs text-slate-400">{{ notif.date }}</span>
            </div>
            <p
              class="text-sm text-slate-800"
              :class="{ 'font-bold': !isRead(notif.id) }"
            >
              {{ t(notif.subject, notif.subjectEn, notif.subjectCn) }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span
              v-if="notif.actionRequired"
              class="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 font-medium whitespace-nowrap"
            >
              {{ t(notif.actionText || '', notif.actionTextEn || '', notif.actionTextCn || '') }}
            </span>
            <span
              v-if="!isRead(notif.id)"
              class="w-2 h-2 rounded-full bg-blue-500 shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
