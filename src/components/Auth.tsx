import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Loader2 } from 'lucide-react'

export const Auth = () => {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert('Проверьте почту для подтверждения регистрации!')
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm p-8 bg-slate-800/50 rounded-3xl border border-white/10">
      <h2 className="text-2xl font-bold text-center mb-4">Вход в ECHO</h2>
      
      <div className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
          <input 
            type="email" 
            placeholder="Email" 
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-cyan-500 transition-colors"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
          <input 
            type="password" 
            placeholder="Пароль" 
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-cyan-500 transition-colors"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-cyan-600 hover:bg-cyan-500 py-2 rounded-xl font-bold flex justify-center items-center gap-2 transition-all"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Войти'}
        </button>

        <button 
          onClick={handleSignUp}
          disabled={loading}
          className="w-full text-slate-400 text-sm hover:text-white transition-colors"
        >
          Нет аккаунта? Зарегистрироваться
        </button>
      </div>
    </div>
  )
}