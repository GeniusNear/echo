import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'

function App() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Если нет сессии — показываем окно входа по центру
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-6 font-sans">
        <Auth />
      </div>
    )
  }

  // Если сессия есть, но ID еще не подгрузился
  if (!session.user?.id) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center font-sans">
        <div className="animate-pulse text-cyan-500 font-bold">Синхронизация сессии...</div>
      </div>
    )
  }

  // Основное приложение — на ВЕСЬ экран без отступов
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans">
      <Dashboard userId={session.user.id} userEmail={session.user.email} />
    </div>
  )
}

export default App
