import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  app_mode: 'work' | 'gaming'
  nickname?: string
  avatar_url?: string
  ringtone_url?: string
  ringtone_volume?: number
}

export const useProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile>({ app_mode: 'gaming', ringtone_volume: 1 })
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('app_mode, nickname, avatar_url, ringtone_url, ringtone_volume')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      if (data) {
        setProfile(data as UserProfile)
      } else {
        await supabase.from('profiles').upsert({ id: userId, app_mode: 'gaming' })
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateMode = async (newMode: 'work' | 'gaming') => {
    if (!userId) return
    setProfile(prev => ({ ...prev, app_mode: newMode }))
    await supabase.from('profiles').update({ app_mode: newMode }).eq('id', userId)
  }

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!userId) return
    setProfile(prev => ({ ...prev, ...updates }))
    await supabase.from('profiles').update(updates).eq('id', userId)
  }

  return { profile, updateMode, updateProfileData, loading, refetch: fetchProfile }
}
