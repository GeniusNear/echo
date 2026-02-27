import React, { useEffect, useRef, useState } from 'react'
import { VolumeX, Settings, User } from 'lucide-react'

interface VideoPlayerProps {
  stream: MediaStream | null
  muted?: boolean
  isLocal?: boolean
  userName?: string
  avatarUrl?: string
  isVideoEnabled?: boolean // Добавили пропс статуса камеры
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  stream, muted = false, isLocal = false, userName, avatarUrl, isVideoEnabled = true 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [showSettings, setShowSettings] = useState(false)
  const [volume, setVolume] = useState(1) // 1 = 100% громкость

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      video.srcObject = stream
      video.play().catch(e => {
        console.warn("Автовоспроизведение заблокировано браузером:", e)
      })
    } else {
      video.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    if (videoRef.current && !isLocal) {
      videoRef.current.volume = volume
    }
  }, [volume, isLocal])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isLocal) {
      setShowSettings(true)
    }
  }

  const handleClick = () => {
    if (showSettings) setShowSettings(false)
  }

  // Определяем стили формы: если камера работает — прямоугольник, иначе — круг
  const containerShape = isVideoEnabled 
    ? 'w-full aspect-video rounded-xl border border-white/5' 
    : 'w-[140px] h-[140px] rounded-full border-[4px] border-[#2b2d31]'

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-2">
      <div 
        className={`relative bg-[#111214] shadow-lg flex items-center justify-center overflow-hidden transition-all duration-700 ease-in-out group ${containerShape}`}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        {/* Видео Поток */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${
            isLocal ? 'scale-x-[-1]' : ''
          } ${isVideoEnabled ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        />
        
        {/* Аватарка (когда видео выключено) */}
        <div className={`absolute inset-0 flex items-center justify-center bg-slate-800 transition-opacity duration-500 ${isVideoEnabled ? 'opacity-0 z-0' : 'opacity-100 z-10'}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={56} className="text-slate-500" />
          )}
        </div>
        
        {/* Плашка с именем поверх видео (показывается только когда видео ВКЛЮЧЕНО) */}
        <div className={`absolute bottom-3 left-3 flex items-center gap-2 z-20 transition-opacity duration-500 ${isVideoEnabled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded text-xs text-white font-medium border border-white/10 flex items-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            {isLocal ? 'Вы' : userName || 'Участник'}
            {!isLocal && volume === 0 && (
              <VolumeX size={14} className="text-red-400" />
            )}
          </div>
        </div>

        {/* Контекстное меню настроек участника */}
        {!isLocal && showSettings && (
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-40 transition-opacity animate-in fade-in duration-200"
            onClick={e => e.stopPropagation()} 
          >
            <div className="bg-[#1e1f22] p-5 rounded-xl shadow-2xl border border-white/10 flex flex-col items-center gap-4 min-w-[200px]">
              <div className="text-sm text-slate-200 font-medium flex items-center gap-2">
                <Settings size={16} className="text-cyan-400" />
                Громкость
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Уровень</span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-700 h-1.5 rounded-lg cursor-pointer outline-none"
                />
              </div>

              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={() => setVolume(0)}
                  className="flex-1 bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 py-2 rounded-lg text-xs font-medium transition-colors flex justify-center items-center gap-1"
                >
                  <VolumeX size={14} /> Mute
                </button>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Рамка при наведении (только для чужих карточек) */}
        {!isLocal && stream && (
          <div className={`absolute inset-0 border-2 border-transparent group-hover:border-white/10 pointer-events-none transition-colors z-30 ${isVideoEnabled ? 'rounded-xl' : 'rounded-full'}`} />
        )}
      </div>

      {/* Имя ПОД кружком (показывается только когда камера ВЫКЛЮЧЕНА) */}
      <div className={`font-medium text-slate-300 transition-all duration-500 flex items-center justify-center gap-2 ${
        isVideoEnabled ? 'opacity-0 h-0 overflow-hidden mt-0' : 'opacity-100 h-auto mt-4'
      }`}>
        {isLocal ? 'Вы' : userName || 'Участник'}
        {!isLocal && volume === 0 && <VolumeX size={14} className="text-red-400" />}
      </div>
    </div>
  )
}
