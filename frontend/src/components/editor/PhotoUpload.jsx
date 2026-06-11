import { useRef, useState } from 'react'
import { useResumeStore } from '../../store/resumeStore'
import { toast } from '../../store/toastStore'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const CROP_SIZE = 420

export default function PhotoUpload({ onChange }) {
    const { photo, setPhoto } = useResumeStore()
    const inputRef = useRef(null)
    const [sourcePhoto, setSourcePhoto] = useState(null)
    const [crop, setCrop] = useState({ x: 50, y: 50, zoom: 1 })

    function handleFile(e) {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > MAX_FILE_SIZE) {
            toast('Фото завелике. Максимум 2MB', 'warn')
            e.target.value = ''
            return
        }

        if (!file.type.startsWith('image/')) {
            toast('Тільки зображення', 'warn')
            e.target.value = ''
            return
        }

        const reader = new FileReader()
        reader.onload = (ev) => {
            const image = ev.target.result
            setSourcePhoto(image)
            setPhoto(image)
            setCrop({ x: 50, y: 50, zoom: 1 })
            onChange?.(true)
        }
        reader.readAsDataURL(file)
    }

    function updateCrop(field, value) {
        setCrop((current) => ({ ...current, [field]: Number(value) }))
    }

    function applyCrop() {
        const imageSrc = sourcePhoto || photo
        if (!imageSrc) return

        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = CROP_SIZE
            canvas.height = CROP_SIZE

            const ctx = canvas.getContext('2d')
            const baseScale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height)
            const scale = baseScale * crop.zoom
            const width = img.width * scale
            const height = img.height * scale
            const x = (CROP_SIZE - width) * (crop.x / 100)
            const y = (CROP_SIZE - height) * (crop.y / 100)

            ctx.drawImage(img, x, y, width, height)
            setPhoto(canvas.toDataURL('image/jpeg', 0.92))
            onChange?.(true)
        }
        img.src = imageSrc
    }

    function removePhoto() {
        setPhoto(null)
        setSourcePhoto(null)
        setCrop({ x: 50, y: 50, zoom: 1 })
        if (inputRef.current) inputRef.current.value = ''
        onChange?.(true)
    }

    const previewPhoto = sourcePhoto || photo

    return (
        <div className="fg" id="photoField">
            <label>Фото</label>

            <div className="photo-upload-row">
                {previewPhoto && (
                    <div className="photo-crop-preview">
                        <img
                            src={previewPhoto}
                            alt="Фото"
                            style={{
                                objectPosition: `${crop.x}% ${crop.y}%`,
                                transform: `scale(${crop.zoom})`,
                            }}
                        />
                    </div>
                )}

                <div className="photo-upload-actions">
                    <input ref={inputRef} type="file" accept="image/*" id="f-photo" onChange={handleFile} />
                    {previewPhoto && (
                        <div className="photo-buttons">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={applyCrop}>Застосувати</button>
                            <button type="button" className="btn btn-danger btn-sm" id="removePhotoBtn" onClick={removePhoto}>Видалити</button>
                        </div>
                    )}
                </div>
            </div>

            {previewPhoto && (
                <div className="photo-crop-controls">
                    <label>
                        Горизонтально
                        <input type="range" min="0" max="100" value={crop.x} onChange={(e) => updateCrop('x', e.target.value)} />
                    </label>
                    <label>
                        Вертикально
                        <input type="range" min="0" max="100" value={crop.y} onChange={(e) => updateCrop('y', e.target.value)} />
                    </label>
                    <label>
                        Масштаб
                        <input type="range" min="1" max="2" step="0.05" value={crop.zoom} onChange={(e) => updateCrop('zoom', e.target.value)} />
                    </label>
                </div>
            )}
        </div>
    )
}
