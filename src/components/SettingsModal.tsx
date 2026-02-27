import React, { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2, Music, Play, Square } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../hooks/useProfile'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentProfile: UserProfile & { ringtone_url?: string; ringtone_volume?: number }
  onUpdate: (updates: { nickname?: string; avatar_url?: string; ringtone_url?: string; ringtone_volume?: number }) => void
}

const STANDARD_RINGTONES = [
  { name: 'Стандартный (Классика)', url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
  { name: 'Цифровой звонок', url: 'https://assets.mixkit.co/active_storage/sfx/2864/2864-preview.mp3' },
  { name: 'Ретро телефон', url: 'https://assets.mixkit.co/active_storage/sfx/2873/2873-preview.mp3' },
  { name: 'Мягкий сигнал', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' }
]


export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userId, currentProfile, onUpdate }) => {
  const [nickname, setNickname] = useState(currentProfile.nickname || '')
  
  const [ringtoneUrl, setRingtoneUrl] = useState(currentProfile.ringtone_url || STANDARD_RINGTONES[0].url)
  const [ringtoneVolume, setRingtoneVolume] = useState(currentProfile.ringtone_volume ?? 1)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingMusic, setUploadingMusic] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ФУНКЦИИ ПОДНЯТЫ НАВЕРХ ДО ВСЕХ return и useEffect
  const stopTestSound = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const toggleTestSound = () => {
    if (isPlaying) {
      stopTestSound()
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      audioRef.current.src = ringtoneUrl
      audioRef.current.volume = ringtoneVolume
      audioRef.current.play().catch(e => console.error("Play error:", e))
      setIsPlaying(true)
      
      audioRef.current.onended = () => setIsPlaying(false)
      setTimeout(stopTestSound, 5000)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    setRingtoneVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const handleSave = () => {
    stopTestSound()
    onUpdate({ 
      nickname, 
      ringtone_url: ringtoneUrl, 
      ringtone_volume: ringtoneVolume 
    })
    onClose()
  }

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>, bucket: string) => {
    try {
      const isAvatar = bucket === 'avatars'
      isAvatar ? setUploadingAvatar(true) : setUploadingMusic(true)
      
      const file = event.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Math.random()}.${fileExt}`
      const filePath = `public/${fileName}`

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
      
      if (isAvatar) {
        onUpdate({ avatar_url: publicUrl })
      } else {
        setRingtoneUrl(publicUrl)
        stopTestSound()
      }
    } catch (error: any) {
      alert('Ошибка загрузки: ' + error.message)
    } finally {
      bucket === 'avatars' ? setUploadingAvatar(false) : setUploadingMusic(false)
    }
  }

  // Эффект очистки теперь безопасно видит stopTestSound
  useEffect(() => {
    return () => {
      stopTestSound()
    }
  }, [])

  if (!isOpen) return null

  const isCustomRingtone = !STANDARD_RINGTONES.some(r => r.url === ringtoneUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <button onClick={() => { stopTestSound(); onClose(); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Настройки профиля</h2>

        {/* Аватар */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group cursor-pointer">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 group-hover:border-cyan-500 transition-colors">
              {currentProfile.avatar_url ? (
                <img src={currentProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-slate-500 font-bold">
                  {nickname?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
              {uploadingAvatar ? <Loader2 className="animate-spin text-white" size={24} /> : <Upload className="text-white" size={24} />}
              <input type="file" accept="image/*" onChange={(e) => uploadFile(e, 'avatars')} className="hidden" disabled={uploadingAvatar} />
            </label>
          </div>
        </div>

        {/* Никнейм */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-slate-400">Никнейм</label>
          <input 
            type="text" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Введи свой ник"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Настройки звонка */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 mb-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Music size={16} className="text-cyan-400" /> Входящий вызов
          </h3>
          
          {/* Выбор мелодии */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Мелодия</label>
            <select 
              value={isCustomRingtone ? 'custom' : ringtoneUrl}
              onChange={(e) => {
                if (e.target.value !== 'custom') setRingtoneUrl(e.target.value)
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
            >
              {STANDARD_RINGTONES.map((ring, idx) => (
                <option key={idx} value={ring.url}>{ring.name}</option>
              ))}
              {isCustomRingtone && <option value="custom">Пользовательская мелодия</option>}
            </select>
          </div>

          {/* Загрузка своей и тест */}
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTestSound}
              className={`p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              }`}
            >
              {isPlaying ? <Square size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
            </button>

            <label className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-600 px-4 py-2.5 rounded-lg cursor-pointer transition-colors">
              {uploadingMusic ? <Loader2 className="animate-spin text-cyan-400" size={16} /> : <Upload className="text-slate-400" size={16} />}
              <span className="text-xs text-slate-300">Свой .mp3</span>
              <input type="file" accept="audio/mp3, audio/wav" onChange={(e) => uploadFile(e, 'ringtones')} className="hidden" disabled={uploadingMusic} />
            </label>
          </div>

          {/* Громкость */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Громкость звонка</span>
              <span>{Math.round(ringtoneVolume * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={ringtoneVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-700 h-1.5 rounded-lg cursor-pointer outline-none"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
        >
          Сохранить
        </button>
      </div>
    </div>
  )
}
