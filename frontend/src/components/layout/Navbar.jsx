import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
    const { user, token, openLogin, openRegister } = useAuthStore()
    const { logout } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)
    const navigate = useNavigate()

    const close = () => setMenuOpen(false)

    const navLinks = [
        { label: 'Мої резюме', to: '/dashboard', auth: true },
        { label: 'Шаблони', to: '/templates', auth: true },
        { label: 'Аналіз', to: '/analysis', auth: true },
    ]

    function handleNav(link) {
        if (link.auth && !token) { openLogin(); close(); return }
        navigate(link.to)
        close()
    }

    return (
        <>
            <nav className="navbar">
                <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <div className="nav-logo-mark">
                        <svg viewBox="0 0 14 14" fill="none">
                            <rect x="1" y="1" width="12" height="12" rx="2" stroke="white" strokeWidth="1.5" />
                            <path d="M3.5 4.5H10.5M3.5 7H8M3.5 9.5H6.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                    </div>
                    Автоматизоване Резюме
                </div>

                <div className="nav-links">
                    {navLinks.filter(l => !l.auth || token).map(l => (
                        <button key={l.to} className="nav-link" onClick={() => handleNav(l)}>{l.label}</button>
                    ))}
                </div>

                <div className="nav-auth">
                    {token ? (
                        <>
                            <span className="nav-user visible">{user?.firstName} {user?.lastName}</span>
                            <button className="btn btn-ghost btn-sm" onClick={logout}>Вийти</button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-ghost btn-sm" id="btnLogin" onClick={openLogin}>Увійти</button>
                            <button className="btn btn-primary btn-sm" id="btnReg" onClick={openRegister}>Реєстрація</button>
                        </>
                    )}
                    <button
                        className={`nav-burger ${menuOpen ? 'open' : ''}`}
                        id="navBurger"
                        aria-label="Меню"
                        onClick={() => setMenuOpen(v => !v)}
                    >
                        <span /><span /><span />
                    </button>
                </div>
            </nav>

            <div className={`nav-overlay ${menuOpen ? 'open' : ''}`} id="navOverlay" onClick={close} />
            <div className={`nav-menu ${menuOpen ? 'open' : ''}`} id="navMenu">
                <div className="nav-links">
                    {navLinks.filter(l => !l.auth || token).map(l => (
                        <button key={l.to} className="nav-link" onClick={() => handleNav(l)}>{l.label}</button>
                    ))}
                </div>
                <div className="nav-auth" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 8 }}>
                    {token ? (
                        <button className="btn btn-ghost" onClick={() => { logout(); close() }}>Вийти</button>
                    ) : (
                        <>
                            <button className="btn btn-ghost" onClick={() => { openLogin(); close() }}>Увійти</button>
                            <button className="btn btn-primary" onClick={() => { openRegister(); close() }}>Реєстрація</button>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}