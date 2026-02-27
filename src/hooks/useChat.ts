import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface Channel {
  id: string
  name: string
  created_by: string
}

export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: {
    nickname: string
    avatar_url: string
  }
}

export const useChat = (activeChannelId: string | null, currentUserId: string | undefined) => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)

  // Загрузка списка каналов, где пользователь является членом
 const fetchChannels = async () => {
  if (!currentUserId) return;

  setLoadingChannels(true);

  try {
    // Шаг 1 — мои channel_id
    const { data: memberships, error: memErr } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', currentUserId);

    if (memErr) throw memErr;

    if (!memberships?.length) {
      setChannels([]);
      return;
    }

    const channelIds = memberships.map(m => m.channel_id);

    // Шаг 2 — сами каналы
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .in('id', channelIds)
      .order('created_at', { ascending: true });

    if (error) throw error;

    setChannels(data || []);
  } catch (err) {
    console.error('Ошибка загрузки каналов:', err);
    setChannels([]);
  } finally {
    setLoadingChannels(false);
  }
};

  // Создание нового канала с добавлением членов
  const createChannel = async (name: string, memberIds: string[]) => {
    if (!currentUserId) return null
    const { data, error } = await supabase
      .from('channels')
      .insert([{ name, created_by: currentUserId }])
      .select()
      .single()
    
    if (!error && data) {
      // Добавляем создателя и выбранных членов
      const membersToInsert = [{ channel_id: data.id, user_id: currentUserId }, ...memberIds.map(id => ({ channel_id: data.id, user_id: id }))]
      await supabase.from('channel_members').insert(membersToInsert)
      setChannels(prev => [...prev, data])
      return data
    }
    return null
  }

  // Приглашение пользователя в канал
  const inviteUser = async (channelId: string, userId: string) => {
    await supabase.from('channel_members').insert([{ channel_id: channelId, user_id: userId }])
    // Опционально: уведомить пользователя через broadcast или presence
  }

  // Исключение пользователя из канала
  const removeUser = async (channelId: string, userId: string) => {
    await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', userId)
  }

  // Отправка сообщения
  const sendMessage = async (content: string) => {
    if (!activeChannelId || !currentUserId) return
    await supabase
      .from('messages')
      .insert([{ channel_id: activeChannelId, user_id: currentUserId, content }])
  }

  useEffect(() => {
    if (!currentUserId) return
    fetchChannels()
  }, [currentUserId])

  useEffect(() => {
    if (!activeChannelId) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id (nickname, avatar_url)
        `)
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: true })

      if (!error && data) setMessages(data)
    }

    fetchMessages()

    const channel = supabase.channel(`room_${activeChannelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${activeChannelId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('id', newMsg.user_id)
            .single()

          newMsg.profiles = profileData || undefined
          setMessages(prev => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChannelId])

  return { channels, messages, createChannel, sendMessage, inviteUser, removeUser, loadingChannels }
}