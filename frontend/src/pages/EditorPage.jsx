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
    const dragStateRef = useRef(null)
    const splitStateRef = useRef(null)

    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const savedWidth = typeof window !== 'undefined'
            ? Number(window.localStorage.getItem('editor-sidebar-width'))
            : NaN
        return Number.isFinite(savedWidth) && savedWidth >= 240 && savedWidth <= 540 ? savedWidth : 340
    })
    const [isSidebarDragging, setIsSidebarDragging] = useState(false)
    const sidebarWidthRef = useRef(sidebarWidth)

    const [topPanelHeight, setTopPanelHeight] = useState(() => {
        const savedHeight = typeof window !== 'undefined'
            ? Number(window.localStorage.getItem('editor-sidebar-top-height'))
            : NaN
        return Number.isFinite(savedHeight) && savedHeight >= 0 && savedHeight <= 360 ? savedHeight : 220
    })
    const [isTopPanelDragging, setIsTopPanelDragging] = useState(false)
    const topPanelHeightRef = useRef(topPanelHeight)

    const onStatus = useCallback((text, isSaved) => setSaveStatus(isSaved ? '✓ ' + text : text), [])
    const { schedule, autosave } = useAutosave(onStatus)
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

    const handleFormChange = useCallback((immediate = false) => {
        if (immediate) autosave()
        else schedule()
    }, [autosave, schedule])

    async function handlePDF() {
        setPdfLoading(true)
        try { await downloadPDF() }
        finally { setPdfLoading(false) }
    }

    const stopSidebarDrag = useCallback(() => {
        if (!dragStateRef.current) return

        dragStateRef.current = null
        setIsSidebarDragging(false)
        document.documentElement.classList.remove('sidebar-dragging')
    }, [])

    const handleSidebarPointerDown = useCallback((event) => {
        if (window.matchMedia('(max-width: 768px)').matches) return

        event.preventDefault()
        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: sidebarWidthRef.current,
        }
        setIsSidebarDragging(true)
        document.documentElement.classList.add('sidebar-dragging')
    }, [])

    useEffect(() => {
        if (!isSidebarDragging) return undefined

        const MIN_WIDTH = 240
        const MAX_WIDTH = 540

        const handlePointerMove = (event) => {
            const dragState = dragStateRef.current
            if (!dragState) return

            const nextWidth = Math.min(
                MAX_WIDTH,
                Math.max(MIN_WIDTH, dragState.startWidth + event.clientX - dragState.startX)
            )

            setSidebarWidth(nextWidth)
        }

        const handlePointerUp = () => stopSidebarDrag()

        const handlePointerCancel = () => stopSidebarDrag()

        document.addEventListener('pointermove', handlePointerMove)
        document.addEventListener('pointerup', handlePointerUp)
        document.addEventListener('pointercancel', handlePointerCancel)

        return () => {
            document.removeEventListener('pointermove', handlePointerMove)
            document.removeEventListener('pointerup', handlePointerUp)
            document.removeEventListener('pointercancel', handlePointerCancel)
            stopSidebarDrag()
        }
    }, [isSidebarDragging, stopSidebarDrag])

    useEffect(() => {
        sidebarWidthRef.current = sidebarWidth
        window.localStorage.setItem('editor-sidebar-width', String(Math.round(sidebarWidth)))
    }, [sidebarWidth])


    const stopTopPanelDrag = useCallback(() => {
        if (!splitStateRef.current) return

        splitStateRef.current = null
        setIsTopPanelDragging(false)
        document.documentElement.classList.remove('sidebar-split-dragging')
    }, [])

    const handleTopPanelPointerDown = useCallback((event) => {
        if (window.matchMedia('(max-width: 768px)').matches) return

        event.preventDefault()
        splitStateRef.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startHeight: topPanelHeightRef.current,
        }
        setIsTopPanelDragging(true)
        document.documentElement.classList.add('sidebar-split-dragging')
    }, [])

    useEffect(() => {
        if (!isTopPanelDragging) return undefined

        const MIN_HEIGHT = 0
        const MAX_HEIGHT = 360

        const handlePointerMove = (event) => {
            const dragState = splitStateRef.current
            if (!dragState) return

            const nextHeight = Math.min(
                MAX_HEIGHT,
                Math.max(MIN_HEIGHT, dragState.startHeight + event.clientY - dragState.startY)
            )

            setTopPanelHeight(nextHeight)
        }

        const handlePointerUp = () => stopTopPanelDrag()
        const handlePointerCancel = () => stopTopPanelDrag()

        document.addEventListener('pointermove', handlePointerMove)
        document.addEventListener('pointerup', handlePointerUp)
        document.addEventListener('pointercancel', handlePointerCancel)

        return () => {
            document.removeEventListener('pointermove', handlePointerMove)
            document.removeEventListener('pointerup', handlePointerUp)
            document.removeEventListener('pointercancel', handlePointerCancel)
            stopTopPanelDrag()
        }
    }, [isTopPanelDragging, stopTopPanelDrag])

    useEffect(() => {
        topPanelHeightRef.current = topPanelHeight
        window.localStorage.setItem('editor-sidebar-top-height', String(Math.round(topPanelHeight)))
    }, [topPanelHeight])

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
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/templates', { state: { mode: 'edit' } })}>
                        {TEMPLATE_NAMES[template] || template} ▾
                    </button>
                    <button id="pdfBtn" className="btn btn-copper btn-sm" onClick={handlePDF} disabled={pdfLoading}>
                        {pdfLoading ? <span className="spinner" /> : '↓ PDF'}
                    </button>
                </div>
            </div>

            <div
                className={`editor-shell ${isSidebarDragging ? 'is-resizing' : ''} ${isTopPanelDragging ? 'is-split-resizing' : ''}`}
                style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
            >
                <div
                    className="editor-sidebar"
                    style={{ gridTemplateRows: `${topPanelHeight}px 7px minmax(0, 1fr)` }}
                >
                    <div className={`editor-sidebar-top ${topPanelHeight < 24 ? 'is-collapsed' : ''}`}>
                        <ProgressRing />
                        <SectionNav active={activeSection} onChange={setActiveSection} />
                    </div>
                    <button
                        type="button"
                        className={`sidebar-split-resizer ${isTopPanelDragging ? 'active' : ''}`}
                        aria-label="Змінити висоту верхньої частини панелі"
                        title="Потягніть, щоб сховати або відкрити верхню частину панелі"
                        onPointerDown={handleTopPanelPointerDown}
                    />
                    <div className="editor-forms">
                        {ActiveForm && <ActiveForm onChange={handleFormChange} />}
                    </div>
                    <button
                        type="button"
                        className={`sidebar-resizer ${isSidebarDragging ? 'active' : ''}`}
                        aria-label="Змінити ширину бокової панелі"
                        title="Потягніть, щоб змінити ширину панелі"
                        onPointerDown={handleSidebarPointerDown}
                    />
                </div>
                <div className="editor-preview">
                    <A4Preview ref={previewRef} />
                </div>
            </div>
        </main>
    )
}