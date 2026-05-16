import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import * as authApi from '../api/auth'
import { useEffect } from 'react'

export function useAuth() {
    const { token, user, setAuth, clearAuth, closeLogin, closeRegister } = useAuthStore()
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) return
        authApi.me().catch(() => {
            clearAuth()
            toast('Сесія закінчилась, увійдіть знову', 'warn')
        })
    }, [])

    async function doLogin(email, password) {
        const d = await authApi.login(email, password)
        setAuth(d.token, { firstName: d.firstName, lastName: d.lastName, userId: d.userId })
        closeLogin()
        toast(`Вітаємо, ${d.firstName}!`, 'ok')
        navigate('/dashboard')
    }

    async function doRegister(email, password, firstName, lastName) {
        const d = await authApi.register(email, password, firstName, lastName)
        setAuth(d.token, { firstName: d.firstName, lastName: d.lastName, userId: d.userId })
        closeRegister()
        toast(`Акаунт створено! Вітаємо, ${d.firstName} 🎉`, 'ok')
        navigate('/dashboard')
    }

    function logout() {
        clearAuth()
        navigate('/')
        toast('Ви вийшли з акаунту')
    }

    return { token, user, doLogin, doRegister, logout }
}