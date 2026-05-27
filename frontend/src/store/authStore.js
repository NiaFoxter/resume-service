import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
    persist(
        (set) => ({
            token: null,
            user: null,

            loginOpen: false,
            registerOpen: false,

            openLogin: () => set({ loginOpen: true }),
            closeLogin: () => set({ loginOpen: false }),
            openRegister: () => set({ registerOpen: true }),
            closeRegister: () => set({ registerOpen: false }),

            setAuth: (token, user) => set({ token, user }),
            clearAuth: () => set({ token: null, user: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
)