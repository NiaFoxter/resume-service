import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getResume } from '../api/resumes'
import { useResumeStore } from '../store/resumeStore'
import { useAutosave } from '../hooks/useAutosave'
import { usePDF } from '../hooks/usePDF'
import { toast } from '../store/toastStore'

import SectionNav from '../components/editor/SectionNav'
import ProgressRing from '../components/editor/ProgressRing'
import A4Preview from '../components/preview/A4Preview'

import PersonalForm from '../components/editor/forms/PersonalForm'
import SummaryForm from '../components/editor/forms/SummaryForm'
import ExperienceForm from '../components/editor/forms/ExperienceForm'
import EducationForm from '../components/editor/forms/EducationForm'
import SkillsForm from '../components/editor/forms/SkillsForm'
import LanguagesForm from '../components/editor/forms/LanguagesForm'
import ProjectsForm from '../components/editor/forms/ProjectsForm'
import LinksForm from '../components/editor/forms/LinksForm'

const TEMPLATE_NAMES = {
    classic: 'Класичний',
    modern: 'Сучасний',
    minimalist: 'Мінімалістичний',
    creative: 'Креативний',
    professional: 'Професійний',
    compact: 'Компактний',
    elegant: 'Елегантний',
    'it-special': 'IT-Спеціаліст',
}

const FORM_MAP = {
    personal: PersonalForm,
    summary: SummaryForm,
    experience: ExperienceForm,
    education: EducationForm,
    skills: SkillsForm,
    languages: LanguagesForm,
    projects: ProjectsForm,
    links: LinksForm,
}

export default function EditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const currentId = useResumeStore((s) => s.currentId)
    const title = useResumeStore((s) => s.title)
    const template = useResumeStore((s) => s.template)
    const setResume = useResumeStore((s) => s.setResume)
    const setTitle = useResumeStore((s) => s.setTitle)

    const [activeSection, setActiveSection] = useState('personal')
    const [saveStatus, setSaveStatus] = useState('')
    const [pdfLoading, setPdfLoading] = useState(false)

    const previewRef = useRef(null)
    const shellRef = useRef(null)
    const sidebarRef = useRef(null)

    const onStatus = useCallback((text, ok) => setSaveStatus(ok ? '✓ ' + text : text), [])
    const { schedule } = useAutosave(onStatus)
    const { downloadPDF } = usePDF(previewRef)

    useEffect(() => {
        if (!id) return
        const numId = Number(id)
        if (currentId === numId) return
        getResume(id)
            .then(setResume)
            .catch((e) => { toast(e.message, 'bad'); navigate('/dashboard') })
    }, [id])

    async function handlePDF() {
        setPdfLoading(true)
        try { await downloadPDF() }
        finally { setPdfLoading(false) }
    }

    useEffect(() => {
        const sidebar = sidebarRef.current
        const shell = shellRef.current
        if (!sidebar || !shell) return

        const handle = document.createElement('div')
        handle.className = 'sidebar-resizer'
        sidebar.appendChild(handle)

        const MIN_W = 240, MAX_W = 540
        let dragging = false, startX = 0, startW = 0

        const onDown = (e) => {
            e.preventDefault()
            dragging = true
            startX = e.clientX
            startW = sidebar.getBoundingClientRect().width
            handle.classList.add('active')
            document.documentElement.style.cursor = 'col-resize'
            document.documentElement.style.userSelect = 'none'
        }
        const onMove = (e) => {
            if (!dragging) return
            const w = Math.min(MAX_W, Math.max(MIN_W, startW + (e.clientX - startX)))
            shell.style.gridTemplateColumns = `${w}px 1fr`
        }
        const onUp = () => {
            if (!dragging) return
            dragging = false
            handle.classList.remove('active')
            document.documentElement.style.cursor = ''
            document.documentElement.style.userSelect = ''
        }

        handle.addEventListener('mousedown', onDown)
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
        return () => {
            handle.removeEventListener('mousedown', onDown)
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
            document.documentElement.style.cursor = ''
            document.documentElement.style.userSelect = ''
            sidebar.contains(handle) && sidebar.removeChild(handle)
        }
    }, [])

    const ActiveForm = FORM_MAP[activeSection]

    return (
        <main className="page active editor-page" id="page-editor">
            {/* Toolbar */}
            <div className="editor-toolbar">
                <input
                    className="resume-title-input"
                    id="resumeTitle"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); schedule() }}
                />
                <div className="toolbar-right">
                    <span className={`save-status ${saveStatus.startsWith('✓') ? 'saved' : ''}`}>
                        {saveStatus}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/templates')}>
                        {TEMPLATE_NAMES[template] || template} ▾
                    </button>
                    <button
                        id="pdfBtn"
                        className="btn btn-copper btn-sm"
                        onClick={handlePDF}
                        disabled={pdfLoading}
                    >
                        {pdfLoading ? <span className="spinner" /> : '↓ PDF'}
                    </button>
                </div>
            </div>

            {/* Shell */}
            <div className="editor-shell" ref={shellRef}>
                <div className="editor-sidebar" ref={sidebarRef}>
                    <ProgressRing />
                    <SectionNav active={activeSection} onChange={setActiveSection} />
                    <div className="editor-forms">
                        {ActiveForm && <ActiveForm onChange={schedule} />}
                    </div>
                </div>

                <div className="editor-preview">
                    <A4Preview ref={previewRef} />
                </div>
            </div>
        </main>
    )
}
