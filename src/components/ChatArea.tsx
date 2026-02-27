import React, { useState, useRef, useEffect } from 'react'
import { Send, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Settings } from 'lucide-react' 
import { Message, Channel } from '../hooks/useChat'
import { useWebRTC } from '../hooks/useWebRTC'
import { VideoPlayer } from './VideoPlayer'
import { UserWithStatus } from '../hooks/useUsers'
import { supabase } from '../lib/supabase'
import { ManageMembersModal } from './ManageMembersModal' 

interface ChatAreaProps {
  channel: Channel | null
  messages: Message[]
  currentUserId: string
  allUsers: UserWithStatus[]
  onSendMessage: (content: string) => void
  onInviteUser: (userId: string) => void
  onRemoveUser: (userId: string) => void
  ringtoneUrl?: string
  ringtoneVolume?: number
}

export const ChatArea: React.FC<ChatAreaProps> = ({ 
  channel, messages, currentUserId, allUsers, onSendMessage, onInviteUser, onRemoveUser, ringtoneUrl, ringtoneVolume = 1 
}) => {
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [activeCallersCount, setActiveCallersCount] = useState(0)
  const [callInitiatorId, setCallInitiatorId] = useState<string | null>(null)
  const [ignoredCallId, setIgnoredCallId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Получаем данные из нашего обновленного хука WebRTC
  const { 
    isCalling, 
    localStream, 
    remoteStreams, 
    remoteVideoStatus, 
    startCall, 
    endCall, 
    toggleVideo, 
    toggleAudio, 
    isVideoEnabled, 
    isAudioEnabled 
  } = useWebRTC(channel?.id || null, currentUserId)

  // Мониторинг Presence для счетчика и попапа
  useEffect(() => {
    if (!channel) return
    
    const monitor = supabase.channel(`call_${channel.id}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    monitor.on('presence', { event: 'sync' }, () => {
      const state = monitor.presenceState()
      const callers = Object.keys(state)
      setActiveCallersCount(callers.length)
      
      if (callers.length > 0) {
        setCallInitiatorId(callers[0])
      } else {
        setCallInitiatorId(null)
        setIgnoredCallId(null)
      }
    }).subscribe()

    return () => { supabase.removeChannel(monitor) }
  }, [channel, currentUserId])

  // Управление звуком рингтона
  useEffect(() => {
    const shouldRing = activeCallersCount > 0 && !isCalling && ignoredCallId !== channel?.id

    if (shouldRing) {
      if (!audioRef.current) {
        const defaultSound = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
        audioRef.current = new Audio(ringtoneUrl || defaultSound)
        audioRef.current.loop = true
        audioRef.current.volume = ringtoneVolume
        
        audioRef.current.play().catch(e => {
          console.warn("Браузер заблокировал авто-звук. Ожидание клика пользователя.", e)
        })
      } else {
        audioRef.current.volume = ringtoneVolume
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [activeCallersCount, isCalling, ringtoneUrl, ringtoneVolume, channel?.id, ignoredCallId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSendMessage(text.trim())
      setText('')
    }
  }

  const handleStartCall = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    startCall()
  }

  const handleDeclineCall = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (channel) setIgnoredCallId(channel.id)
  }

  if (!channel) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-slate-400">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 opacity-30 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">🎮</div>
          <h2 className="text-2xl font-bold mb-3 text-white">Выбери комнату</h2>
          <p className="text-sm">Создай новый сервер слева или присоединись к существующему для общения.</p>
        </div>
      </div>
    )
  }

  const remotePeers = Object.entries(remoteStreams)
  
  const getUserProfile = (userId: string) => {
    return allUsers.find(u => u.id === userId)
  }

  const isCreator = channel.created_by === currentUserId
  const caller = getUserProfile(callInitiatorId || '')
  const myProfile = getUserProfile(currentUserId)

  return (
    <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-md relative h-full">
      
      {/* POPUP Входящего звонка (поверх всего) */}
      {!isCalling && activeCallersCount > 0 && ignoredCallId !== channel.id && caller && (
        <div className="fixed top-12 right-12 z-[9999] bg-[#111214] p-6 rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col items-center animate-in slide-in-from-right-8 fade-in duration-300 w-[280px]">
          <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-slate-800 border-[3px] border-[#2b2d31] mb-4 shadow-[0_0_15px_rgba(0,0,0,0.4)]">
            {caller.avatar_url ? (
              <img src={caller.avatar_url} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">
                {(caller.nickname || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{caller.nickname || 'Unknown'}</h3>
          <p className="text-[13px] text-slate-400 mb-8 font-medium">Входящий звонок...</p>
          
          <div className="flex gap-8 w-full justify-center">
            <button 
              onClick={handleDeclineCall}
              className="w-14 h-14 bg-[#f23f42] hover:bg-[#da373c] rounded-full flex items-center justify-center text-white transition-all hover:scale-105 shadow-lg"
            >
              <X size={28} />
            </button>
            <button 
              onClick={handleStartCall}
              className="w-14 h-14 bg-[#23a559] hover:bg-[#1f8f4c] rounded-full flex items-center justify-center text-white transition-all hover:scale-105 shadow-[0_0_20px_rgba(35,165,89,0.4)] animate-bounce"
            >
              <Phone size={24} className="fill-current animate-pulse" />
            </button>
          </div>
        </div>
      )}

      {/* Шапка чата */}
      <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">#{channel.name}</h2>
          <span className={`text-xs px-3 py-1 rounded-full border transition-all ${
            activeCallersCount > 0 
              ? 'text-green-400 bg-green-400/10 border-green-400/30' 
              : 'text-slate-500 bg-slate-800 border-transparent'
          }`}>
            {activeCallersCount} в звонке
          </span>
        </div>
        
        <div className="flex gap-2">
          {!isCalling && (
            <button 
              onClick={handleStartCall} 
              className={`p-2 px-4 rounded-xl transition-all flex items-center gap-2 ${
                activeCallersCount > 0 
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] font-bold' 
                  : 'bg-[#23a559] hover:bg-[#1f8f4c] font-medium'
              }`}
            >
              <Phone size={20} />
              {activeCallersCount > 0 ? 'Присоединиться' : 'Позвонить'}
            </button>
          )}
          
          {isCreator && (
            <button onClick={() => setIsManageModalOpen(true)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-slate-300">
              <Settings size={20} />
            </button>
          )}
        </div>
      </div>

      {/* ГИГАНТСКИЙ ЗВОНОК (Стиль Discord) */}
      {isCalling && (
        <div className="bg-[#000000] border-b border-white/5 flex flex-col">
          {/* Сетка видео-карточек */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 max-h-[55vh] overflow-y-auto custom-scrollbar content-center justify-items-center">
            
            {/* Наше локальное видео */}
            <div className="col-span-1 w-full max-w-2xl flex justify-center">
              <VideoPlayer 
                stream={localStream} 
                muted 
                isLocal 
                userName={myProfile?.nickname || 'Вы'}
                avatarUrl={myProfile?.avatar_url}
                isVideoEnabled={isVideoEnabled}
              />
            </div>
            
            {/* Удаленные видео участников */}
            {remotePeers.map(([userId, stream]) => {
              const remoteProfile = getUserProfile(userId)
              return (
                <div key={userId} className="col-span-1 w-full max-w-2xl flex justify-center">
                  <VideoPlayer 
                    stream={stream} 
                    userName={remoteProfile?.nickname || 'Участник'}
                    avatarUrl={remoteProfile?.avatar_url}
                    isVideoEnabled={remoteVideoStatus[userId] ?? true} 
                  />
                </div>
              )
            })}
          </div>

          {/* Панель управления (ВНИЗУ ПОД КАРТОЧКАМИ) */}
          <div className="flex justify-center items-center gap-4 py-4 pb-6 mt-2 relative before:absolute before:top-0 before:inset-x-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent">
            
            <button 
              onClick={toggleVideo} 
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoEnabled ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-[#f23f42] hover:bg-[#da373c] text-white shadow-[0_0_15px_rgba(242,63,66,0.4)]'
              }`}
              title={isVideoEnabled ? 'Выключить камеру' : 'Включить камеру'}
            >
              {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
            
            <button 
              onClick={toggleAudio} 
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isAudioEnabled ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-[#f23f42] hover:bg-[#da373c] text-white shadow-[0_0_15px_rgba(242,63,66,0.4)]'
              }`}
              title={isAudioEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
            >
              {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            
            <div className="w-px h-8 bg-white/10 mx-2" /> 
            
            <button 
              onClick={endCall} 
              className="w-14 h-14 bg-[#f23f42] hover:bg-[#da373c] rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-105"
              title="Отключиться"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Сообщения чата */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => {
          const isMe = msg.user_id === currentUserId
          const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          const isSameUserAsPrev = index > 0 && messages[index - 1].user_id === msg.user_id
          
          return (
            <div key={msg.id} className={`flex gap-4 ${isSameUserAsPrev ? 'mt-1' : 'mt-6'} ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="w-10 flex-shrink-0 flex justify-center">
                {!isSameUserAsPrev && (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shadow-sm">
                    {msg.profiles?.avatar_url ? (
                      <img src={msg.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm bg-[#2b2d31]">
                        {(msg.profiles?.nickname || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                {!isSameUserAsPrev && (
                  <div className="flex items-baseline gap-2 mb-1 px-1">
                    <span className="font-semibold text-sm text-slate-200">{msg.profiles?.nickname || 'Unknown'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{time}</span>
                  </div>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                  isMe 
                    ? 'bg-[#23a559] text-white rounded-tr-none' 
                    : 'bg-[#2b2d31] border border-white/5 text-slate-200 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода сообщения */}
      <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-md z-20">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input 
            type="text" 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder={`Написать в #${channel.name}...`} 
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#23a559]/50 transition-colors" 
          />
          <button 
            type="submit" 
            disabled={!text.trim()} 
            className="bg-[#23a559] hover:bg-[#1f8f4c] disabled:opacity-50 text-white p-3 rounded-xl shadow-[0_0_15px_rgba(35,165,89,0.2)] transition-all"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Модалка управления участниками */}
      <ManageMembersModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        channelId={channel.id}
        currentUserId={currentUserId}
        onInvite={onInviteUser}
        onRemove={onRemoveUser}
        allUsers={allUsers}
      />
    </div>
  )
}
