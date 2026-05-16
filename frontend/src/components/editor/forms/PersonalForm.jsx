import { useResumeStore } from '../../../store/resumeStore'
import PhotoUpload from '../PhotoUpload'

export default function PersonalForm({ onChange }) {
    const { data, setPersonal } = useResumeStore()
    const p = data.personal

    function set(field, value) {
        setPersonal({ ...p, [field]: value })
        onChange?.()
    }

    return (
        <div className="form-sec active" id="form-personal">
            <PhotoUpload onChange={onChange} />
            <div className="form-row">
                <div className="fg"><label>Ім'я</label>
                    <input id="f-firstName" value={p.firstName} onChange={e => set('firstName', e.target.value)} /></div>
                <div className="fg"><label>Прізвище</label>
                    <input id="f-lastName" value={p.lastName} onChange={e => set('lastName', e.target.value)} /></div>
            </div>
            <div className="fg"><label>Посада / Спеціальність</label>
                <input id="f-jobTitle" value={p.jobTitle} onChange={e => set('jobTitle', e.target.value)} /></div>
            <div className="form-row">
                <div className="fg"><label>Email</label>
                    <input id="f-email" type="email" value={p.email} onChange={e => set('email', e.target.value)} /></div>
                <div className="fg"><label>Телефон</label>
                    <input id="f-phone" value={p.phone} onChange={e => set('phone', e.target.value)} /></div>
            </div>
            <div className="form-row">
                <div className="fg"><label>Місто</label>
                    <input id="f-city" value={p.city} onChange={e => set('city', e.target.value)} /></div>
                <div className="fg"><label>LinkedIn</label>
                    <input id="f-linkedin" value={p.linkedin} onChange={e => set('linkedin', e.target.value)} /></div>
            </div>
        </div>
    )
}