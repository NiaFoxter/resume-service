import { useMemo } from 'react'
import { useResumeStore } from '../store/resumeStore'

export function useProgress() {
    const { data, photo } = useResumeStore()

    return useMemo(() => {
        const p = data
        const checks = [
            p.personal.firstName && p.personal.lastName,
            p.personal.email,
            p.summary.trim().length > 0,
            p.experience.some(e => e.position?.trim()),
            p.education.some(e => e.institution?.trim() || e.degree?.trim()),
            p.skills.length > 0,
            p.languages.length > 0,
            !!photo,
        ]
        const pct = Math.round(checks.filter(Boolean).length / checks.length * 100)

        const hints = []
        if (!p.personal.firstName || !p.personal.lastName) hints.push("ім'я")
        if (!p.personal.email) hints.push('email')
        if (!p.summary) hints.push('профіль')
        if (!p.experience.length) hints.push('досвід')
        if (!p.skills.length) hints.push('навички')
        if (!photo) hints.push('фото')

        const sections = {
            personal: !!(p.personal.firstName && p.personal.email),
            summary: !!p.summary.trim(),
            experience: p.experience.some(e => e.position),
            education: p.education.some(e => e.institution || e.degree),
            skills: p.skills.length > 0,
            languages: p.languages.length > 0,
            projects: p.projects.length > 0,
            links: Object.values(p.links).some(v => v),
        }

        return { pct, hints, sections }
    }, [data, photo])
}