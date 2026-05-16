import client from './client'

export const login = (email, password) => client.post('/auth/login', { email, password })
export const register = (email, password, firstName, lastName) => client.post('/auth/register', { email, password, firstName, lastName })
export const me = () => client.get('/auth/me')