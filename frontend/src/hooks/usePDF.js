import { useCallback } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { updateResume } from '../api/resumes'
import { toast } from '../store/toastStore'

export function usePDF(previewRef) {
    const { currentId, title, toPayload } = useResumeStore()

    const downloadPDF = useCallback(async () => {
        if (!currentId) { toast('Спочатку збережіть резюме', 'warn'); return false }
        if (!previewRef?.current) { toast('Немає прев\'ю', 'bad'); return false }

        try {
            await updateResume(currentId, toPayload())
            await new Promise(r => setTimeout(r, 120))

            const fname = (title || 'resume')
                .replace(/[^\wа-яА-ЯіїєґІЇЄҐ\-\s]/g, '').trim() || 'resume'

            const allCSS = [...document.styleSheets].map(sheet => {
                try { return [...sheet.cssRules].map(r => r.cssText).join('\n') } catch { return '' }
            }).join('\n')

            const pdfOverride = `
        * { transition: none !important; animation: none !important; }
        .a4 { box-shadow: none !important; border-radius: 0 !important; width: 794px !important; }
        .a4-left { min-height: 100vh; }
        .empty-section { display: none !important; }
      `

            const wrap = document.createElement('div')
            wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;'
            wrap.innerHTML = `<style>${allCSS}\n${pdfOverride}</style>${previewRef.current.outerHTML}`
            document.body.appendChild(wrap)

            await window.html2pdf().set({
                margin: 0,
                filename: fname + '.pdf',
                image: { type: 'jpeg', quality: 0.97 },
                html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(wrap.querySelector('.a4')).save()

            document.body.removeChild(wrap)
            toast('PDF завантажено ✓', 'ok')
            return true
        } catch (e) {
            toast('Помилка PDF: ' + e.message, 'bad')
            return false
        }
    }, [currentId, title, toPayload, previewRef])

    return { downloadPDF }
}