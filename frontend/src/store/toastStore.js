import { create } from 'zustand'

let _id = 0
const DURATION = 3500

export const useToastStore = create((set) => ({
    toasts: [],

    toast: (msg, type = '') => {
        const id = ++_id
        set((state) => ({ toasts: [...state.toasts, { id, msg, type }] }))
        setTimeout(
            () => set((state) => ({ toasts: state.toasts.filter((toastItem) => toastItem.id !== id) })),
            DURATION
        )
    },

    dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toastItem) => toastItem.id !== id) })),
}))

export const toast = (msg, type) => useToastStore.getState().toast(msg, type)