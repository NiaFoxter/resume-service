import { forwardRef } from 'react'
import { useResumeStore } from '../../store/resumeStore'

function escapeText(str) {
    if (str == null) return ''
    return String(str)
}

function cleanUrl(value) {
    return String(value || '').trim()
}

function linkHref(value) {
    const url = cleanUrl(value)
    if (!url) return ''
    if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url
    return `https://${url}`
}

const hasValidExp = (exp) => exp.position?.trim() || exp.company?.trim()
const hasValidEdu = (edu) => edu.institution?.trim() || edu.degree?.trim()
const hasValidProj = (proj) => proj.name?.trim()
const hasValidLang = (lang) => lang.language?.trim()

function SkillPills({ skills }) {
    const list = (skills || []).filter((skill) => skill?.trim())
    if (!list.length) return null
    return (
        <div className="a4-skills-wrap">
            {list.slice(0, 12).map((skill, index) => (
                <span key={index} className="a4-skill-pill">{escapeText(skill)}</span>
            ))}
        </div>
    )
}

function LangList({ languages }) {
    const list = (languages || []).filter(hasValidLang)
    if (!list.length) return null
    return (
        <>
            {list.map((lang, index) => (
                <div key={index} className="a4-lang">
                    <span className="a4-lang-name">{escapeText(lang.language)}</span>
                    <span className="a4-lang-level">{escapeText(lang.level)}</span>
                </div>
            ))}
        </>
    )
}

function LinksList({ links }) {
    const items = Object.entries(links || {})
        .map(([key, val]) => [key, cleanUrl(val)])
        .filter(([, val]) => val)
    if (!items.length) return null
    const labels = { github: 'GitHub', website: 'Сайт', telegram: 'Telegram' }
    return (
        <>
            {items.map(([key, val]) => (
                <div key={key} className="a4-link-item">
                    <span className="a4-link-label">{labels[key] || key}</span>
                    <a className="a4-link-url" href={linkHref(val)} target="_blank" rel="noreferrer">
                        {val}
                    </a>
                </div>
            ))}
        </>
    )
}

