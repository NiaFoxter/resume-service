import { useEffect, useState } from 'react'
import { getResumes, analyzeGemini, analyzeLocal } from '../api/resumes'
import { useResumeStore } from '../store/resumeStore'
import { toast } from '../store/toastStore'

function ScoreRing({ score }) {
    const R = 60
    const circ = 2 * Math.PI * R
    const offset = circ - (circ * score) / 100
    const color = score >= 65 ? '#2A7A5E' : score >= 40 ? '#D97706' : '#C94040'
    return (
        <svg width="150" height="150" viewBox="0 0 150 150">
            <circle cx="75" cy="75" r={R} fill="none" stroke="#F0F0EC" strokeWidth="10" />
            <circle
                cx="75" cy="75" r={R} fill="none"
                stroke={color} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 75 75)"
                style={{ transition: 'stroke-dashoffset .6s ease' }}
            />
            <text x="75" y="72" textAnchor="middle" fontFamily="Georgia,serif" fontSize="40" fontWeight="bold" fill="#0D0D0F">
                {score}
            </text>
            <text x="75" y="95" textAnchor="middle" fontSize="14" fill="#72727A">відсотків</text>
        </svg>
    )
}

function Results({ r }) {
    const found = r.found || []
    const missing = r.missing || []
    const recs = r.recommendations || []
    const levelColor = { red: '#C94040', yellow: '#D97706', green: '#2A7A5E' }

    return (
        <div className="analysis-results-wrap">
            <div className="score-hero">
                <div className="score-visual"><ScoreRing score={r.score || 0} /></div>
                <div className="score-info">
                    <div className="score-verdict">{r.verdict || 'Аналіз завершено'}</div>
                    <div className="score-meta">
                        <span className="meta-badge">
                            {r.method?.startsWith('gemini') ? '🤖 Gemini AI' : '📊 Статистичний'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="skills-analysis">
                <div className="skills-col">
                    <h3>✅ У резюме</h3>
                    <div className="skills-cloud">
                        {found.length > 0
                            ? found.map((f, i) => <span key={i} className="skill-tag found">{f.word}</span>)
                            : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Ключових слів не знайдено</span>
                        }
                    </div>
                </div>
                <div className="skills-col">
                    <h3>❌ Відсутні</h3>
                    <div className="skills-cloud">
                        {missing.length > 0
                            ? missing.map((m, i) => <span key={i} className="skill-tag missing">{m.word}</span>)
                            : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Усі ключові слова знайдено 🎉</span>
                        }
                    </div>
                </div>
            </div>

            {recs.length > 0 && (
                <div className="advice-section">
                    <h3>💡 Як покращити резюме</h3>
                    <div className="advice-list">
                        {recs.map((rec, i) => (
                            <div
                                key={i}
                                className={`advice-item advice-${rec.level}`}
                                style={{ borderLeftColor: levelColor[rec.level] }}
                            >
                                {rec.word && <span className="advice-keyword">{rec.word}</span>}
                                <span className="advice-text">{rec.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function AnalysisPage() {
    const currentId = useResumeStore((s) => s.currentId)

    const [resumes, setResumes] = useState([])
    const [selectedId, setSelectedId] = useState(currentId ? String(currentId) : '')
    const [jobText, setJobText] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        getResumes()
            .then((list) => {
                setResumes(list)
                if (!selectedId && list.length) setSelectedId(String(list[0].id))
            })
            .catch(() => { })
    }, [])

    const canAnalyze = selectedId && jobText.trim().length >= 20

    async function runAnalysis() {
        if (!selectedId) { toast('Оберіть резюме', 'warn'); return }
        if (jobText.trim().length < 20) { toast('Текст вакансії занадто короткий', 'warn'); return }

        setLoading(true); setResult(null); setError('')
        try {
            const r = await analyzeGemini(selectedId, jobText)
            setResult(r)
            toast(`Аналіз завершено (${r.score}%)`, 'ok')
        } catch {
            toast('Gemini недоступний — використовуємо локальний аналіз', 'warn')
            try {
                const r = await analyzeLocal(selectedId, jobText)
                setResult(r)
                toast('Локальний аналіз завершено', 'ok')
            } catch (e2) {
                setError(e2.message)
                toast(e2.message, 'bad')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="page active" id="page-analysis">
            <div className="analysis-header">
                <h1 className="analysis-title">Аналіз резюме</h1>
                <p className="analysis-sub">
                    Вставте текст вакансії та дізнайтесь наскільки ваше резюме відповідає вимогам
                </p>
            </div>

            <div className="analysis-form">
                {resumes.length === 0 ? (
                    <p style={{ color: 'var(--ink-3)', textAlign: 'center', padding: '16px 0' }}>
                        У вас ще немає резюме. <a href="/templates">Створіть перше →</a>
                    </p>
                ) : (
                    <>
                        <div className="fg">
                            <label>Оберіть резюме</label>
                            <select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                            >
                                <option value="">— оберіть резюме —</option>
                                {resumes.map((r) => (
                                    <option key={r.id} value={r.id}>{r.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="fg">
                            <label>Текст вакансії</label>
                            <textarea
                                rows="8"
                                value={jobText}
                                onChange={(e) => setJobText(e.target.value)}
                                placeholder="Вставте сюди текст вакансії або опис вимог..."
                            />
                        </div>
                        <button
                            className="btn btn-copper"
                            onClick={runAnalysis}
                            disabled={loading || !canAnalyze}
                        >
                            {loading
                                ? <><span className="spinner" /><span>Аналіз ШІ...</span></>
                                : '🔍 Проаналізувати'
                            }
                        </button>
                    </>
                )}
            </div>

            <div style={{ marginTop: 24 }}>
                {loading && (
                    <div className="analysis-loading">
                        <div className="spinner-large" />
                        <p>🔄 Аналізуємо резюме...</p>
                        <small>Перший запуск може зайняти до 2 хвилин</small>
                    </div>
                )}
                {error && !loading && (
                    <div className="analysis-error">
                        <span className="err-icon">⚠️</span>
                        <p>{error}</p>
                        <button onClick={runAnalysis} className="btn btn-sm">🔄 Спробувати ще</button>
                    </div>
                )}
                {result && <Results r={result} />}
            </div>
        </main>
    )
}