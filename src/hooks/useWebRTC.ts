import { useState, useEffect, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type SignalData = RTCSessionDescriptionInit | RTCIceCandidateInit | { isVideoEnabled: boolean }

interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'video-status'
  senderId: string
  targetId?: string
  data?: SignalData
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export const useWebRTC = (roomId: string | null, currentUserId: string | undefined) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [isCalling, setIsCalling] = useState(false)

  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [remoteVideoStatus, setRemoteVideoStatus] = useState<Record<string, boolean>>({})

  const peersRef = useRef<Record<string, RTCPeerConnection>>({})
  const channelRef = useRef<RealtimeChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const sendSignal = useCallback((message: SignalMessage) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: message
      })
    }
  }, [])

  const createPeerConnection = useCallback((targetId: string, stream: MediaStream) => {
    if (peersRef.current[targetId]) return peersRef.current[targetId]

    const peer = new RTCPeerConnection(RTC_CONFIG)
    peersRef.current[targetId] = peer

    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream)
    })

    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetId]: event.streams[0] }))
      setRemoteVideoStatus(prev => ({ ...prev, [targetId]: true }))
    }

    peer.onicecandidate = (event) => {
      if (event.candidate && currentUserId) {
        sendSignal({ type: 'ice-candidate', senderId: currentUserId, targetId, data: event.candidate.toJSON() })
      }
    }

    return peer
  }, [currentUserId, sendSignal])

  const startCall = async () => {
    if (!roomId || !currentUserId) return
    setIsCalling(true)

    try {
      let stream: MediaStream
      let initialVideoStatus = true
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch (mediaErr) {
        console.warn('Камера недоступна, пробуем только микрофон...', mediaErr)
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        initialVideoStatus = false
        setIsVideoEnabled(false)
      }

      setLocalStream(stream)
      streamRef.current = stream

      const channel = supabase.channel(`call_${roomId}`, {
        config: {
          presence: { key: currentUserId },
        },
      })
      channelRef.current = channel

      channel.on('broadcast', { event: 'webrtc_signal' }, async ({ payload }) => {
        const msg = payload as SignalMessage
        if (msg.senderId === currentUserId) return

        if (msg.type === 'video-status') {
          const statusPayload = msg.data as { isVideoEnabled?: boolean } | undefined
          setRemoteVideoStatus(prev => ({ ...prev, [msg.senderId]: Boolean(statusPayload?.isVideoEnabled) }))
          return
        }

        if (msg.targetId && msg.targetId !== currentUserId) return

        if (msg.type === 'user-joined') {
          const peer = createPeerConnection(msg.senderId, stream)
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          sendSignal({ type: 'offer', senderId: currentUserId, targetId: msg.senderId, data: offer })
          sendSignal({
            type: 'video-status',
            senderId: currentUserId,
            targetId: msg.senderId,
            data: { isVideoEnabled: initialVideoStatus }
          })
        }

        if (msg.type === 'offer') {
          const peer = createPeerConnection(msg.senderId, stream)
          await peer.setRemoteDescription(new RTCSessionDescription(msg.data as RTCSessionDescriptionInit))
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          sendSignal({ type: 'answer', senderId: currentUserId, targetId: msg.senderId, data: answer })

          sendSignal({
            type: 'video-status',
            senderId: currentUserId,
            targetId: msg.senderId,
            data: { isVideoEnabled: streamRef.current?.getVideoTracks()[0]?.enabled ?? false }
          })
        }

        if (msg.type === 'answer') {
          const peer = peersRef.current[msg.senderId]
          if (peer) await peer.setRemoteDescription(new RTCSessionDescription(msg.data as RTCSessionDescriptionInit))
        }

        if (msg.type === 'ice-candidate') {
          const peer = peersRef.current[msg.senderId]
          if (peer) await peer.addIceCandidate(new RTCIceCandidate(msg.data as RTCIceCandidateInit))
        }

        if (msg.type === 'user-left') {
          if (peersRef.current[msg.senderId]) {
            peersRef.current[msg.senderId].close()
            delete peersRef.current[msg.senderId]
          }
          setRemoteStreams(prev => {
            const newStreams = { ...prev }
            delete newStreams[msg.senderId]
            return newStreams
          })
          setRemoteVideoStatus(prev => {
            const newStatus = { ...prev }
            delete newStatus[msg.senderId]
            return newStatus
          })
        }
      })

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ isCalling: true, joined_at: new Date().toISOString() })
          sendSignal({ type: 'user-joined', senderId: currentUserId })
        }
      })

    } catch (err: unknown) {
      console.error('Критическая ошибка запуска звонка:', err)
      alert('Не удалось запустить звонок. Проверьте доступ к микрофону!')
      setIsCalling(false)
    }
  }

  const endCall = useCallback(async () => {
    if (currentUserId) {
      sendSignal({ type: 'user-left', senderId: currentUserId })
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setLocalStream(null)
    setIsCalling(false)
    setRemoteStreams({})
    setRemoteVideoStatus({})

    Object.values(peersRef.current).forEach(peer => peer.close())
    peersRef.current = {}

    if (channelRef.current) {
      await channelRef.current.untrack()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [sendSignal, currentUserId])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        if (currentUserId && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: { type: 'user-left', senderId: currentUserId }
          })
        }
        streamRef.current.getTracks().forEach(t => t.stop())
        Object.values(peersRef.current).forEach(p => p.close())
        if (channelRef.current) supabase.removeChannel(channelRef.current)
      }
    }
  }, [roomId, currentUserId])

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        const newStatus = videoTrack.enabled
        setIsVideoEnabled(newStatus)

        if (currentUserId) {
          sendSignal({
            type: 'video-status',
            senderId: currentUserId,
            data: { isVideoEnabled: newStatus }
          })
        }
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }

  return { isCalling, localStream, remoteStreams, remoteVideoStatus, startCall, endCall, toggleVideo, toggleAudio, isVideoEnabled, isAudioEnabled }
}
