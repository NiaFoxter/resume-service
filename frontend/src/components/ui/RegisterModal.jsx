import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }

export default function RegisterModal() {
    const { registerOpen, closeRegister, openLogin } = useAuthStore()
    const { doRegister } = useAuth()

    const [first, setFirst] = useState('')
    const [last, setLast] = useState('')
    const [email, setEmail] = useState('')
    const [pass, setPass] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    if (!registerOpen) return null

    async function handleSubmit() {
        setError('')
        if (!first || !email || !pass) return setError("Заповніть обов'язкові поля")
        if (!isValidEmail(email)) return setError('Некоректна електронна пошта')
        if (pass.length < 8) return setError('Пароль мінімум 8 символів')
        setLoading(true)
        try { await doRegister(email, pass, first, last) }
        catch (e) { setError(e.message) }
        finally { setLoading(false) }
    }

    return (
        <div className="overlay open" onClick={e => e.target === e.currentTarget && closeRegister()}>
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">Реєстрація</h3>
                    <button className="modal-close" onClick={closeRegister}>✕</button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error">{error}</div>}
                    <div className="form-row">
                        <div className="fg"><label>Ім'я *</label>
                            <input value={first} onChange={e => setFirst(e.target.value)} placeholder="Іван" /></div>
                        <div className="fg"><label>Прізвище</label>
                            <input value={last} onChange={e => setLast(e.target.value)} placeholder="Петренко" /></div>
                    </div>
                    <div className="fg"><label>Email *</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                    <div className="fg"><label>Пароль * (мін. 8 символів)</label>
                        <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()} /></div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={() => { closeRegister(); openLogin() }}>Увійти</button>
                    <button className="btn btn-copper" onClick={handleSubmit} disabled={loading}>
                        {loading ? <span className="spinner" /> : 'Зареєструватись'}
                    </button>
                </div>
            </div>
        </div>
    )
}