import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  token: string | null
  login: (username: string, token?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      token: null,
      login: (username: string, token?: string) =>
        set({ isAuthenticated: true, username, token }),
      logout: () =>
        set({ isAuthenticated: false, username: null, token: null }),
    }),
    {
      name: 'x-ui-auth',
    }
  )
)
