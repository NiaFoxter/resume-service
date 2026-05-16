import { useState } from 'react'
import { useResumeStore } from '../../../store/resumeStore'

export default function SkillsForm({ onChange }) {
    const { data, setSkills } = useResumeStore()
    const [input, setInput] = useState('')

    function addSkill(e) {
        if (e.key !== 'Enter') return
        e.preventDefault()
        const val = input.trim()
        if (!val || data.skills.includes(val)) { setInput(''); return }
        setSkills([...data.skills, val])
        setInput('')
        onChange?.()
    }

    function remove(i) {
        setSkills(data.skills.filter((_, idx) => idx !== i)); onChange?.()
    }

    return (
        <div className="form-sec" id="form-skills">
            <div className="fg">
                <label>Навички (Enter для додавання)</label>
                <input id="skillInput" value={input} onChange={e => setInput(e.target.value)} onKeyDown={addSkill}
                    placeholder="Python, React, Figma..." />
            </div>
            <div id="skillTags" className="skill-tags-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {data.skills.map((sk, i) => (
                    <span key={i} className="tag">
                        {sk} <span className="tag-remove" style={{ cursor: 'pointer' }} onClick={() => remove(i)}>×</span>
                    </span>
                ))}
            </div>
        </div>
    )
}