import { useResumeStore } from '../../../store/resumeStore'

export default function ExperienceForm({ onChange }) {
    const { data, setExperience } = useResumeStore()
    const list = data.experience

    function add() {
        setExperience([...list, { position: '', company: '', startDate: '', endDate: '', current: false, description: '' }])
        onChange?.()
    }

    function remove(i) {
        setExperience(list.filter((_, idx) => idx !== i)); onChange?.()
    }

    function update(i, field, value) {
        const next = list.map((e, idx) => idx === i ? { ...e, [field]: value } : e)
        setExperience(next); onChange?.()
    }

    return (
        <div className="form-sec" id="form-experience">
            <div id="expList">
                {list.map((e, i) => (
                    <div key={i} className="entry-card">
                        <div className="entry-card-head">
                            <div className="entry-card-label">Місце роботи {i + 1}</div>
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(i)}>✕</button>
                        </div>
                        <div className="form-row">
                            <div className="fg"><label>Посада</label>
                                <input value={e.position} onChange={ev => update(i, 'position', ev.target.value)} /></div>
                            <div className="fg"><label>Компанія</label>
                                <input value={e.company} onChange={ev => update(i, 'company', ev.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div className="fg"><label>Початок</label>
                                <input value={e.startDate} placeholder="09/2022" onChange={ev => update(i, 'startDate', ev.target.value)} /></div>
                            <div className="fg"><label>Кінець</label>
                                <input value={e.endDate} disabled={e.current} placeholder="або порожнє"
                                    onChange={ev => update(i, 'endDate', ev.target.value)} /></div>
                        </div>
                        <div className="fg">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 7, textTransform: 'none', fontSize: 13 }}>
                                <input type="checkbox" checked={e.current} onChange={ev => update(i, 'current', ev.target.checked)}
                                    style={{ width: 'auto' }} />
                                Теперішнє місце роботи
                            </label>
                        </div>
                        <div className="fg"><label>Опис обов'язків</label>
                            <textarea rows="3" value={e.description} onChange={ev => update(i, 'description', ev.target.value)} /></div>
                    </div>
                ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={add}>+ Додати місце роботи</button>
        </div>
    )
}