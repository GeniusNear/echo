import React, { useState } from 'react'
import { Settings, Sword, Briefcase, Plus, MessageSquare } from 'lucide-react'
import { Channel } from '../hooks/useChat'
import { CreateChannelModal } from './CreateChannelModal' // Новый импорт

interface SidebarProps {
  mode: 'work' | 'gaming'
  channels: Channel[]
  activeChannelId: string | null
  onChannelSelect: (id: string) => void
  onCreateChannel: (name: string, members: string[]) => void
  onOpenSettings?: () => void
  allUsers: any[] // Из useUsers
  currentUserId: string
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  mode, channels, activeChannelId, onChannelSelect, onCreateChannel, onOpenSettings, allUsers, currentUserId 
}) => {
  const isGaming = mode === 'gaming'
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className={`w-64 h-full flex flex-col transition-all duration-700 relative z-20 ${
      isGaming ? 'bg-[#050505] border-r border-green-500/20' : 'bg-slate-900 border-r border-white/5'
    }`}>
      
      {/* Шапка */}
      <div className="p-6 pb-2">
        <div className={`flex items-center gap-3 font-black tracking-tighter ${
          isGaming ? 'text-green-400' : 'text-cyan-400'
        }`}>
          {isGaming ? <Sword size={20} /> : <Briefcase size={20} />}
          <span>{isGaming ? 'GAMING HUB' : 'WORK SPACE'}</span>
        </div>
      </div>

      {/* Список комнат */}
      <div className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Голосовые комнаты
          </p>
          <button 
            onClick={() => setIsCreating(true)}
            className="text-green-500 hover:text-green-400 transition-colors"
          >
            <Plus size={18} /> {/* Больше и цветной */}
          </button>
        </div>

        {channels.map(channel => (
          <SidebarItem 
            key={channel.id}
            icon={MessageSquare} 
            label={channel.name} 
            active={activeChannelId === channel.id} 
            onClick={() => onChannelSelect(channel.id)}
          />
        ))}
      </div>

      {/* Футер сайдбара */}
      <div className="p-4 border-t border-white/5">
        <div 
          onClick={onOpenSettings}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group hover:bg-white/5 hover:text-slate-200 text-slate-400"
        >
          <Settings size={18} className="shrink-0 transition-colors group-hover:text-cyan-400" />
          <span className="text-sm font-medium truncate">Настройки</span>
        </div>
      </div>

      <CreateChannelModal 
        isOpen={isCreating} 
        onClose={() => setIsCreating(false)} 
        onCreate={onCreateChannel}
        allUsers={allUsers}
        currentUserId={currentUserId}
      />
    </div>
  )
}

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: any) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group relative ${
      active
        ? 'bg-gradient-to-r from-white/10 to-white/5 text-white'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    }`}
  >
    <Icon
      size={18}
      className={`shrink-0 transition-colors ${
        active ? 'text-green-400' : 'group-hover:text-green-400'
      }`}
    />
    <span className="text-sm font-medium truncate">{label}</span>
    {active && (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-green-500 rounded-l-lg shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
    )}
  </div>
)