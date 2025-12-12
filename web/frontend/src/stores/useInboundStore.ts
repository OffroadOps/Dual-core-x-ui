import { create } from 'zustand'
import type { Inbound } from '@/types/inbound'

interface InboundState {
  inbounds: Inbound[]
  loading: boolean
  setInbounds: (inbounds: Inbound[]) => void
  setLoading: (loading: boolean) => void
  addInbound: (inbound: Inbound) => void
  updateInbound: (id: number, inbound: Partial<Inbound>) => void
  removeInbound: (id: number) => void
}

export const useInboundStore = create<InboundState>((set) => ({
  inbounds: [],
  loading: false,
  setInbounds: (inbounds) => set({ inbounds }),
  setLoading: (loading) => set({ loading }),
  addInbound: (inbound) =>
    set((state) => ({ inbounds: [...state.inbounds, inbound] })),
  updateInbound: (id, updates) =>
    set((state) => ({
      inbounds: state.inbounds.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  removeInbound: (id) =>
    set((state) => ({
      inbounds: state.inbounds.filter((item) => item.id !== id),
    })),
}))
