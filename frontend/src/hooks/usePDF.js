import { useCallback } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { updateResume } from '../api/resumes'
import { toast } from '../store/toastStore'

export function usePDF(previewRef) {
    const currentId = useResumeStore((s) => s.currentId)
    const title = useResumeStore((s) => s.title)
    const getPayload = useResumeStore((s) => s.getPayload)

    const downloadPDF = useCallback(async () => {
        if (!currentId) { toast('Спочатку збережіть резюме', 'warn'); return false }
        if (!previewRef?.current) { toast("Немає прев'ю", 'bad'); return false }
        if (!window.html2pdf) { toast('Бібліотеку PDF не завантажено', 'bad'); return false }

        let cloneWrapper = null

        try {
            await updateResume(currentId, getPayload())
            await new Promise((resolve) => setTimeout(resolve, 120))

            const fileName = (title || 'resume')
                .replace(/[^\wа-яА-ЯіїєґІЇЄҐ\-\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim() || 'resume'

            const allCSS = [...document.styleSheets]
                .map((sheet) => {
                    try {
                        return [...sheet.cssRules].map((cssRule) => cssRule.cssText).join('\n')
                    } catch {
                        return ''
                    }
                })
                .join('\n')

            const pdfOverride = `
                * { transition: none !important; animation: none !important; }
                .a4 { box-shadow: none !important; border-radius: 0 !important; width: 794px !important; overflow: visible !important; }
                .a4-body { align-items: stretch !important; }
                .a4-left { min-height: auto !important; align-self: stretch !important; }
                .empty-section { display: none !important; }
            `

            cloneWrapper = document.createElement('div')
            cloneWrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;'
            cloneWrapper.innerHTML = `<style>${allCSS}\n${pdfOverride}</style>${previewRef.current.outerHTML}`
            document.body.appendChild(cloneWrapper)

            const pdfTarget = cloneWrapper.querySelector('.a4')
            if (!pdfTarget) throw new Error("Не знайдено блок прев'ю для PDF")

            await window.html2pdf()
                .set({
                    margin: 0,
                    filename: `${fileName}.pdf`,
                    image: { type: 'jpeg', quality: 0.97 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                })
                .from(pdfTarget)
                .save()

            toast('PDF завантажено', 'ok')
            return true
        } catch (error) {
            toast('Помилка PDF: ' + error.message, 'bad')
            return false
        } finally {
            cloneWrapper?.parentNode?.removeChild(cloneWrapper)
        }
    }, [currentId, title, getPayload, previewRef])

    return { downloadPDF }
}