import React, { useState, useEffect } from 'react'
import { X, UserMinus, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { UserWithStatus } from '../hooks/useUsers'

interface ManageMembersModalProps {
  isOpen: boolean
  onClose: () => void
  channelId: string
  currentUserId: string
  onInvite: (userId: string) => void
  onRemove: (userId: string) => void
  allUsers: UserWithStatus[]
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ isOpen, onClose, channelId, currentUserId, onInvite, onRemove, allUsers }) => {
  const [members, setMembers] = useState<string[]>([])

  const fetchMembers = async () => {
    const { data } = await supabase.from('channel_members').select('user_id').eq('channel_id', channelId)
    if (data) setMembers(data.map(m => m.user_id))
  }

  useEffect(() => {
    if (isOpen) fetchMembers()
  }, [isOpen, channelId])

  if (!isOpen) return null

  const handleRemove = async (userId: string) => {
    await onRemove(userId)
    // Сразу обновляем локальный список после удаления
    setMembers(prev => prev.filter(id => id !== userId))
  }

  const handleInvite = async (userId: string) => {
    await onInvite(userId)
    // Сразу обновляем локальный список после добавления
    setMembers(prev => [...prev, userId])
  }

  const currentMembers = allUsers.filter(u => members.includes(u.id))
  const nonMembers = allUsers.filter(u => !members.includes(u.id) && u.id !== currentUserId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Управление участниками</h2>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">В комнате</h3>
            <div className="space-y-2">
              {currentMembers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-sm font-medium">{user.nickname || 'Аноним'} {user.id === currentUserId && "(Вы)"}</span>
                  {user.id !== currentUserId && (
                    <button 
                      onClick={() => handleRemove(user.id)} 
                      className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <UserMinus size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Добавить в комнату</h3>
            <div className="space-y-2">
              {nonMembers.length === 0 && <p className="text-xs text-slate-600 italic">Все пользователи уже добавлены</p>}
              {nonMembers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-sm font-medium">{user.nickname || 'Аноним'}</span>
                  <button 
                    onClick={() => handleInvite(user.id)} 
                    className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                  >
                    <UserPlus size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
