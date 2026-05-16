import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const FEATURES = [
    { icon: '📄', title: '8 шаблонів', desc: 'Обери шаблон, що пасує твоїй професії.' },
    { icon: '🎯', title: 'Аналіз вакансії', desc: 'Порівняй резюме з вимогами — дізнайся відсоток збігів і що додати.' },
    { icon: '⚡', title: 'Живий перегляд', desc: 'Заповнюй — і одразу бач фінальний вигляд. Без збережень і перезавантажень.' },
    { icon: '🖨', title: 'Експорт у PDF', desc: 'Якісний PDF-файл, готовий до друку або відправки рекрутеру.' },
    { icon: '🤖', title: 'AI-поради', desc: 'Штучний інтелект проаналізує вакансію та підкаже, що треба додати.' },
    { icon: '📱', title: 'Адаптивний дизайн', desc: 'Працює на телефоні, планшеті та десктопі. Редагуй де зручно.' },
]

export default function LandingPage() {
    const navigate = useNavigate()
    const { token, openRegister } = useAuthStore()

    function handleStart() {
        if (token) navigate('/templates')
        else openRegister()
    }

    return (
        <main className="page active" id="page-landing">
            <section className="hero">
                <div className="hero-content">
                    <h1 className="hero-title">Резюме, що <span className="hero-accent">відкривають двері</span></h1>
                    <p className="hero-sub">
                        Конструктор резюме з живим прев'ю, 8 шаблонами та AI-аналізом під вакансію.
                        Від заповнення до PDF — за 10 хвилин.
                    </p>
                    <div className="hero-actions">
                        <button className="btn btn-copper btn-lg" onClick={handleStart}>Створити резюме</button>
                        <button className="btn btn-ghost btn-lg" onClick={() => navigate('/templates')}>Переглянути шаблони</button>
                    </div>
                </div>
            </section>

            <section className="features-section">
                <h2 className="section-title">Все що потрібно для ідеального резюме</h2>
                <div className="features-grid">
                    {FEATURES.map((f, i) => (
                        <div key={i} className="feature-cell">
                            <div className="fi">{f.icon}</div>
                            <div className="feature-title">{f.title}</div>
                            <div className="feature-desc">{f.desc}</div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    )
}