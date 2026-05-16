import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
    const { user, token, openLogin, openRegister } = useAuthStore()
    const { logout } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)
    const navigate = useNavigate()

    const close = () => setMenuOpen(false)

    const navLinks = [
        { label: 'Головна', to: '/' },
        { label: 'Шаблони', to: '/templates' },
        { label: 'Мої резюме', to: '/dashboard', auth: true },
        { label: 'Аналіз', to: '/analysis', auth: true },
    ]

    function handleNav(link) {
        if (link.auth && !token) { openLogin(); return }
        navigate(link.to)
        close()
    }

    return (
        <>
            <nav className="navbar">
                <Link className="nav-logo" to="/">CV Builder</Link>

                {/* Desktop links */}
                <div className="nav-links-desktop">
                    {navLinks.map(l => (
                        <button key={l.to} className="nav-link" onClick={() => handleNav(l)}>{l.label}</button>
                    ))}
                </div>

                <div className="nav-actions">
                    {token ? (
                        <>
                            <span className="nav-user visible">{user?.firstName} {user?.lastName}</span>
                            <button className="btn btn-ghost btn-sm" onClick={logout}>Вийти</button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-ghost btn-sm" onClick={openLogin}>Увійти</button>
                            <button className="btn btn-copper btn-sm" onClick={openRegister}>Реєстрація</button>
                        </>
                    )}
                    <button className={`nav-burger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(v => !v)} aria-label="Меню">
                        <span /><span /><span />
                    </button>
                </div>
            </nav>

            {/* Mobile overlay */}
            {menuOpen && (
                <div className="nav-overlay open" onClick={close}>
                    <div className="nav-menu open" onClick={e => e.stopPropagation()}>
                        {navLinks.map(l => (
                            <button key={l.to} className="nav-link" onClick={() => handleNav(l)}>{l.label}</button>
                        ))}
                        <hr style={{ border: 'none', borderTop: '1px solid #E8E8E4', margin: '8px 0' }} />
                        {token
                            ? <button className="btn btn-ghost" onClick={() => { logout(); close() }}>Вийти</button>
                            : <>
                                <button className="btn btn-ghost" onClick={() => { openLogin(); close() }}>Увійти</button>
                                <button className="btn btn-copper" onClick={() => { openRegister(); close() }}>Реєстрація</button>
                            </>
                        }
                    </div>
                </div>
            )}
        </>
    )
}