import { useEffect, useState } from 'react'
import { getResumes, analyzeGemini, analyzeLocal } from '../api/resumes'
import { useResumeStore } from '../store/resumeStore'
import { toast } from '../store/toastStore'

function ScoreRing({ score }) {
    const radius = 60
    const circleLength = 2 * Math.PI * radius
    const offset = circleLength - (circleLength * score) / 100
    const color = score >= 65 ? '#2A7A5E' : score >= 40 ? '#D97706' : '#C94040'
    return (
        <svg width="150" height="150" viewBox="0 0 150 150">
            <circle cx="75" cy="75" r={radius} fill="none" stroke="#F0F0EC" strokeWidth="10" />
            <circle
                cx="75" cy="75" r={radius} fill="none"
                stroke={color} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circleLength}
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

function Results({ analysisResult }) {
    const found = analysisResult.found || []
    const missing = analysisResult.missing || []
    const recs = analysisResult.recommendations || []
    const levelColor = { red: '#C94040', yellow: '#D97706', green: '#2A7A5E' }

    return (
        <div className="analysis-results-wrap">
            <div className="score-hero">
                <div className="score-visual"><ScoreRing score={analysisResult.score || 0} /></div>
                <div className="score-info">
                    <div className="score-verdict">{analysisResult.verdict || 'Аналіз завершено'}</div>
                    <div className="score-meta">
                        <span className="meta-badge">
                            {analysisResult.method?.startsWith('gemini') ? '🤖 Gemini AI' : '📊 Локальний аналіз'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="skills-analysis">
                <div className="skills-col">
                    <h3>✅ У резюме</h3>
                    <div className="skills-cloud">
                        {found.length > 0
                            ? found.map((item, index) => <span key={index} className="skill-tag found">{item.word}</span>)
                            : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Ключових слів не знайдено</span>
                        }
                    </div>
                </div>
                <div className="skills-col">
                    <h3>❌ Відсутні</h3>
                    <div className="skills-cloud">
                        {missing.length > 0
                            ? missing.map((item, index) => <span key={index} className="skill-tag missing">{item.word}</span>)
                            : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Усі ключові слова знайдено 🎉</span>
                        }
                    </div>
                </div>
            </div>

            {recs.length > 0 && (
                <div className="advice-section">
                    <h3>💡 Як покращити резюме</h3>
                    <div className="advice-list">
                        {recs.map((rec, index) => (
                            <div
                                key={index}
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

function isGeminiUnavailable(error) {
    const msg = (error?.message || '').toLowerCase()
    return (
        error?.status === 503 ||
        msg.includes('недоступн') ||
        msg.includes('network') ||
        msg.includes('failed to fetch') ||
        msg.includes('etimedout') ||
        msg.includes('econnrefused')
    )
}

export default function AnalysisPage() {
    const currentId = useResumeStore((state) => state.currentId)

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
        if (!selectedId) {
            toast('Оберіть резюме', 'warn')
            return
        }

        if (jobText.trim().length < 20) {
            toast('Текст вакансії занадто короткий', 'warn')
            return
        }

        setLoading(true)
        setResult(null)
        setError('')

        try {
            const analysisResult = await analyzeGemini(selectedId, jobText)
            setResult(analysisResult)
            toast(`Аналіз завершено — ${analysisResult.score}% (Gemini AI)`, 'ok')
            setLoading(false)
            return
        } catch (geminiError) {
            const errMsg = geminiError?.message || ''

            if (isGeminiUnavailable(geminiError)) {
                toast('Gemini недоступний — використовується локальний аналіз', 'warn')
            } else {
                console.warn('[Gemini] помилка відповіді:', errMsg)
                toast(`Gemini: ${errMsg.slice(0, 80)} — переходимо на локальний`, 'warn')
            }
        }

        try {
            const analysisResult = await analyzeLocal(selectedId, jobText)
            setResult(analysisResult)
            toast('Локальний аналіз завершено', 'ok')
        } catch (localError) {
            const msg = localError?.message || 'Невідома помилка'
            setError(msg)
            toast(msg, 'bad')
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
                            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                                <option value="">— оберіть резюме —</option>
                                {resumes.map((resume) => (
                                    <option key={resume.id} value={resume.id}>{resume.title}</option>
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
                                ? <><span className="spinner" /><span>Аналіз...</span></>
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
                {result && <Results analysisResult={result} />}
            </div>
        </main>
    )
}