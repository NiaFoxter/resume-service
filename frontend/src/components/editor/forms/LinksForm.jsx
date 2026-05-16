import { useResumeStore } from '../../../store/resumeStore'

export default function LinksForm({ onChange }) {
    const { data, setLinks } = useResumeStore()
    const links = data.links

    function set(field, value) { setLinks({ ...links, [field]: value }); onChange?.() }

    return (
        <div className="form-sec" id="form-links">
            <div className="fg"><label>GitHub</label>
                <input id="f-github" value={links.github} onChange={e => set('github', e.target.value)}
                    placeholder="https://github.com/username" /></div>
            <div className="fg"><label>Сайт / Портфоліо</label>
                <input id="f-website" value={links.website} onChange={e => set('website', e.target.value)}
                    placeholder="https://mysite.com" /></div>
            <div className="fg"><label>Telegram</label>
                <input id="f-telegram" value={links.telegram} onChange={e => set('telegram', e.target.value)}
                    placeholder="@username" /></div>
        </div>
    )
}