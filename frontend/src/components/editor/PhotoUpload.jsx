import { useEffect, useMemo, useRef, useState } from 'react'
import { useResumeStore } from '../../store/resumeStore'
import { toast } from '../../store/toastStore'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const MIN_SCALE = 1
const MAX_SCALE = 3
const SCALE_STEP = 0.12
const DEFAULT_POSITION = { x: 50, y: 50, scale: 1 }

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function normalizePosition(position) {
    return {
        x: clamp(Number(position?.x ?? DEFAULT_POSITION.x), 0, 100),
        y: clamp(Number(position?.y ?? DEFAULT_POSITION.y), 0, 100),
        scale: clamp(Number(position?.scale ?? DEFAULT_POSITION.scale), MIN_SCALE, MAX_SCALE),
    }
}

function getPhotoStyle(position) {
    const pos = normalizePosition(position)
    return {
        objectPosition: `${pos.x}% ${pos.y}%`,
        transform: `scale(${pos.scale})`,
        transformOrigin: `${pos.x}% ${pos.y}%`,
    }
}

export default function PhotoUpload({ onChange }) {
    const { photo, photoPosition, setPhoto, setPhotoPosition } = useResumeStore()
    const inputRef = useRef(null)
    const dragRef = useRef(null)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [draftPosition, setDraftPosition] = useState(normalizePosition(photoPosition))

    const savedPhotoStyle = useMemo(() => getPhotoStyle(photoPosition), [photoPosition])
    const draftPhotoStyle = useMemo(() => getPhotoStyle(draftPosition), [draftPosition])

    useEffect(() => {
        if (!isEditorOpen) return undefined

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        function stopDrag() {
            dragRef.current = null
            document.body.classList.remove('photo-dragging')
        }

        function handlePointerMove(event) {
            const drag = dragRef.current

            if (!drag) return

            event.preventDefault()

            const dx = ((event.clientX - drag.startX) / drag.width) * 100
            const dy = ((event.clientY - drag.startY) / drag.height) * 100

            setDraftPosition((current) => ({
                ...current,
                x: clamp(drag.x - dx, 0, 100),
                y: clamp(drag.y - dy, 0, 100),
            }))
        }

        function closeOnEscape(event) {
            if (event.key === 'Escape') closeEditor()
        }

        function blockPageDrag(event) {
            if (dragRef.current) event.preventDefault()
        }

        document.addEventListener('pointermove', handlePointerMove, { passive: false })
        document.addEventListener('pointerup', stopDrag)
        document.addEventListener('pointercancel', stopDrag)
        document.addEventListener('keydown', closeOnEscape)
        document.addEventListener('dragstart', blockPageDrag, { passive: false })
        document.addEventListener('selectstart', blockPageDrag, { passive: false })

        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener('pointermove', handlePointerMove)
            document.removeEventListener('pointerup', stopDrag)
            document.removeEventListener('pointercancel', stopDrag)
            document.removeEventListener('keydown', closeOnEscape)
            document.removeEventListener('dragstart', blockPageDrag)
            document.removeEventListener('selectstart', blockPageDrag)
            stopDrag()
        }
    }, [isEditorOpen])

    function openEditor() {
        if (!photo) return
        setDraftPosition(normalizePosition(photoPosition))
        setIsEditorOpen(true)
    }

    function closeEditor() {
        setIsEditorOpen(false)
    }

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
            const nextPosition = { ...DEFAULT_POSITION }
            setPhoto(ev.target.result)
            setPhotoPosition(nextPosition)
            setDraftPosition(nextPosition)
            setIsEditorOpen(true)
            onChange?.(true)
        }
        reader.readAsDataURL(file)
    }

    function startDrag(event) {
        if (!photo) return
        event.preventDefault()
        event.stopPropagation()

        const rect = event.currentTarget.getBoundingClientRect()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            width: rect.width || 1,
            height: rect.height || 1,
            x: draftPosition.x,
            y: draftPosition.y,
        }
        document.body.classList.add('photo-dragging')
    }

    function changeScale(delta) {
        setDraftPosition((current) => ({
            ...current,
            scale: clamp(Number((current.scale + delta).toFixed(2)), MIN_SCALE, MAX_SCALE),
        }))
    }

    function handleWheel(event) {
        event.preventDefault()
        changeScale(event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP)
    }

    function resetPosition() {
        setDraftPosition({ ...DEFAULT_POSITION })
    }

    function applyPosition() {
        setPhotoPosition(normalizePosition(draftPosition))
        setIsEditorOpen(false)
        onChange?.(true)
    }

    function removePhoto() {
        setPhoto(null)
        setPhotoPosition({ ...DEFAULT_POSITION })
        setDraftPosition({ ...DEFAULT_POSITION })
        setIsEditorOpen(false)
        if (inputRef.current) inputRef.current.value = ''
        onChange?.(true)
    }

    return (
        <div className="fg" id="photoField">
            <label>Фото</label>
            <div className="photo-editor">
                {photo ? (
                    <button type="button" className="photo-form-preview" onClick={openEditor}>
                        <span className="photo-form-circle">
                            <img src={photo} alt="Фото" draggable="false" style={savedPhotoStyle} />
                        </span>
                        <span>Натисніть на фото, щоб налаштувати кадр</span>
                    </button>
                ) : (
                    <label className="photo-empty" htmlFor="f-photo">
                        Додати фото
                    </label>
                )}

                <div className="photo-actions">
                    <input ref={inputRef} type="file" accept="image/*" id="f-photo" onChange={handleFile} />
                    {photo && (
                        <div className="photo-buttons">
                            <label className="photo-upload-link" htmlFor="f-photo">Завантажити інше фото</label>
                            <button type="button" className="btn btn-danger btn-sm" onClick={removePhoto}>Видалити</button>
                        </div>
                    )}
                </div>
            </div>

            {isEditorOpen && photo && (
                <div
                    className="photo-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Налаштування фото"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeEditor()
                    }}
                >
                    <div className="photo-modal-card">
                        <div className="photo-modal-head">
                            <div>
                                <strong>Налаштування фото</strong>
                                <p>Перетягніть фото або прокрутіть колесо миші, щоб налаштувати кадр.</p>
                            </div>
                            <button type="button" className="photo-modal-close" onClick={closeEditor} aria-label="Закрити">×</button>
                        </div>

                        <div className="photo-modal-workspace">
                            <div
                                className="photo-stage"
                                onPointerDown={startDrag}
                                onWheel={handleWheel}
                                onDoubleClick={resetPosition}
                                onDragStart={(event) => event.preventDefault()}
                            >
                                <img src={photo} alt="Фото" className="photo-stage-original" draggable="false" style={draftPhotoStyle} />
                            </div>

                            <div className="photo-round-preview">
                                <span>Превʼю</span>
                                <div onPointerDown={startDrag} onWheel={handleWheel} onDragStart={(event) => event.preventDefault()}>
                                    <img src={photo} alt="Превʼю фото" draggable="false" style={draftPhotoStyle} />
                                </div>
                            </div>
                        </div>

                        <div className="photo-crop-tools">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => changeScale(-SCALE_STEP)}>Віддалити</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => changeScale(SCALE_STEP)}>Наблизити</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={resetPosition}>Показати повністю</button>
                        </div>

                        <div className="photo-modal-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={closeEditor}>Скасувати</button>
                            <button type="button" className="btn btn-copper btn-sm" onClick={applyPosition}>Застосувати</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}