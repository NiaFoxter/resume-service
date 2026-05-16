import { create } from 'zustand'

let _id = 0

export const useToastStore = create(set => ({
    toasts: [],

    toast: (msg, type = '') => {
        const id = ++_id
        set(s => ({ toasts: [...s.toasts, { id, msg, type }] }))
        setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500)
    },

    dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export const toast = (msg, type) => useToastStore.getState().toast(msg, type)