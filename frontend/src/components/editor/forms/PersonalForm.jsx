import { useResumeStore } from '../../../store/resumeStore'
import PhotoUpload from '../PhotoUpload'

export default function PersonalForm({ onChange }) {
    const { data, setPersonal } = useResumeStore()
    const personal = data.personal

    function set(field, value) {
        setPersonal({ ...personal, [field]: value })
        onChange?.()
    }

    return (
        <div className="form-sec active" id="form-personal">
            <PhotoUpload onChange={onChange} />
            <div className="form-row">
                <div className="fg"><label>Ім'я</label>
                    <input id="f-firstName" value={personal.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
                <div className="fg"><label>Прізвище</label>
                    <input id="f-lastName" value={personal.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
            </div>
            <div className="fg"><label>Посада / Спеціальність</label>
                <input id="f-jobTitle" value={personal.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} /></div>
            <div className="form-row">
                <div className="fg"><label>Email</label>
                    <input id="f-email" type="email" value={personal.email} onChange={(e) => set('email', e.target.value)} /></div>
                <div className="fg"><label>Телефон</label>
                    <input id="f-phone" value={personal.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            </div>
            <div className="form-row">
                <div className="fg"><label>Місто</label>
                    <input id="f-city" value={personal.city} onChange={(e) => set('city', e.target.value)} /></div>
                <div className="fg"><label>LinkedIn</label>
                    <input id="f-linkedin" value={personal.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/username або username" /></div>
            </div>
        </div>
    )
}