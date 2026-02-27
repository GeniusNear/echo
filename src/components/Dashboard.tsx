import React, { useState } from 'react'
import { Gamepad2, Briefcase, Loader2 } from 'lucide-react'
import { LogoutButton } from './LogoutButton'
import { Sidebar } from './Sidebar'
import { useProfile } from '../hooks/useProfile'
import { useUsers } from '../hooks/useUsers'
import { useChat } from '../hooks/useChat'
import { SettingsModal } from './SettingsModal'
import { ChatArea } from './ChatArea'

interface DashboardProps {
  userId: string | undefined
  userEmail: string | undefined
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, userEmail }) => {
  const { profile, updateMode, updateProfileData, loading: profileLoading } = useProfile(userId)
  const { users } = useUsers(userId) 
  
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const { channels, messages, createChannel, sendMessage, inviteUser, removeUser, loadingChannels } = useChat(activeChannelId, userId)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (profileLoading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-cyan-500 font-mono bg-[#0b0f1a]">
        <Loader2 className="animate-spin mr-3" size={24} />
        СИНХРОНИЗАЦИЯ...
      </div>
    )
  }

  const isGaming = profile.app_mode === 'gaming'
  const displayName = profile.nickname || userEmail?.split('@')[0] || 'User'
  const onlineCount = users.filter(u => u.isOnline).length

  const activeChannel = channels.find(c => c.id === activeChannelId) || null

  const handleCreateChannel = async (name: string, members: string[]) => {
    const newChannel = await createChannel(name, members)
    if (newChannel) setActiveChannelId(newChannel.id)
  }

  return (
    <div className="min-h-screen w-full flex overflow-hidden font-sans">
      
      <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${
        isGaming ? 'opacity-80 bg-gradient-to-br from-[#0a120a] to-black' : 'opacity-60 bg-gradient-to-br from-slate-950 to-[#0f172a]'
      }`} />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        userId={userId}
        currentProfile={profile}
        onUpdate={updateProfileData}
      />

      <div className="relative z-10 flex w-full h-screen">
        
        <Sidebar 
          mode={profile.app_mode} 
          channels={channels}
          activeChannelId={activeChannelId}
          onChannelSelect={setActiveChannelId}
          onCreateChannel={handleCreateChannel}
          onOpenSettings={() => setIsSettingsOpen(true)} 
          allUsers={users}
          currentUserId={userId}
        />

        <div className="flex-1 flex flex-col h-full relative">
          <header className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center p-4 bg-black/30 backdrop-blur-md border-b border-white/5 transition-colors duration-700">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => updateMode(isGaming ? 'work' : 'gaming')}
                className={`p-2.5 rounded-xl transition-all shadow-md ${
                  isGaming 
                    ? 'bg-green-900/50 hover:bg-green-800/50 text-green-400 glow-green' 
                    : 'bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-400 glow-blue'
                }`}
              >
                {isGaming ? <Gamepad2 size={20} /> : <Briefcase size={20} />}
              </button>
              <div>
                <h1 className="text-xl font-black tracking-tighter">{displayName}</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-[-2px]">Онлайн: {onlineCount}</p>
              </div>
            </div>
            <LogoutButton />
          </header>

          <main className="flex-1 pt-16 pb-0 flex relative overflow-hidden">
            <ChatArea 
              channel={activeChannel} 
              messages={messages} 
              currentUserId={userId} 
              allUsers={users}
              onSendMessage={sendMessage}
              onInviteUser={(userId: string) => inviteUser(activeChannelId!, userId)}
              onRemoveUser={(userId: string) => removeUser(activeChannelId!, userId)}
              // ВАЖНО: Передаем настройки звука в чат
              ringtoneUrl={profile.ringtone_url}
              ringtoneVolume={profile.ringtone_volume}
            />

            {/* Правый сайдбар с пользователями */}
            {!loadingChannels && (
              <div className="w-72 border-l border-white/5 bg-black/40 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Все участники — {onlineCount} онлайн
                  </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {users.length === 0 ? (
                    <div className="text-center text-slate-600 text-xs mt-10">Загрузка...</div>
                  ) : (
                    users.map(user => (
                      <div key={user.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-white/5 cursor-pointer ${user.id === userId ? 'bg-white/5' : ''}`}>
                        <div className="relative flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full overflow-hidden bg-slate-800 border ${user.isOnline ? 'border-green-500/50' : 'border-slate-700'}`}>
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs">
                                {(user.nickname || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {user.isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0a120a] rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium truncate ${user.isOnline ? 'text-slate-200' : 'text-slate-500'}`}>
                              {user.nickname || 'Unknown User'}
                              {user.id === userId && <span className="ml-2 text-[10px] text-slate-600">(ты)</span>}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600">
                            {user.isOnline ? 'В сети' : 'Не в сети'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
