import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingState {
  theme: 'light' | 'dark'
  language: 'zh' | 'en'
  sidebarCollapsed: boolean
  toggleTheme: () => void
  setLanguage: (lang: 'zh' | 'en') => void
  toggleSidebar: () => void
}

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'zh',
      sidebarCollapsed: false,
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'x-ui-settings',
    }
  )
)
