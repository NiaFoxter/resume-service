import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }

export default function LoginModal() {
    const { loginOpen, closeLogin, openRegister } = useAuthStore()
    const { doLogin } = useAuth()

    const [email, setEmail] = useState('')
    const [pass, setPass] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    if (!loginOpen) return null

    async function handleSubmit() {
        setError('')
        if (!email || !pass) return setError('Заповніть всі поля')
        if (!isValidEmail(email)) return setError('Некоректна електронна пошта')
        setLoading(true)
        try { await doLogin(email, pass) }
        catch (e) { setError(e.message) }
        finally { setLoading(false) }
    }

    function switchToRegister() { closeLogin(); openRegister() }

    return (
        <div className="overlay open" onClick={e => e.target === e.currentTarget && closeLogin()}>
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">Вхід</h3>
                    <button className="modal-close" onClick={closeLogin}>✕</button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error">{error}</div>}
                    <div className="fg">
                        <label>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                    </div>
                    <div className="fg">
                        <label>Пароль</label>
                        <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={switchToRegister}>Реєстрація</button>
                    <button className="btn btn-copper" onClick={handleSubmit} disabled={loading}>
                        {loading ? <span className="spinner" /> : 'Увійти'}
                    </button>
                </div>
            </div>
        </div>
    )
}