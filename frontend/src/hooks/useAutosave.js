import { useRef, useCallback } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { updateResume } from '../api/resumes'
import { toast } from '../store/toastStore'

export function useAutosave(onStatus) {
    const timerRef = useRef(null)
    const { currentId, toPayload } = useResumeStore()

    const autosave = useCallback(async () => {
        if (!currentId) return
        try {
            await updateResume(currentId, toPayload())
            onStatus?.('збережено', true)
        } catch {
            onStatus?.('помилка збереження', false)
        }
    }, [currentId, toPayload, onStatus])

    const schedule = useCallback(() => {
        clearTimeout(timerRef.current)
        onStatus?.('збереження...')
        timerRef.current = setTimeout(autosave, 1200)
    }, [autosave, onStatus])

    return { schedule, autosave }
}