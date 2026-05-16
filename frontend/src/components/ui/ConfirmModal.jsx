import { useConfirmStore } from '../../store/confirmStore'

export default function ConfirmModal() {
    const { open, title, text, onOk, close } = useConfirmStore()
    if (!open) return null

    return (
        <div className="overlay open" onClick={e => e.target === e.currentTarget && close()}>
            <div className="modal" style={{ maxWidth: 420 }}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={close}>✕</button>
                </div>
                <div className="modal-body">
                    <p style={{ color: 'var(--ink-3, #72727A)', fontSize: 14 }}>{text}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={close}>Скасувати</button>
                    <button className="btn btn-danger" onClick={() => { close(); onOk?.() }}>Видалити</button>
                </div>
            </div>
        </div>
    )
}