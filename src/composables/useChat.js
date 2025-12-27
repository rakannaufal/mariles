import { ref, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

export function useChat() {
  const chatRooms = ref([])
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  let messageSubscription = null

  // Fetch all chat rooms for current user
  async function fetchChatRooms(userId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          participant_1_user:users!chat_rooms_participant_1_fkey(id, name, email, avatar_url, role),
          participant_2_user:users!chat_rooms_participant_2_fkey(id, name, email, avatar_url, role)
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (err) throw err
      
      // Transform data to include "other" participant info
      chatRooms.value = (data || []).map(room => ({
        ...room,
        otherParticipant: room.participant_1 === userId 
          ? room.participant_2_user 
          : room.participant_1_user
      }))
    } catch (err) {
      error.value = err.message
      console.error('Error fetching chat rooms:', err)
    } finally {
      loading.value = false
    }
  }

  // Fetch messages for a specific room
  async function fetchMessages(roomId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:users!chat_messages_sender_id_fkey(id, name, avatar_url)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (err) throw err
      messages.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching messages:', err)
    } finally {
      loading.value = false
    }
  }

  // Send a new message
  async function sendMessage(roomId, senderId, message) {
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          message: message.trim()
        })
        .select(`
          *,
          sender:users!chat_messages_sender_id_fkey(id, name, avatar_url)
        `)
        .single()

      if (err) throw err

      // Update last message in chat room
      await supabase
        .from('chat_rooms')
        .update({
          last_message: message.trim(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', roomId)

      return data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Create or get existing chat room
  async function getOrCreateChatRoom(userId, participantId, lesPlaceId = null) {
    error.value = null

    try {
      // Check if room already exists
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`and(participant_1.eq.${userId},participant_2.eq.${participantId}),and(participant_1.eq.${participantId},participant_2.eq.${userId})`)
        .single()

      if (existingRoom) return existingRoom

      // Create new room
      const { data: newRoom, error: err } = await supabase
        .from('chat_rooms')
        .insert({
          participant_1: userId,
          participant_2: participantId,
          les_place_id: lesPlaceId
        })
        .select()
        .single()

      if (err) throw err
      return newRoom
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Subscribe to real-time messages in a room
  function subscribeToMessages(roomId, onNewMessage) {
    // Unsubscribe from previous subscription
    unsubscribe()

    messageSubscription = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // Fetch sender info for the new message
          const { data: senderData } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()

          const newMessage = {
            ...payload.new,
            sender: senderData
          }

          messages.value.push(newMessage)
          if (onNewMessage) onNewMessage(newMessage)
        }
      )
      .subscribe()
  }

  // Mark messages as read
  async function markAsRead(roomId, userId) {
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .neq('sender_id', userId)
        .eq('is_read', false)
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  // Get unread count for a room
  async function getUnreadCount(roomId, userId) {
    try {
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .neq('sender_id', userId)
        .eq('is_read', false)

      return count || 0
    } catch (err) {
      console.error('Error getting unread count:', err)
      return 0
    }
  }

  // Unsubscribe from real-time updates
  function unsubscribe() {
    if (messageSubscription) {
      supabase.removeChannel(messageSubscription)
      messageSubscription = null
    }
  }

  // Get available chat partners for student (teachers from active bookings + owners)
  async function getAvailableChatPartners(userId) {
    try {
      // Get student ID first
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!student) return { teachers: [], owners: [] }

      // Get teachers from active bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          programs(
            id,
            name,
            les_places(id, name, owner_id, owners(user_id, users(id, name, avatar_url, role)))
          )
        `)
        .eq('student_id', student.id)
        .in('status', ['active', 'pending'])

      // Extract unique teachers and owners
      const teacherMap = new Map()
      const ownerMap = new Map()

      for (const booking of bookings || []) {
        const lesPlace = booking.programs?.les_places
        if (lesPlace?.owners?.users) {
          const owner = lesPlace.owners.users
          ownerMap.set(owner.id, {
            ...owner,
            lesPlaceName: lesPlace.name,
            lesPlaceId: lesPlace.id
          })
        }
      }

      // Get teachers assigned to programs the student is enrolled in
      const programIds = (bookings || []).map(b => b.programs?.id).filter(Boolean)
      if (programIds.length > 0) {
        const { data: schedules } = await supabase
          .from('schedules')
          .select(`
            program_id,
            teacher_id,
            teachers(user_id, users(id, name, avatar_url, role))
          `)
          .in('program_id', programIds)

        for (const schedule of schedules || []) {
          if (schedule.teachers?.users) {
            const teacher = schedule.teachers.users
            teacherMap.set(teacher.id, teacher)
          }
        }
      }

      return {
        teachers: Array.from(teacherMap.values()),
        owners: Array.from(ownerMap.values())
      }
    } catch (err) {
      console.error('Error getting chat partners:', err)
      return { teachers: [], owners: [] }
    }
  }

  // Get owner user ID by les place ID
  async function getOwnerByLesPlaceId(lesPlaceId) {
    try {
      const { data, error } = await supabase
        .from('les_places')
        .select('owner_id, owners(user_id, users(id, name, avatar_url, role))')
        .eq('id', lesPlaceId)
        .single()

      if (error) throw error
      return data?.owners?.users || null
    } catch (err) {
      console.error('Error getting owner:', err)
      return null
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    chatRooms,
    messages,
    loading,
    error,
    fetchChatRooms,
    fetchMessages,
    sendMessage,
    getOrCreateChatRoom,
    subscribeToMessages,
    markAsRead,
    getUnreadCount,
    unsubscribe,
    getAvailableChatPartners,
    getOwnerByLesPlaceId
  }
}
