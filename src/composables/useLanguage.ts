import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export type LangMode = 'zh-TW' | 'zh-CN' | 'en' | 'bilingual'

const langMode = useLocalStorage<LangMode>('sec-lang', 'zh-TW')

export function useLanguage() {
  function t(tw: string, en: string, cn?: string): string {
    const c = cn ?? tw
    switch (langMode.value) {
      case 'zh-TW':
        return tw
      case 'zh-CN':
        return c
      case 'en':
        return en
      case 'bilingual':
        return `${tw} ${en}`
    }
  }

  function setLang(mode: LangMode) {
    langMode.value = mode
  }

  const langLabel = computed(() => {
    const map: Record<LangMode, string> = {
      'zh-TW': '繁',
      'zh-CN': '简',
      en: 'EN',
      bilingual: '雙',
    }
    return map[langMode.value]
  })

  return { langMode, t, setLang, langLabel }
}
