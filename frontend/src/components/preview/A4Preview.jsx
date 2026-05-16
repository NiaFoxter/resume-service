import { forwardRef } from 'react'
import { useResumeStore } from '../../store/resumeStore'

const SINGLE_COL = ['minimalist', 'professional', 'elegant', 'creative']

function esc(str) {
    if (str == null) return ''
    return String(str)
}

function SkillPills({ skills }) {
    if (!skills?.length) return null
    return (
        <div className="a4-skills-wrap">
            {skills.slice(0, 12).map((sk, i) => (
                <span key={i} className="a4-skill-pill">{esc(sk)}</span>
            ))}
        </div>
    )
}

function LangList({ languages }) {
    if (!languages?.length) return null
    return (
        <>
            {languages.map((l, i) => (
                <div key={i} className="a4-lang">
                    <span className="a4-lang-name">{esc(l.language)}</span>
                    <span className="a4-lang-level">{esc(l.level)}</span>
                </div>
            ))}
        </>
    )
}

function LinksList({ links }) {
    const items = Object.entries(links || {}).filter(([, v]) => v)
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
    if (!experience?.length) return null
    return (
        <>
            {experience.map((e, i) => {
                const period = [e.startDate, e.current ? 'тепер' : e.endDate].filter(Boolean).join(' — ')
                const bullets = (e.description || '').split('\n').filter(l => l.trim()).slice(0, 5)
                return (
                    <div key={i} className="a4-exp">
                        <div className="a4-exp-head">
                            <span className="a4-exp-title">{esc(e.position)}</span>
                            {period && <span className="a4-exp-period">{period}</span>}
                        </div>
                        <div className="a4-exp-company">{esc(e.company)}</div>
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
    if (!education?.length) return null
    return (
        <>
            {education.map((e, i) => (
                <div key={i} className="a4-edu">
                    <div className="a4-edu-deg">{esc(e.degree)}</div>
                    <div className="a4-edu-school">{esc(e.institution)}</div>
                    <div className="a4-edu-year">
                        {esc(e.startYear)}{e.endYear ? ` – ${esc(e.endYear)}` : ''}
                    </div>
                </div>
            ))}
        </>
    )
}

function ProjectsList({ projects }) {
    if (!projects?.length) return null
    return (
        <>
            {projects.map((pr, i) => (
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

// Main preview

const A4Preview = forwardRef(function A4Preview(_, ref) {
    const { data, photo, template } = useResumeStore()
    const p = data.personal
    const singleCol = SINGLE_COL.includes(template)

    const contactItems = [
        p.email && { icon: '✉', val: p.email },
        p.phone && { icon: '☎', val: p.phone },
        p.city && { icon: '⌖', val: p.city },
        p.linkedin && { icon: 'in', val: p.linkedin },
    ].filter(Boolean)

    const hasLinks = Object.values(data.links).some(v => v)

    return (
        <div ref={ref} className={`a4 tmpl-${template}`} id="a4Preview">
            {/* LEFT column (two-col templates only) */}
            {!singleCol && (
                <div className="a4-left">
                    {photo && (
                        <div className="a4-photo-wrap">
                            <img className="a4-photo" src={photo} alt="Фото" />
                        </div>
                    )}

                    {data.skills.length > 0 && (
                        <div className="a4-sec" id="pvSkillsSec">
                            <div className="a4-sec-title">Навички</div>
                            <SkillPills skills={data.skills} />
                        </div>
                    )}

                    {data.languages.length > 0 && (
                        <div className="a4-sec" id="pvLangsSec">
                            <div className="a4-sec-title">Мови</div>
                            <LangList languages={data.languages} />
                        </div>
                    )}

                    {hasLinks && (
                        <div className="a4-sec" id="pvLinksSec">
                            <div className="a4-sec-title">Посилання</div>
                            <LinksList links={data.links} />
                        </div>
                    )}
                </div>
            )}

            {/* RIGHT / main column */}
            <div className="a4-right">
                {/* Header */}
                <div className={`a4-head ${photo && singleCol ? 'has-photo' : ''}`} id="a4Head">
                    {photo && singleCol && (
                        <img className="a4-photo" id="pvPhoto" src={photo} alt="Фото" />
                    )}
                    <div className="a4-head-info">
                        {(p.firstName || p.lastName) && (
                            <div className="a4-name">{esc(p.firstName)} {esc(p.lastName)}</div>
                        )}
                        {p.jobTitle && <div className="a4-title">{esc(p.jobTitle)}</div>}
                    </div>
                </div>

                {/* Contacts */}
                {contactItems.length > 0 && (
                    <div className="a4-contacts" id="pvContacts">
                        {contactItems.map((c, i) => (
                            <span key={i} className="a4-contact">{c.icon} {c.val}</span>
                        ))}
                    </div>
                )}

                {/* Summary */}
                {data.summary && (
                    <div className="a4-sec" id="pvAboutSec">
                        <div className="a4-sec-title">Про себе</div>
                        <div className="a4-about" id="pvAbout">{data.summary}</div>
                    </div>
                )}

                {/* Experience */}
                {data.experience.length > 0 && (
                    <div className="a4-sec" id="pvExpSec">
                        <div className="a4-sec-title">Досвід</div>
                        <div id="pvExp"><ExpList experience={data.experience} /></div>
                    </div>
                )}

                {/* Education */}
                {data.education.length > 0 && (
                    <div className="a4-sec" id="pvEduSec">
                        <div className="a4-sec-title">Освіта</div>
                        <div id="pvEdu"><EduList education={data.education} /></div>
                    </div>
                )}

                {/* Projects */}
                {data.projects.length > 0 && (
                    <div className="a4-sec" id="pvProjSec">
                        <div className="a4-sec-title">Проєкти</div>
                        <div id="pvProjects"><ProjectsList projects={data.projects} /></div>
                    </div>
                )}

                {/* Single-col extras: skills / langs / links at bottom */}
                {singleCol && (
                    <div id="pvRightExtra">
                        {data.skills.length > 0 && (
                            <div className="a4-sec">
                                <div className="a4-sec-title">Навички</div>
                                <SkillPills skills={data.skills} />
                            </div>
                        )}
                        {data.languages.length > 0 && (
                            <div className="a4-sec">
                                <div className="a4-sec-title">Мови</div>
                                <LangList languages={data.languages} />
                            </div>
                        )}
                        {hasLinks && (
                            <div className="a4-sec pv-links">
                                <div className="a4-sec-title">Посилання</div>
                                <LinksList links={data.links} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
})

export default A4Preview