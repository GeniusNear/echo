import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { UserWithStatus } from '../hooks/useUsers'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, selectedUsers: string[]) => void
  allUsers: UserWithStatus[]
  currentUserId: string
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ isOpen, onClose, onCreate, allUsers, currentUserId }) => {
  const [name, setName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  if (!isOpen) return null

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    } else {
      setSelectedUsers(prev => [...prev, userId])
    }
  }

  const handleCreate = () => {
    if (name.trim() && selectedUsers.length > 0) { // Минимум 1 другой пользователь
      onCreate(name.trim(), selectedUsers)
      onClose()
    } else {
      alert('Выберите название и хотя бы одного участника!')
    }
  }

  const otherUsers = allUsers.filter(u => u.id !== currentUserId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Создать новую комнату</h2>

        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-slate-400">Название комнаты</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введи название"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-slate-400">Выберите участников</label>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {otherUsers.map(user => (
              <div 
                key={user.id}
                onClick={() => toggleUser(user.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedUsers.includes(user.id) ? 'bg-cyan-600' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover rounded-full" /> : user.nickname?.charAt(0).toUpperCase()}
                </div>
                <span>{user.nickname || 'Unknown'}</span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={handleCreate}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all"
        >
          Создать
        </button>
      </div>
    </div>
  )
}