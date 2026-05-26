import { useMemo } from 'react'
import { useResumeStore } from '../store/resumeStore'

export function useProgress() {
    const { data, photo } = useResumeStore()

    return useMemo(() => {
        const p = data

        const hasName = Boolean(p.personal.firstName?.trim() && p.personal.lastName?.trim())
        const hasEmail = Boolean(p.personal.email?.trim())
        const hasSummary = Boolean(p.summary?.trim())
        const hasExperience = p.experience.some(e =>
            e.position?.trim() || e.company?.trim() || e.description?.trim()
        )
        const hasEducation = p.education.some(e =>
            e.institution?.trim() || e.degree?.trim() || e.field?.trim()
        )
        const hasSkills = p.skills.some(skill => String(skill).trim())
        const hasLanguages = p.languages.some(lang =>
            lang.language?.trim?.() || String(lang).trim?.()
        )
        const hasPhoto = Boolean(photo)

        const checks = [
            hasName,
            hasEmail,
            hasSummary,
            hasExperience,
            hasEducation,
            hasSkills,
            hasLanguages,
            hasPhoto,
        ]
        const pct = Math.round(checks.filter(Boolean).length / checks.length * 100)

        const hints = []
        if (!hasName) hints.push("ім'я")
        if (!hasEmail) hints.push('email')
        if (!hasSummary) hints.push('профіль')
        if (!hasExperience) hints.push('досвід')
        if (!hasEducation) hints.push('освіта')
        if (!hasSkills) hints.push('навички')
        if (!hasLanguages) hints.push('мови')
        if (!hasPhoto) hints.push('фото')

        const sections = {
            personal: hasName && hasEmail,
            summary: hasSummary,
            experience: hasExperience,
            education: hasEducation,
            skills: hasSkills,
            languages: hasLanguages,
            projects: p.projects.some(pr => pr.name?.trim() || pr.description?.trim()),
            links: Object.values(p.links).some(v => String(v).trim()),
        }

        return { pct, hints, sections }
    }, [data, photo])
}