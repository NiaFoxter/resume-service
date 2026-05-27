import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import * as authApi from '../api/auth'

export function useAuth() {
    const { token, user, setAuth, clearAuth, closeLogin, closeRegister } = useAuthStore()
    const navigate = useNavigate()

    const validateToken = useCallback(() => {
        if (!token) return
        authApi.me().catch(() => {
            clearAuth()
            toast('Сесія закінчилась, увійдіть знову', 'warn')
        })
    }, [token, clearAuth])

    useEffect(() => {
        window.addEventListener('focus', validateToken)
        return () => window.removeEventListener('focus', validateToken)
    }, [validateToken])

    async function doLogin(email, password) {
        const authData = await authApi.login(email, password)
        setAuth(authData.token, {
            firstName: authData.firstName,
            lastName: authData.lastName,
            userId: authData.userId,
        })
        closeLogin()
        toast(`Вітаємо, ${authData.firstName}!`, 'ok')
        navigate('/dashboard')
    }

    async function doRegister(email, password, firstName, lastName) {
        const authData = await authApi.register(email, password, firstName, lastName)
        setAuth(authData.token, {
            firstName: authData.firstName,
            lastName: authData.lastName,
            userId: authData.userId,
        })
        closeRegister()
        toast(`Акаунт створено! Вітаємо, ${authData.firstName} 🎉`, 'ok')
        navigate('/dashboard')
    }

    function logout() {
        clearAuth()
        navigate('/')
        toast('Ви вийшли з акаунту')
    }

    return { token, user, doLogin, doRegister, logout }
}