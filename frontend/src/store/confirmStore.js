import { create } from 'zustand'

export const useConfirmStore = create(set => ({
    open: false,
    title: '',
    text: '',
    onOk: null,

    showConfirm: (title, text, onOk) => set({ open: true, title, text, onOk }),
    close: () => set({ open: false, onOk: null }),
}))

export const showConfirm = (title, text, onOk) =>
    useConfirmStore.getState().showConfirm(title, text, onOk)