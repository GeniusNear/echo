import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UserProfile } from './useProfile'

export interface UserWithStatus extends UserProfile {
  id: string
  isOnline: boolean
}

export const useUsers = (currentUserId: string | undefined) => {
  const [users, setUsers] = useState<UserWithStatus[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!currentUserId) return

    // 1. Загружаем всех пользователей из БД
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, app_mode, nickname, avatar_url')
      
      if (!error && data) {
        const formattedUsers = data.map(user => ({
          ...user,
          isOnline: false
        }))
        setUsers(formattedUsers)
      }
    }

    fetchUsers()

    // 2. Настраиваем Supabase Presence
    // ВАЖНО: Мы передаем config.user: currentUserId
    // Чтобы Presence понимал, какой именно UUID сейчас онлайн
    const room = supabase.channel('global_presence', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    room
      .on('presence', { event: 'sync' }, () => {
        const state = room.presenceState()
        // state содержит ключи, которые мы задали выше (т.е. ID юзеров)
        console.log("Current presence state:", state) // Оставил лог для отладки
        const activeIds = new Set(Object.keys(state))
        setOnlineIds(activeIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Отправляем пустой объект, так как главное тут - сам факт присутствия ключа
          await room.track({ online_at: new Date().toISOString() })
        }
      })

    // Очистка при выходе
    return () => {
      room.untrack()
      supabase.removeChannel(room)
    }
  }, [currentUserId])

  // Объединяем статические данные со статусом онлайна
  const usersWithPresence = users.map(user => ({
    ...user,
    isOnline: onlineIds.has(user.id)
  }))

  // Сортируем: сначала онлайн, потом оффлайн. 
  const sortedUsers = [...usersWithPresence].sort((a, b) => {
    if (a.isOnline === b.isOnline) {
      const nameA = a.nickname || a.id
      const nameB = b.nickname || b.id
      return nameA.localeCompare(nameB)
    }
    return a.isOnline ? -1 : 1
  })

  return { users: sortedUsers }
}
