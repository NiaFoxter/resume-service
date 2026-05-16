import { useRef } from 'react'
import { useResumeStore } from '../../store/resumeStore'
import { toast } from '../../store/toastStore'

export default function PhotoUpload({ onChange }) {
    const { photo, setPhoto } = useResumeStore()
    const inputRef = useRef(null)

    function handleFile(e) {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) { toast('Фото завелике. Максимум 2MB', 'warn'); e.target.value = ''; return }
        if (!file.type.startsWith('image/')) { toast('Тільки зображення', 'warn'); e.target.value = ''; return }
        const reader = new FileReader()
        reader.onload = ev => { setPhoto(ev.target.result); onChange?.() }
        reader.readAsDataURL(file)
    }

    function removePhoto() {
        setPhoto(null)
        if (inputRef.current) inputRef.current.value = ''
        onChange?.()
    }

    return (
        <div className="fg" id="photoField">
            <label>Фото</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {photo && (
                    <img src={photo} alt="Фото" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <input ref={inputRef} type="file" accept="image/*" id="f-photo" onChange={handleFile} />
                {photo && (
                    <button className="btn btn-danger btn-sm" id="removePhotoBtn" onClick={removePhoto}>Видалити</button>
                )}
            </div>
        </div>
    )
}