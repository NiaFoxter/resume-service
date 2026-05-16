import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getResumes, deleteResume as apiDelete, createResume } from '../api/resumes'
import { useResumeStore } from '../store/resumeStore'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import { showConfirm } from '../store/confirmStore'

const TEMPLATE_NAMES = {
    classic: 'Класичний', modern: 'Сучасний', minimalist: 'Мінімалістичний',
    creative: 'Креативний', professional: 'Професійний', compact: 'Компактний',
    elegant: 'Елегантний', 'it-special': 'IT',
}

const THUMB_CLASSES = ['ct-classic', 'ct-modern', 'ct-minimalist', 'ct-creative', 'ct-professional', 'ct-compact', 'ct-elegant', 'ct-it-special']

export default function DashboardPage() {
    const [resumes, setResumes] = useState([])
    const [loading, setLoading] = useState(true)
    const { setResume } = useResumeStore()
    const { user } = useAuthStore()
    const navigate = useNavigate()

    async function load() {
        try { setResumes(await getResumes()) }
        catch (e) { toast(e.message, 'bad') }
        finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    async function openResume(r) {
        setResume(r)
        navigate(`/editor/${r.id}`)
    }

    async function handleDelete(id, title) {
        showConfirm('Видалити резюме?', `«${title}» буде видалено назавжди.`, async () => {
            try { await apiDelete(id); toast('Резюме видалено 🗑️', 'ok'); load() }
            catch (e) { toast(e.message, 'bad') }
        })
    }

    async function handleCreate() {
        try {
            const r = await createResume({ title: 'Нове резюме', template: 'classic', data: {} })
            setResume(r)
            navigate(`/editor/${r.id}`)
        } catch (e) { toast(e.message, 'bad') }
    }

    return (
        <main className="page active" id="page-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1 className="dash-title">Мої резюме</h1>
                    {user && <p className="dash-sub">Вітаємо, <span id="greetName">{user.firstName}</span>!</p>}
                </div>
                <button className="btn btn-copper" onClick={() => navigate('/templates')}>+ Нове резюме</button>
            </div>

            {loading ? (
                <div className="dash-loading"><div className="spinner-large" /></div>
            ) : resumes.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📄</div>
                    <h3>Ще немає резюме</h3>
                    <p>Створіть перше резюме, щоб почати</p>
                    <button className="btn btn-copper" onClick={() => navigate('/templates')}>Створити резюме</button>
                </div>
            ) : (
                <div className="resume-grid" id="resumeGrid">
                    {resumes.map((r, i) => {
                        const tc = THUMB_CLASSES[i % THUMB_CLASSES.length]
                        const dt = new Date(r.updated_at).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        const tmplName = TEMPLATE_NAMES[r.template] || r.template || 'Класичний'
                        return (
                            <div key={r.id} className="resume-card" onClick={() => openResume(r)}>
                                <div className={`card-thumb ${tc}`}>
                                    <div className="card-thumb-pattern" />
                                    <div className="card-thumb-doc">
                                        <div className="doc-bar" /><div className="doc-bar sm" />
                                        <div className="doc-sep" />
                                        <div className="doc-line" /><div className="doc-line sm" /><div className="doc-line" />
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="card-name">{r.title}</div>
                                    <div className="card-meta">{tmplName} · {dt}</div>
                                </div>
                                <div className="card-actions">
                                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                                        onClick={e => { e.stopPropagation(); openResume(r) }}>Редагувати</button>
                                    <button className="btn btn-danger btn-sm btn-icon"
                                        onClick={e => { e.stopPropagation(); handleDelete(r.id, r.title) }}>✕</button>
                                </div>
                            </div>
                        )
                    })}
                    <div className="new-card" onClick={() => navigate('/templates')}>
                        <div className="new-card-icon">＋</div>
                        <div className="new-card-label">Нове резюме</div>
                    </div>
                </div>
            )}
        </main>
    )
}