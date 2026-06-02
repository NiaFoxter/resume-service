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

const EMPTY_STATE = () => ({
    currentId: null,
    template: 'classic',
    photo: null,
    title: 'Нове резюме',
    data: EMPTY_DATA(),
})

export const useResumeStore = create((set, get) => ({
    ...EMPTY_STATE(),

    setResume: (r) => {
        const rdata = r.data || {}
        const photo = Object.prototype.hasOwnProperty.call(rdata, 'photo') ? rdata.photo : r.photo

        set({
            currentId: r.id,
            template: r.template || 'classic',
            title: r.title || 'Нове резюме',
            photo: photo || null,
            data: {
                personal: { ...EMPTY_DATA().personal, ...(rdata.personal || {}) },
                summary: rdata.summary || '',
                experience: rdata.experience || [],
                education: rdata.education || [],
                skills: rdata.skills || [],
                languages: rdata.languages || [],
                projects: rdata.projects || [],
                links: { ...EMPTY_DATA().links, ...(rdata.links || {}) },
            },
        })
    },

    reset: () => set(EMPTY_STATE()),

    setTemplate: (template) => set({ template }),
    setTitle: (title) => set({ title }),
    setPhoto: (photo) => set({ photo }),

    setPersonal: (personal) => set((s) => ({ data: { ...s.data, personal } })),
    setSummary: (summary) => set((s) => ({ data: { ...s.data, summary } })),
    setLinks: (links) => set((s) => ({ data: { ...s.data, links } })),
    setSkills: (skills) => set((s) => ({ data: { ...s.data, skills } })),
    setLanguages: (languages) => set((s) => ({ data: { ...s.data, languages } })),
    setExperience: (experience) => set((s) => ({ data: { ...s.data, experience } })),
    setEducation: (education) => set((s) => ({ data: { ...s.data, education } })),
    setProjects: (projects) => set((s) => ({ data: { ...s.data, projects } })),

    getPayload: () => {
        const { title, template, data, photo } = get()
        const payload = { ...data, photo: photo || null }
        return { title, template, data: payload }
    },
}))