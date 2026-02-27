import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Не заданы VITE_SUPABASE_URL и/или VITE_SUPABASE_ANON_KEY. ' +
    'Создайте файл .env (можно скопировать из .env.example) и перезапустите dev-сервер.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
