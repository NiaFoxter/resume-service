import axios from 'axios'

const client = axios.create({ baseURL: '' })

client.interceptors.request.use(cfg => {
    const token = localStorage.getItem('token')
    if (token) cfg.headers.Authorization = `Bearer ${token}`
    return cfg
})

client.interceptors.response.use(
    res => res.data?.data ?? res.data,
    err => {
        const msg = err.response?.data?.error || err.message || 'Помилка сервера'
        throw new Error(msg)
    }
)

export default client