import client from './client'

export const getResumes = () => client.get('/resumes')
export const getResume = id => client.get(`/resumes/${id}`)
export const createResume = body => client.post('/resumes', body)
export const updateResume = (id, body) => client.patch(`/resumes/${id}`, body)
export const deleteResume = id => client.delete(`/resumes/${id}`)
export const analyzeGemini = (id, jobText) => client.post(`/resumes/${id}/analyze/gemini`, { jobText })
export const analyzeLocal = (id, jobText) => client.post(`/resumes/${id}/analyze`, { jobText })