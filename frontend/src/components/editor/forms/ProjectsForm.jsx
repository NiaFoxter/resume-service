import { useResumeStore } from '../../../store/resumeStore'

export default function ProjectsForm({ onChange }) {
    const { data, setProjects } = useResumeStore()
    const list = data.projects

    function add() { setProjects([...list, { name: '', url: '', description: '' }]); onChange?.() }
    function remove(i) { setProjects(list.filter((_, idx) => idx !== i)); onChange?.() }
    function update(i, field, value) {
        setProjects(list.map((p, idx) => idx === i ? { ...p, [field]: value } : p)); onChange?.()
    }

    return (
        <div className="form-sec" id="form-projects">
            <div id="projList">
                {list.map((p, i) => (
                    <div key={i} className="entry-card">
                        <div className="entry-card-head">
                            <div className="entry-card-label">Проєкт {i + 1}</div>
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(i)}>✕</button>
                        </div>
                        <div className="fg"><label>Назва</label>
                            <input value={p.name} onChange={ev => update(i, 'name', ev.target.value)} /></div>
                        <div className="fg"><label>Посилання (GitHub / URL)</label>
                            <input value={p.url} onChange={ev => update(i, 'url', ev.target.value)} /></div>
                        <div className="fg"><label>Опис</label>
                            <textarea rows="2" value={p.description} onChange={ev => update(i, 'description', ev.target.value)} /></div>
                    </div>
                ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={add}>+ Додати проєкт</button>
        </div>
    )
}