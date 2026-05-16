import { useResumeStore } from '../../../store/resumeStore'

export default function SummaryForm({ onChange }) {
    const { data, setSummary } = useResumeStore()
    return (
        <div className="form-sec" id="form-summary">
            <div className="fg">
                <label>Коротко про себе</label>
                <textarea id="f-summary" rows="6" value={data.summary}
                    onChange={e => { setSummary(e.target.value); onChange?.() }}
                    placeholder="Досвідчений розробник з 5 роками досвіду..." />
            </div>
        </div>
    )
}