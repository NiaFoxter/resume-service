import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const FEATURES = [
    { icon: '📄', cls: 'fi-i', title: '8 шаблонів', desc: 'Обери шаблон, що пасує твоїй професії.' },
    { icon: '🎯', cls: 'fi-c', title: 'Аналіз вакансії', desc: 'Порівняй резюме з вимогами - дізнайся відсоток збігів і що додати.' },
    { icon: '⚡', cls: 'fi-t', title: 'Живий перегляд', desc: 'Заповнюй - і одразу бач фінальний вигляд.' },
    { icon: '🖨', cls: 'fi-i', title: 'Експорт у PDF', desc: 'Якісний PDF-файл, готовий до друку або відправки рекрутеру.' },
    { icon: '🤖', cls: 'fi-c', title: 'AI-поради', desc: 'Штучний інтелект проаналізує вакансію та підкаже що додати.' },
    { icon: '📱', cls: 'fi-t', title: 'Адаптивний дизайн', desc: 'Працює на телефоні, планшеті та десктопі.' },
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
                <div>
                    <div className="hero-eyebrow">В майбутньому - тільки краще!</div>
                    <h1>Резюме, що<br /><em>справді</em><br />відкриває двері</h1>
                    <p className="hero-desc">Заповни дані, обери шаблон, отримай PDF за пару хвилин.</p>
                    <div className="hero-actions">
                        <button className="btn btn-copper btn-lg" onClick={handleStart}>Створити резюме</button>
                        <button className="btn btn-ghost btn-lg" onClick={() => navigate('/templates')}>Шаблони</button>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="hero-resume-float">
                        <div className="hrf-card">
                            <div className="hrf-head">
                                <div className="hrf-head-info">
                                    <div className="hrf-name">Іван Коваленко</div>
                                    <div className="hrf-role">Full-Stack Developer</div>
                                    <div className="hrf-contacts-row">
                                        <span className="hrf-contact-item">📧 ivan@email.com</span>
                                        <span className="hrf-contact-item">📍 Київ, Україна</span>
                                    </div>
                                </div>
                            </div>

                            <div className="hrf-body">
                                <div className="hrf-left">
                                    <div className="hrf-block">
                                        <div className="hrf-block-title">Навички</div>
                                        <div className="hrf-tags">
                                            {['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS'].map(s => (
                                                <span key={s} className="hrf-tag">{s}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="hrf-block">
                                        <div className="hrf-block-title">Мови</div>
                                        {[['Англійська', 'B2'], ['Українська', 'C1']].map(([lang, lvl]) => (
                                            <div key={lang} className="hrf-lang-row">
                                                <span className="hrf-lang-name">{lang}</span>
                                                <span className="hrf-lang-lvl">{lvl}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="hrf-block">
                                        <div className="hrf-block-title">Контакти</div>
                                        <div className="hrf-link">linkedin.com/in/ivan</div>
                                        <div className="hrf-link">github.com/ikovalenko</div>
                                    </div>
                                </div>

                                <div className="hrf-right">
                                    <div className="hrf-block">
                                        <div className="hrf-block-title">Профіль</div>
                                        <p className="hrf-about">
                                            Досвідчений розробник із 5+ роками досвіду. Спеціалізуюсь на побудові
                                            масштабованих веб-застосунків та мікросервісній архітектурі.
                                        </p>
                                    </div>

                                    <div className="hrf-block">
                                        <div className="hrf-block-title">Досвід роботи</div>
                                        <div className="hrf-exp-item">
                                            <div className="hrf-exp-head">
                                                <span className="hrf-exp-title">Senior Full-Stack Developer</span>
                                                <span className="hrf-exp-date">2022 - теп. час</span>
                                            </div>
                                            <div className="hrf-exp-company">TechCorp Ukraine</div>
                                            <ul className="hrf-exp-list">
                                                <li>Керівництво командою з 4 розробників</li>
                                                <li>Розробка мікросервісної архітектури</li>
                                                <li>Оптимізація продуктивності на 40%</li>
                                            </ul>
                                        </div>
                                        <div className="hrf-exp-item">
                                            <div className="hrf-exp-head">
                                                <span className="hrf-exp-title">Frontend Developer</span>
                                                <span className="hrf-exp-date">2020 - 2022</span>
                                            </div>
                                            <div className="hrf-exp-company">StartupHub</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hrf-badge hrf-badge-top">
                            <span className="hrf-badge-dot"></span>
                            Заповнюй
                        </div>

                        <div className="hrf-badge hrf-badge-bot">
                            <div className="hrf-badge-score">
                                <span className="hrf-score-num">87%</span>
                                <span className="hrf-score-sub">відповідність вакансії</span>
                            </div>
                            <div className="hrf-score-bar">
                                <div className="hrf-score-fill" style={{ width: '87%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features">
                <div className="features-wrap">
                    <div className="features-head">
                        <div className="label">Можливості</div>
                        <h2>Все необхідне - в одному місці</h2>
                    </div>
                    <div className="features-grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="feature-cell">
                                <div className={`fi ${f.cls}`}>{f.icon}</div>
                                <div className="feature-title">{f.title}</div>
                                <div className="feature-desc">{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    )
}