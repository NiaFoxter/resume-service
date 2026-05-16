import { forwardRef } from 'react'
import { useResumeStore } from '../../store/resumeStore'

const SINGLE_COL = ['minimalist', 'professional', 'elegant', 'creative']

function esc(str) {
    if (str == null) return ''
    return String(str)
}

const hasExp = e => e.position?.trim() || e.company?.trim()
const hasEdu = e => e.institution?.trim() || e.degree?.trim()
const hasProj = pr => pr.name?.trim()
const hasLang = l => l.language?.trim()

function SkillPills({ skills }) {
    const list = (skills || []).filter(s => s?.trim())
    if (!list.length) return null
    return (
        <div className="a4-skills-wrap">
            {list.slice(0, 12).map((sk, i) => (
                <span key={i} className="a4-skill-pill">{esc(sk)}</span>
            ))}
        </div>
    )
}

function LangList({ languages }) {
    const list = (languages || []).filter(hasLang)
    if (!list.length) return null
    return (
        <>
            {list.map((l, i) => (
                <div key={i} className="a4-lang">
                    <span className="a4-lang-name">{esc(l.language)}</span>
                    <span className="a4-lang-level">{esc(l.level)}</span>
                </div>
            ))}
        </>
    )
}

function LinksList({ links }) {
    const items = Object.entries(links || {}).filter(([, v]) => v?.trim())
    if (!items.length) return null
    const icons = { github: '⌥', website: '🌐', telegram: '✈' }
    return (
        <>
            {items.map(([k, v]) => (
                <div key={k} className="a4-link-item">
                    <span>{icons[k] || '🔗'}</span>
                    <a href={v} target="_blank" rel="noreferrer">{v}</a>
                </div>
            ))}
        </>
    )
}

function ExpList({ experience }) {
    const list = (experience || []).filter(hasExp)
    if (!list.length) return null
    return (
        <>
            {list.map((e, i) => {
                const period = [e.startDate, e.current ? 'тепер' : e.endDate].filter(Boolean).join(' — ')
                const bullets = (e.description || '').split('\n').filter(l => l.trim()).slice(0, 5)
                return (
                    <div key={i} className="a4-exp">
                        <div className="a4-exp-head">
                            <span className="a4-exp-title">{esc(e.position)}</span>
                            {period && <span className="a4-exp-period">{period}</span>}
                        </div>
                        {e.company && <div className="a4-exp-company">{esc(e.company)}</div>}
                        {bullets.length > 0 && (
                            <ul className="a4-exp-list">
                                {bullets.map((b, bi) => (
                                    <li key={bi}>{esc(b.replace(/^[•\-–▸]\s*/, ''))}</li>
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
    const list = (education || []).filter(hasEdu)
    if (!list.length) return null
    return (
        <>
            {list.map((e, i) => (
                <div key={i} className="a4-edu">
                    {e.degree && <div className="a4-edu-deg">{esc(e.degree)}</div>}
                    {e.institution && <div className="a4-edu-school">{esc(e.institution)}</div>}
                    {e.field && <div className="a4-edu-field">{esc(e.field)}</div>}
                    {(e.startYear || e.endYear) && (
                        <div className="a4-edu-year">
                            {esc(e.startYear)}{e.endYear ? ` – ${esc(e.endYear)}` : ''}
                        </div>
                    )}
                </div>
            ))}
        </>
    )
}

function ProjectsList({ projects }) {
    const list = (projects || []).filter(hasProj)
    if (!list.length) return null
    return (
        <>
            {list.map((pr, i) => (
                <div key={i} className="a4-proj">
                    <div className="a4-proj-head">
                        <span className="a4-proj-name">{esc(pr.name)}</span>
                        {pr.url && <a className="a4-proj-url" href={pr.url} target="_blank" rel="noreferrer">{pr.url}</a>}
                    </div>
                    {pr.description && <div className="a4-proj-desc">{esc(pr.description)}</div>}
                </div>
            ))}
        </>
    )
}

const A4Preview = forwardRef(function A4Preview(_, ref) {
    const { data, photo, template } = useResumeStore()
    const p = data.personal
    const singleCol = SINGLE_COL.includes(template)

    const experience = (data.experience || []).filter(hasExp)
    const education = (data.education || []).filter(hasEdu)
    const projects = (data.projects || []).filter(hasProj)
    const skills = (data.skills || []).filter(s => s?.trim())
    const languages = (data.languages || []).filter(hasLang)
    const links = data.links || {}
    const hasLinks = Object.values(links).some(v => v?.trim())

    const contactItems = [
        p.email && { icon: '✉', val: p.email },
        p.phone && { icon: '☎', val: p.phone },
        p.city && { icon: '⌖', val: p.city },
        p.linkedin && { icon: 'in', val: p.linkedin },
    ].filter(Boolean)

    const leftHasPhoto = !singleCol && !!photo
    const leftHasSkills = !singleCol && skills.length > 0
    const leftHasLangs = !singleCol && languages.length > 0
    const leftHasLinks = !singleCol && hasLinks
    const showLeft = leftHasPhoto || leftHasSkills || leftHasLangs || leftHasLinks

    return (
        <div ref={ref} className={`a4 tmpl-${template}`} id="a4Preview">

            {!singleCol && showLeft && (
                <div className="a4-left">
                    {photo && (
                        <div className="a4-photo-wrap">
                            <img className="a4-photo" src={photo} alt="Фото" />
                        </div>
                    )}
                    {skills.length > 0 && (
                        <div className="a4-sec">
                            <div className="a4-sec-title">Навички</div>
                            <SkillPills skills={skills} />
                        </div>
                    )}
                    {languages.length > 0 && (
                        <div className="a4-sec">
                            <div className="a4-sec-title">Мови</div>
                            <LangList languages={languages} />
                        </div>
                    )}
                    {hasLinks && (
                        <div className="a4-sec">
                            <div className="a4-sec-title">Посилання</div>
                            <LinksList links={links} />
                        </div>
                    )}
                </div>
            )}

            <div className="a4-right">

                <div className={`a4-head ${photo && singleCol ? 'has-photo' : ''}`}>
                    {photo && singleCol && (
                        <img className="a4-photo" src={photo} alt="Фото" />
                    )}
                    <div className="a4-head-info">
                        {(p.firstName || p.lastName) && (
                            <div className="a4-name">
                                {esc(p.firstName)}{p.firstName && p.lastName ? ' ' : ''}{esc(p.lastName)}
                            </div>
                        )}
                        {p.jobTitle && <div className="a4-title">{esc(p.jobTitle)}</div>}
                    </div>
                </div>

                {contactItems.length > 0 && (
                    <div className="a4-contacts">
                        {contactItems.map((c, i) => (
                            <span key={i} className="a4-contact">{c.icon} {c.val}</span>
                        ))}
                    </div>
                )}

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

                {singleCol && (
                    <>
                        {skills.length > 0 && (
                            <div className="a4-sec">
                                <div className="a4-sec-title">Навички</div>
                                <SkillPills skills={skills} />
                            </div>
                        )}
                        {languages.length > 0 && (
                            <div className="a4-sec">
                                <div className="a4-sec-title">Мови</div>
                                <LangList languages={languages} />
                            </div>
                        )}
                        {hasLinks && (
                            <div className="a4-sec">
                                <div className="a4-sec-title">Посилання</div>
                                <LinksList links={links} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
})

export default A4Preview