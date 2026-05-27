import { useProgress } from '../../hooks/useProgress'

const SECTIONS = [
    { id: 'personal', icon: '👤', label: 'Дані' },
    { id: 'summary', icon: '💬', label: 'Про себе' },
    { id: 'experience', icon: '💼', label: 'Досвід' },
    { id: 'education', icon: '🎓', label: 'Освіта' },
    { id: 'skills', icon: '⚡', label: 'Навички' },
    { id: 'languages', icon: '🌍', label: 'Мови' },
    { id: 'projects', icon: '🚀', label: 'Проєкти' },
    { id: 'links', icon: '🔗', label: 'Посилання' },
]

export default function SectionNav({ active, onChange }) {
    const { sections } = useProgress()

    return (
        <nav className="sec-nav">
            {SECTIONS.map((section) => (
                <div
                    key={section.id}
                    className={`sec-item ${active === section.id ? 'active' : ''}`}
                    onClick={() => onChange(section.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && onChange(section.id)}
                >
                    <span className="sec-icon">{section.icon}</span>
                    <span className="sec-label">{section.label}</span>
                    <span className="sec-check" id={`chk-${section.id}`}>{sections[section.id] ? '✓' : ''}</span>
                </div>
            ))}
        </nav>
    )
}