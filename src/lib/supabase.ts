import { createClient } from '@supabase/supabase-js'

// Пока мы не создали проект в админке Supabase, 
// используем заглушки, чтобы код не выдавал ошибки.
const supabaseUrl = 'https://rhrasbvydygitovyjdhs.supabase.co'
const supabaseKey = 'sb_publishable_XkqIrp8uQ2M_HsS8RS47sA_PuD_h7Tz'

export const supabase = createClient(supabaseUrl, supabaseKey)