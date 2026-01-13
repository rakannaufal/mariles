import { ref, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

export function useChat() {
  const chatRooms = ref([])
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  let messageSubscription = null

  // Ambil semua ruang chat untuk pengguna saat ini
  async function fetchChatRooms(userId) {
    loading.value = true
    error.value = null

    try {
      // Pertama, dapatkan ruang chat
      const { data: rooms, error: roomErr } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (roomErr) throw roomErr
      
      // Dapatkan semua ID partisipan unik
      const participantIds = new Set()
      for (const room of rooms || []) {
        participantIds.add(room.participant_1)
        participantIds.add(room.participant_2)
      }
      
      // Ambil info pengguna untuk semua partisipan
      let usersMap = {}
      if (participantIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, email, avatar_url, role')
          .in('id', Array.from(participantIds))
        
        for (const user of users || []) {
          usersMap[user.id] = user
        }
      }
      
      // Transform data untuk menyertakan info partisipan "lainnya"
      chatRooms.value = (rooms || []).map(room => ({
        ...room,
        participant_1_user: usersMap[room.participant_1] || null,
        participant_2_user: usersMap[room.participant_2] || null,
        otherParticipant: room.participant_1 === userId 
          ? usersMap[room.participant_2] 
          : usersMap[room.participant_1]
      }))
    } catch (err) {
      error.value = err.message
      console.error('Error fetching chat rooms:', err)
    } finally {
      loading.value = false
    }
  }

  // Ambil pesan untuk ruang tertentu
  async function fetchMessages(roomId) {
    loading.value = true
    error.value = null

    try {
      // Pertama, dapatkan pesan
      const { data: msgs, error: msgErr } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (msgErr) throw msgErr
      
      // Dapatkan semua ID pengirim unik
      const senderIds = new Set()
      for (const msg of msgs || []) {
        senderIds.add(msg.sender_id)
      }
      
      // Ambil info pengirim
      let sendersMap = {}
      if (senderIds.size > 0) {
        const { data: senders } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', Array.from(senderIds))
        
        for (const sender of senders || []) {
          sendersMap[sender.id] = sender
        }
      }
      
      // Transform pesan untuk menyertakan info pengirim
      messages.value = (msgs || []).map(msg => ({
        ...msg,
        sender: sendersMap[msg.sender_id] || null
      }))
    } catch (err) {
      error.value = err.message
      console.error('Error fetching messages:', err)
    } finally {
      loading.value = false
    }
  }

  // Kirim pesan baru
  async function sendMessage(roomId, senderId, message) {
    error.value = null

    try {
      // Masukkan pesan
      const { data: newMsg, error: err } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          message: message.trim()
        })
        .select('*')
        .single()

      if (err) throw err

      // Dapatkan info pengirim
      const { data: senderData } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', senderId)
        .single()

      // Update pesan terakhir di ruang chat
      await supabase
        .from('chat_rooms')
        .update({
          last_message: message.trim(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', roomId)

      return {
        ...newMsg,
        sender: senderData
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Buat atau dapatkan ruang chat yang sudah ada
  async function getOrCreateChatRoom(userId, participantId, lesPlaceId = null) {
    error.value = null

    try {
      // Cek apakah ruang sudah ada
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`and(participant_1.eq.${userId},participant_2.eq.${participantId}),and(participant_1.eq.${participantId},participant_2.eq.${userId})`)
        .single()

      if (existingRoom) return existingRoom

      // Buat ruang baru
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

  // Berlangganan ke pesan real-time di ruang
  function subscribeToMessages(roomId, onNewMessage) {
    // Berhenti berlangganan dari langganan sebelumnya
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
          // Ambil info pengirim untuk pesan baru
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

  // Tandai pesan sudah dibaca
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

  // Dapatkan jumlah belum dibaca untuk ruang
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

  // Dapatkan TOTAL jumlah belum dibaca di semua ruang chat
  async function getTotalUnreadCount(userId) {
    try {
      // Pertama dapatkan semua ruang yang diikuti pengguna
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      
      if (!rooms || rooms.length === 0) return 0
      
      const roomIds = rooms.map(r => r.id)
      
      // Hitung semua pesan belum dibaca yang bukan dikirim pengguna ini
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('room_id', roomIds)
        .neq('sender_id', userId)
        .eq('is_read', false)
      
      return count || 0
    } catch (err) {
      console.error('Error getting total unread count:', err)
      return 0
    }
  }

  // Berhenti berlangganan dari update real-time
  function unsubscribe() {
    if (messageSubscription) {
      supabase.removeChannel(messageSubscription)
      messageSubscription = null
    }
  }

  // Dapatkan partner chat yang tersedia untuk siswa (pengajar dari booking aktif + pemilik)
  async function getAvailableChatPartners(userId) {
    try {
      // Dapatkan ID siswa dulu
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!student) return { teachers: [], owners: [] }

      // Dapatkan SEMUA pemilik dengan tempat les mereka (siswa bisa chat pemilik manapun)
      const { data: allLesPlaces } = await supabase
        .from('les_places')
        .select(`
          id,
          name,
          owner_id,
          owners(
            user_id,
            users(id, name, avatar_url, role)
          )
        `)
        .eq('is_verified', true)

      const ownerMap = new Map()
      for (const lesPlace of allLesPlaces || []) {
        if (lesPlace.owners?.users) {
          const owner = lesPlace.owners.users
          ownerMap.set(owner.id, {
            ...owner,
            lesPlaceName: lesPlace.name,
            lesPlaceId: lesPlace.id
          })
        }
      }

      // Dapatkan booking aktif siswa untuk akses pengajar
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          programs(
            id,
            les_place_id
          )
        `)
        .eq('student_id', student.id)
        .in('status', ['active', 'pending', 'confirmed'])
        .in('payment_status', ['paid', 'settlement', 'capture'])

      // Dapatkan les_place_ids dari booking untuk pengajar
      const lesPlaceIds = new Set()
      for (const booking of bookings || []) {
        if (booking.programs?.les_place_id) {
          lesPlaceIds.add(booking.programs.les_place_id)
        }
      }

      // Dapatkan pengajar HANYA dari les_places yang terdaftar
      const teacherMap = new Map()
      if (lesPlaceIds.size > 0) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select(`
            id,
            user_id,
            specialization,
            les_place_id,
            users(id, name, avatar_url, role),
            les_places(id, name)
          `)
          .in('les_place_id', Array.from(lesPlaceIds))

        for (const teacher of teachers || []) {
          if (teacher.users) {
            teacherMap.set(teacher.users.id, {
              ...teacher.users,
              specialization: teacher.specialization,
              lesPlaceName: teacher.les_places?.name,
              lesPlaceId: teacher.les_place_id
            })
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

  // Dapatkan ID pengguna pemilik berdasarkan ID tempat les
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

  // Bersihkan saat unmount
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
    getTotalUnreadCount,
    unsubscribe,
    getAvailableChatPartners,
    getOwnerByLesPlaceId
  }
}
