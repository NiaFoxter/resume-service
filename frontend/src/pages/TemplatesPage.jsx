import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useResumeStore } from '../store/resumeStore'
import { useAuthStore } from '../store/authStore'
import { createResume, updateResume } from '../api/resumes'
import { toast } from '../store/toastStore'

const TEMPLATES = [
    { id: 'classic', name: 'Класичний', desc: 'Темна шапка, дві колонки, serif-шрифт. Строго і класично.' },
    { id: 'modern', name: 'Сучасний', desc: 'Бічна панель справа, мідна лінія-акцент, sans-serif.' },
    { id: 'minimalist', name: 'Мінімалістичний', desc: 'Чорно-біле, великі відступи, одна колонка.' },
    { id: 'creative', name: 'Креативний', desc: 'Синій градієнт у шапці, яскраві акценти, одна колонка.' },
    { id: 'professional', name: 'Професійний', desc: 'Темна шапка, жирні заголовки з підкресленням.' },
    { id: 'compact', name: 'Компактний', desc: 'Дрібний шрифт, щільне розміщення, дві вузькі колонки.' },
    { id: 'elegant', name: 'Елегантний', desc: 'Світла шапка, тонкий шрифт, мідні заголовки.' },
    { id: 'it-special', name: 'IT-Спеціаліст', desc: 'Темна шапка з акцентом, моноширинний шрифт, теги.' },
]

function TemplateMini({ id }) {
    return (
        <div className={`tmpl-mini tmpl-mini-${id}`}>
            <div className="t-line t-line-1" />
            <div className="t-line t-line-2" />
            <div className="t-line t-line-3" />
            <div className="t-line t-line-4" />
            <div className="t-line t-line-5" />
        </div>
    )
}

export default function TemplatesPage() {
    const { currentId, template: currentTemplate, setTemplate, setResume } = useResumeStore()
    const { token, openLogin } = useAuthStore()
    const [selected, setSelected] = useState(currentTemplate || 'classic')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const isEditMode = location.state?.mode === 'edit' && currentId

    async function applyTemplate() {
        if (!token) { openLogin(); return }
        setLoading(true)
        try {
            const selectedTemplate = TEMPLATES.find((tmpl) => tmpl.id === selected)
            if (isEditMode) {
                await updateResume(currentId, { template: selected })
                setTemplate(selected)
                navigate(`/editor/${currentId}`)
                toast(`Шаблон «${selectedTemplate?.name}» застосовано`, 'ok')
            } else {
                const newResume = await createResume({ title: 'Нове резюме', template: selected, data: {} })
                setResume(newResume)
                navigate(`/editor/${newResume.id}`)
                toast(`Резюме з шаблоном «${selectedTemplate?.name}» створено`, 'ok')
            }
        } catch (error) {
            toast(error.message, 'bad')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="page active" id="page-templates">
            <div className="templates-wrap">
                <div className="templates-head">
                    <div className="label">Шаблони</div>
                    <h2>Оберіть стиль оформлення</h2>
                </div>

                <div className="tmpl-grid">
                    {TEMPLATES.map((tmpl) => (
                        <div
                            key={tmpl.id}
                            className={`tmpl-card ${selected === tmpl.id ? 'selected' : ''}`}
                            onClick={() => setSelected(tmpl.id)}
                            tabIndex={0}
                            role="button"
                            aria-pressed={selected === tmpl.id}
                            onKeyDown={(e) => e.key === 'Enter' && setSelected(tmpl.id)}
                        >
                            <div className={`tmpl-thumb ct-${tmpl.id}`}>
                                <div className="tmpl-badge">✓</div>
                                <TemplateMini id={tmpl.id} />
                            </div>
                            <div className="tmpl-info">
                                <div className="tmpl-name">{tmpl.name}</div>
                                <div className="tmpl-desc">{tmpl.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="templates-action">
                    <button className="btn btn-copper btn-lg" onClick={applyTemplate} disabled={loading}>
                        {loading ? <span className="spinner" /> : (isEditMode ? 'Застосувати шаблон →' : 'Створити резюме →')}
                    </button>
                </div>
            </div>
        </main>
    )
}