function ExpList({ experience }) {
    const list = (experience || []).filter(hasValidExp)
    if (!list.length) return null
    return (
        <>
            {list.map((exp, index) => {
                const period = [exp.startDate, exp.current ? 'тепер' : exp.endDate].filter(Boolean).join(' — ')
                const bullets = (exp.description || '').split('\n').filter((line) => line.trim()).slice(0, 5)
                return (
                    <div key={index} className="a4-exp">
                        <div className="a4-exp-head">
                            <span className="a4-exp-title">{escapeText(exp.position)}</span>
                            {period && <span className="a4-exp-period">{period}</span>}
                        </div>
                        {exp.company && <div className="a4-exp-company">{escapeText(exp.company)}</div>}
                        {bullets.length > 0 && (
                            <ul className="a4-exp-list">
                                {bullets.map((bullet, bulletIndex) => (
                                    <li key={bulletIndex}>{escapeText(bullet.replace(/^[•\-–▸]\s*/, ''))}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )
            })}
        </>
    )
}

function EduList({ education }) {
    const list = (education || []).filter(hasValidEdu)
    if (!list.length) return null
    return (
        <>
            {list.map((edu, index) => {
                const period = [edu.startYear, edu.endYear].filter(Boolean).join(' – ')
                return (
                    <div key={index} className="a4-edu">
                        <div className="a4-edu-head">
                            <div className="a4-edu-main">
                                {edu.degree && <div className="a4-edu-deg">{escapeText(edu.degree)}</div>}
                                {edu.institution && <div className="a4-edu-school">{escapeText(edu.institution)}</div>}
                                {edu.field && <div className="a4-edu-field">{escapeText(edu.field)}</div>}
                            </div>
                            {period && <span className="a4-exp-period">{period}</span>}
                        </div>
                    </div>
                )
            })}
        </>
    )
}

function ProjectsList({ projects }) {
    const list = (projects || []).filter(hasValidProj)
    if (!list.length) return null
    return (
        <>
            {list.map((proj, index) => {
                const url = cleanUrl(proj.url)
                return (
                    <div key={index} className="a4-proj">
                        <div className="a4-proj-head">
                            <span className="a4-proj-name">{escapeText(proj.name)}</span>
                            {url && (
                                <a className="a4-proj-url" href={linkHref(url)} target="_blank" rel="noreferrer">
                                    {url}
                                </a>
                            )}
                        </div>
                        {proj.description && <div className="a4-proj-desc">{escapeText(proj.description)}</div>}
                    </div>
                )
            })}
        </>
    )
}

const A4Preview = forwardRef(function A4Preview(_, ref) {
    const { data, photo, template } = useResumeStore()
    const personal = data.personal

    const experience = (data.experience || []).filter(hasValidExp)
    const education = (data.education || []).filter(hasValidEdu)
    const projects = (data.projects || []).filter(hasValidProj)
    const skills = (data.skills || []).filter((skill) => skill?.trim())
    const languages = (data.languages || []).filter(hasValidLang)
    const links = data.links || {}
    const hasLinks = Object.values(links).some((val) => val?.trim())

    const contactItems = [
        personal.email && { icon: '✉', val: personal.email },
        personal.phone && { icon: '☎', val: personal.phone },
        personal.city && { icon: '·', val: personal.city },
        personal.linkedin && { icon: 'in', val: personal.linkedin },
    ].filter(Boolean)

    const hasName = personal.firstName || personal.lastName
    const showLeft = !!photo || skills.length > 0 || languages.length > 0 || hasLinks

    return (
        <div ref={ref} className={`a4 tmpl-${template}`} id="a4Preview">

            <div className="a4-head">
                {photo && <img className="a4-photo-head" src={photo} alt="Фото" />}
                <div className="a4-head-info">
                    {hasName && (
                        <div className="a4-name">
                            {escapeText(personal.firstName)}
                            {personal.firstName && personal.lastName ? ' ' : ''}
                            {escapeText(personal.lastName)}
                        </div>
                    )}
                    {personal.jobTitle && <div className="a4-title">{escapeText(personal.jobTitle)}</div>}
                    {contactItems.length > 0 && (
                        <div className="a4-contacts">
                            {contactItems.map((contact, index) => (
                                <span key={index} className="a4-contact">
                                    <span className="a4-contact-icon">{contact.icon}</span>
                                    {contact.val}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="a4-body">
                {showLeft && (
                    <div className="a4-left">
                        {photo && (
                            <div className="a4-photo-wrap">
                                <img className="a4-photo" src={photo} alt="Фото" />
                            </div>
                        )}
                        {skills.length > 0 && (
                            <div className="a4-sec a4-sec--left">
                                <div className="a4-sec-title">Навички</div>
                                <SkillPills skills={skills} />
                            </div>
                        )}
                        {languages.length > 0 && (
                            <div className="a4-sec a4-sec--left">
                                <div className="a4-sec-title">Мови</div>
                                <LangList languages={languages} />
                            </div>
                        )}
                        {hasLinks && (
                            <div className="a4-sec a4-sec--left">
                                <div className="a4-sec-title">Посилання</div>
                                <LinksList links={links} />
                            </div>
                        )}
                    </div>
                )}

                <div className="a4-right">
                    {data.summary?.trim() && (
                        <div className="a4-sec">
                            <div className="a4-sec-title">Про себе</div>
                            <div className="a4-about">{data.summary}</div>
                        </div>
                    )}
                    {experience.length > 0 && (
                        <div className="a4-sec">
                            <div className="a4-sec-title">Досвід</div>
                            <ExpList experience={experience} />
                        </div>
                    )}
                    {education.length > 0 && (
                        <div className="a4-sec">
                            <div className="a4-sec-title">Освіта</div>
                            <EduList education={education} />
                        </div>
                    )}
                    {projects.length > 0 && (
                        <div className="a4-sec">
                            <div className="a4-sec-title">Проєкти</div>
                            <ProjectsList projects={projects} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})

export default A4Preview