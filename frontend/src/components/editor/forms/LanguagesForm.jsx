import { useResumeStore } from '../../../store/resumeStore'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Рідна']

export default function LanguagesForm({ onChange }) {
    const { data, setLanguages } = useResumeStore()
    const list = data.languages

    function add() { setLanguages([...list, { language: '', level: 'B1' }]); onChange?.() }
    function remove(i) { setLanguages(list.filter((_, idx) => idx !== i)); onChange?.() }
    function update(i, field, value) {
        setLanguages(list.map((l, idx) => idx === i ? { ...l, [field]: value } : l)); onChange?.()
    }

    return (
        <div className="form-sec" id="form-languages">
            <div id="langList">
                {list.map((l, i) => (
                    <div key={i} className="entry-card">
                        <div className="entry-card-head">
                            <div className="entry-card-label">Мова {i + 1}</div>
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(i)}>✕</button>
                        </div>
                        <div className="form-row">
                            <div className="fg"><label>Мова</label>
                                <input value={l.language} onChange={ev => update(i, 'language', ev.target.value)} /></div>
                            <div className="fg"><label>Рівень</label>
                                <select value={l.level} onChange={ev => update(i, 'level', ev.target.value)}>
                                    {LEVELS.map(lv => <option key={lv}>{lv}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={add}>+ Додати мову</button>
        </div>
    )
}