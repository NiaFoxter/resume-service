import { useRef, useCallback, useEffect } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { updateResume } from '../api/resumes'

export function useAutosave(onStatus) {
    const timerRef = useRef(null)
    const pendingRef = useRef(false)

    const currentId = useResumeStore((s) => s.currentId)
    const getPayload = useResumeStore((s) => s.getPayload)

    const autosave = useCallback(async () => {
        if (!currentId) return
        pendingRef.current = false
        try {
            await updateResume(currentId, getPayload())
            onStatus?.('збережено', true)
        } catch {
            onStatus?.('помилка збереження', false)
        }
    }, [currentId, getPayload, onStatus])

    const schedule = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        pendingRef.current = true
        onStatus?.('збереження...')
        timerRef.current = setTimeout(() => {
            timerRef.current = null
            autosave()
        }, 1200)
    }, [autosave, onStatus])

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            if (pendingRef.current) {
                autosave()
            }
        }
    }, [autosave])

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!pendingRef.current) return
            if (currentId) {
                const payload = JSON.stringify(getPayload())
                navigator.sendBeacon?.(
                    `/resumes/${currentId}`,
                    new Blob([payload], { type: 'application/json' })
                )
            }
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [currentId, getPayload])

    return { schedule, autosave }
}