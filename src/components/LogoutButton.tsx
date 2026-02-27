import { LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const LogoutButton = () => {
  return (
    <button 
      onClick={() => supabase.auth.signOut()}
      className="flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors text-sm font-medium"
    >
      <LogOut size={16} /> Выйти
    </button>
  )
}