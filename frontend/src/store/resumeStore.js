import { create } from 'zustand'

const EMPTY_DATA = () => ({
    personal: { firstName: '', lastName: '', jobTitle: '', email: '', phone: '', city: '', linkedin: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    links: { github: '', website: '', telegram: '' },
})

export const useResumeStore = create((set, get) => ({
    currentId: null,
    template: 'classic',
    photo: null,
    title: 'Нове резюме',
    data: EMPTY_DATA(),

    setResume: (r) => {
        const d = r.data || {}
        set({
            currentId: r.id,
            template: r.template || 'classic',
            title: r.title || 'Нове резюме',
            photo: d.photo || r.photo || null,
            data: {
                personal: { ...EMPTY_DATA().personal, ...(d.personal || {}) },
                summary: d.summary || '',
                experience: d.experience || [],
                education: d.education || [],
                skills: d.skills || [],
                languages: d.languages || [],
                projects: d.projects || [],
                links: { ...EMPTY_DATA().links, ...(d.links || {}) },
            },
        })
    },

    reset: () => set({
        currentId: null, template: 'classic', photo: null,
        title: 'Нове резюме', data: EMPTY_DATA(),
    }),

    setTemplate: (template) => set({ template }),
    setTitle: (title) => set({ title }),
    setPhoto: (photo) => set({ photo }),

    setPersonal: (personal) => set(s => ({ data: { ...s.data, personal } })),
    setSummary: (summary) => set(s => ({ data: { ...s.data, summary } })),
    setLinks: (links) => set(s => ({ data: { ...s.data, links } })),
    setSkills: (skills) => set(s => ({ data: { ...s.data, skills } })),
    setLanguages: (languages) => set(s => ({ data: { ...s.data, languages } })),
    setExperience: (experience) => set(s => ({ data: { ...s.data, experience } })),
    setEducation: (education) => set(s => ({ data: { ...s.data, education } })),
    setProjects: (projects) => set(s => ({ data: { ...s.data, projects } })),

    toPayload: () => {
        const { title, template, data, photo } = get()
        const payload = { ...data }
        if (photo) payload.photo = photo
        else delete payload.photo
        return { title, template, data: payload }
    }
}))