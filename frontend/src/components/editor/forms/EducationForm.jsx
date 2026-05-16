import { useResumeStore } from '../../../store/resumeStore'

export default function EducationForm({ onChange }) {
    const { data, setEducation } = useResumeStore()
    const list = data.education

    function add() {
        setEducation([...list, { institution: '', degree: '', field: '', startYear: '', endYear: '' }])
        onChange?.()
    }
    function remove(i) { setEducation(list.filter((_, idx) => idx !== i)); onChange?.() }
    function update(i, field, value) {
        setEducation(list.map((e, idx) => idx === i ? { ...e, [field]: value } : e)); onChange?.()
    }

    return (
        <div className="form-sec" id="form-education">
            <div id="eduList">
                {list.map((e, i) => (
                    <div key={i} className="entry-card">
                        <div className="entry-card-head">
                            <div className="entry-card-label">Освіта {i + 1}</div>
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(i)}>✕</button>
                        </div>
                        <div className="fg"><label>Заклад освіти</label>
                            <input value={e.institution} onChange={ev => update(i, 'institution', ev.target.value)} /></div>
                        <div className="fg"><label>Ступінь / Спеціальність</label>
                            <input value={e.degree} onChange={ev => update(i, 'degree', ev.target.value)} /></div>
                        <div className="fg"><label>Галузь знань</label>
                            <input value={e.field} onChange={ev => update(i, 'field', ev.target.value)} /></div>
                        <div className="form-row">
                            <div className="fg"><label>Рік початку</label>
                                <input value={e.startYear} placeholder="2020" onChange={ev => update(i, 'startYear', ev.target.value)} /></div>
                            <div className="fg"><label>Рік закінчення</label>
                                <input value={e.endYear} placeholder="2024" onChange={ev => update(i, 'endYear', ev.target.value)} /></div>
                        </div>
                    </div>
                ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={add}>+ Додати освіту</button>
        </div>
    )
}