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
    professional: 'Профессійний',
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

    const title = useResumeStore((s) => s.title)
    const template = useResumeStore((s) => s.template)
    const setResume = useResumeStore((s) => s.setResume)
    const setTitle = useResumeStore((s) => s.setTitle)

    const numericId = Number(id)

    const [activeSection, setActiveSection] = useState('personal')
    const [saveStatus, setSaveStatus] = useState('')
    const [pdfLoading, setPdfLoading] = useState(false)
    const [loadingResume, setLoadingResume] = useState(true)
    const [loadedResumeId, setLoadedResumeId] = useState(null)

    const previewRef = useRef(null)
    const shellRef = useRef(null)
    const sidebarRef = useRef(null)

    const onStatus = useCallback((text, isSaved) => setSaveStatus(isSaved ? '✓ ' + text : text), [])
    const { schedule } = useAutosave(onStatus)
    const { downloadPDF } = usePDF(previewRef)

    useEffect(() => {
        if (!id || Number.isNaN(numericId)) {
            navigate('/dashboard')
            return
        }

        let cancelled = false
        setLoadingResume(true)
        setLoadedResumeId(null)
        setSaveStatus('')

        getResume(id)
            .then((resume) => {
                if (cancelled) return
                setResume(resume)
                setLoadedResumeId(Number(resume.id))
                setLoadingResume(false)
            })
            .catch((error) => {
                if (cancelled) return
                toast(error.message, 'bad')
                navigate('/dashboard')
            })

        return () => {
            cancelled = true
        }
    }, [id, numericId, setResume, navigate])

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

        const MIN_WIDTH = 240, MAX_WIDTH = 540
        let isDragging = false, startX = 0, startWidth = 0

        const onMouseDown = (mouseEvent) => {
            mouseEvent.preventDefault()
            isDragging = true
            startX = mouseEvent.clientX
            startWidth = sidebar.getBoundingClientRect().width
            handle.classList.add('active')
            document.documentElement.style.cursor = 'col-resize'
            document.documentElement.style.userSelect = 'none'
        }
        const onMouseMove = (mouseEvent) => {
            if (!isDragging) return
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (mouseEvent.clientX - startX)))
            shell.style.gridTemplateColumns = `${newWidth}px 1fr`
        }
        const onMouseUp = () => {
            if (!isDragging) return
            isDragging = false
            handle.classList.remove('active')
            document.documentElement.style.cursor = ''
            document.documentElement.style.userSelect = ''
        }

        handle.addEventListener('mousedown', onMouseDown)
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        return () => {
            handle.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.documentElement.style.cursor = ''
            document.documentElement.style.userSelect = ''
            sidebar.contains(handle) && sidebar.removeChild(handle)
        }
    }, [])

    const ActiveForm = FORM_MAP[activeSection]
    const resumeReady = !loadingResume && loadedResumeId === numericId

    if (!resumeReady) {
        return (
            <main className="page active editor-page" id="page-editor">
                <div className="dash-loading">
                    <div className="spinner-large" />
                </div>
            </main>
        )
    }

    return (
        <main className="page active editor-page" id="page-editor">
            <div className="editor-toolbar">
                <input className="resume-title-input" id="resumeTitle" value={title} onChange={(e) => { setTitle(e.target.value); schedule() }} />
                <div className="toolbar-right">
                    <span className={`save-status ${saveStatus.startsWith('✓') ? 'saved' : ''}`}>
                        {saveStatus}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/templates')}>
                        {TEMPLATE_NAMES[template] || template} ▾
                    </button>
                    <button id="pdfBtn" className="btn btn-copper btn-sm" onClick={handlePDF} disabled={pdfLoading}>
                        {pdfLoading ? <span className="spinner" /> : '↓ PDF'}
                    </button>
                </div>
            </div>

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