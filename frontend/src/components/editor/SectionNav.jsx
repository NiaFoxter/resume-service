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
            {SECTIONS.map(s => (
                <div
                    key={s.id}
                    className={`sec-item ${active === s.id ? 'active' : ''}`}
                    onClick={() => onChange(s.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={e => e.key === 'Enter' && onChange(s.id)}
                >
                    <span className="sec-icon">{s.icon}</span>
                    <span className="sec-label">{s.label}</span>
                    <span className="sec-check" id={`chk-${s.id}`}>{sections[s.id] ? '✓' : ''}</span>
                </div>
            ))}
        </nav>
    )
}