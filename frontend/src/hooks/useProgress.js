import { useMemo } from 'react'
import { useResumeStore } from '../store/resumeStore'

export function useProgress() {
    const data = useResumeStore((s) => s.data)
    const photo = useResumeStore((s) => s.photo)

    return useMemo(() => {
        const personal = data.personal

        const hasName = Boolean(personal.firstName?.trim() && personal.lastName?.trim())
        const hasEmail = Boolean(personal.email?.trim())
        const hasSummary = Boolean(data.summary?.trim())
        const hasExperience = data.experience.some(
            (exp) => exp.position?.trim() || exp.company?.trim() || exp.description?.trim()
        )
        const hasEducation = data.education.some(
            (edu) => edu.institution?.trim() || edu.degree?.trim() || edu.field?.trim()
        )
        const hasSkills = data.skills.some((skill) => String(skill).trim())
        const hasLanguages = data.languages.some(
            (lang) => lang.language?.trim?.() || String(lang).trim?.()
        )
        const hasPhoto = Boolean(photo)

        const completionChecks = [
            hasName, hasEmail, hasSummary, hasExperience,
            hasEducation, hasSkills, hasLanguages, hasPhoto,
        ]
        const pct = Math.round(completionChecks.filter(Boolean).length / completionChecks.length * 100)

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
            projects: data.projects.some((proj) => proj.name?.trim() || proj.description?.trim()),
            links: Object.values(data.links).some((val) => String(val).trim()),
        }

        return { pct, hints, sections }
    }, [data, photo])
}