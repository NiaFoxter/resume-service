import { useToastStore } from '../../store/toastStore'

const ICONS = { ok: '✓', warn: '⚠', bad: '✕' }

export default function ToastContainer() {
    const { toasts, dismiss } = useToastStore()

    return (
        <div id="toasts" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map(t => (
                <div key={t.id} className={`toast ${t.type}`.trim()} onClick={() => dismiss(t.id)}>
                    <span>{ICONS[t.type] || 'ℹ'}</span> {t.msg}
                </div>
            ))}
        </div>
    )
}