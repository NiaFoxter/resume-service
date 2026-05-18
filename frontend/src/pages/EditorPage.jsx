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
    classic: 'Класичний', modern: 'Сучасний', minimalist: 'Мінімалістичний',
    creative: 'Креативний', professional: 'Професійний', compact: 'Компактний',
    elegant: 'Елегантний', 'it-special': 'IT-Спеціаліст',
}

export default function EditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { setResume, title, setTitle, template } = useResumeStore()
    const [activeSection, setActiveSection] = useState('personal')
    const [saveStatus, setSaveStatus] = useState('')
    const [pdfLoading, setPdfLoading] = useState(false)
    const previewRef = useRef(null)

    const onStatus = useCallback((text, ok) => setSaveStatus(ok ? '✓ ' + text : text), [])
    const { schedule } = useAutosave(onStatus)
    const { downloadPDF } = usePDF(previewRef)

    // Load resume from API if id provided and store doesn't have it yet
    useEffect(() => {
        if (!id) return
        getResume(id).then(setResume).catch(e => { toast(e.message, 'bad'); navigate('/dashboard') })
    }, [id, navigate, setResume])

    function handleChange() { schedule() }

    async function handlePDF() {
        setPdfLoading(true)
        try {
            await downloadPDF()
        } finally {
            setPdfLoading(false)
        }
    }

    // Sidebar drag-resize
    const sidebarRef = useRef(null)
    const shellRef = useRef(null)
    useEffect(() => {
        const sidebar = sidebarRef.current
        const shell = shellRef.current
        if (!sidebar || !shell) return
        const handle = document.createElement('div')
        handle.className = 'sidebar-resizer'
        sidebar.appendChild(handle)
        const MIN_W = 240, MAX_W = 540
        let dragging = false, startX = 0, startW = 0

        const handleMouseDown = e => {
            e.preventDefault(); dragging = true
            startX = e.clientX; startW = sidebar.getBoundingClientRect().width
            handle.classList.add('active')
            document.documentElement.style.cursor = 'col-resize'
            document.documentElement.style.userSelect = 'none'
        }

        const handleMouseMove = e => {
            if (!dragging) return
            const w = Math.min(MAX_W, Math.max(MIN_W, startW + (e.clientX - startX)))
            shell.style.gridTemplateColumns = w + 'px 1fr'
        }

        const handleMouseUp = () => {
            if (!dragging) return
            dragging = false; handle.classList.remove('active')
            document.documentElement.style.cursor = ''
            document.documentElement.style.userSelect = ''
        }

        handle.addEventListener('mousedown', handleMouseDown)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            handle.removeEventListener('mousedown', handleMouseDown)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.documentElement.style.cursor = ''
            document.documentElement.style.userSelect = ''
            if (sidebar.contains(handle)) sidebar.removeChild(handle)
        }
    }, [])

    return (
        <main className="page active editor-page" id="page-editor">
            {/* Toolbar */}
            <div className="editor-toolbar">
                <input className="resume-title-input" id="resumeTitle" value={title}
                    onChange={e => { setTitle(e.target.value); schedule() }} />
                <div className="toolbar-right">
                    <span className={`save-status ${saveStatus.startsWith('✓') ? 'saved' : ''}`}>{saveStatus}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/templates')}>
                        {TEMPLATE_NAMES[template] || template} ▾
                    </button>
                    <button id="pdfBtn" className="btn btn-copper btn-sm" onClick={handlePDF} disabled={pdfLoading}>
                        {pdfLoading ? <span className="spinner" /> : '↓ PDF'}
                    </button>
                </div>
            </div>

            {/* Shell */}
            <div className="editor-shell" ref={shellRef}>
                {/* Sidebar */}
                <div className="editor-sidebar" ref={sidebarRef}>
                    <ProgressRing />
                    <SectionNav active={activeSection} onChange={setActiveSection} />

                    <div className="editor-forms">
                        {activeSection === 'personal' && <PersonalForm onChange={handleChange} />}
                        {activeSection === 'summary' && <SummaryForm onChange={handleChange} />}
                        {activeSection === 'experience' && <ExperienceForm onChange={handleChange} />}
                        {activeSection === 'education' && <EducationForm onChange={handleChange} />}
                        {activeSection === 'skills' && <SkillsForm onChange={handleChange} />}
                        {activeSection === 'languages' && <LanguagesForm onChange={handleChange} />}
                        {activeSection === 'projects' && <ProjectsForm onChange={handleChange} />}
                        {activeSection === 'links' && <LinksForm onChange={handleChange} />}
                    </div>
                </div>

                {/* Preview */}
                <div className="editor-preview">
                    <A4Preview ref={previewRef} />
                </div>
            </div>
        </main>
    )
}