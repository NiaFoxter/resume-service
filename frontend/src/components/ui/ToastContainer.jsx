import { useToastStore } from '../../store/toastStore'

const ICONS = { ok: '✓', warn: '⚠', bad: '✕' }

export default function ToastContainer() {
    const { toasts, dismiss } = useToastStore()

    return (
        <div id="toasts" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map((toastItem) => (
                <div key={toastItem.id} className={`toast ${toastItem.type}`.trim()} onClick={() => dismiss(toastItem.id)}>
                    <span>{ICONS[toastItem.type] || 'ℹ'}</span> {toastItem.msg}
                </div>
            ))}
        </div>
    )
}