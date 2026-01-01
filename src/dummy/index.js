// Main Index file untuk Dummy Data
// 20 Tempat Les Akademik dengan gambar dari folder public/Gambar

import { USE_DUMMY_DATA } from './config'
import { lesPlacesData } from './dataDummy'

// Transform data agar sesuai dengan format yang diharapkan aplikasi
const transformLesPlace = (lesPlace, index) => {
  const id = lesPlace.id || 'dummy-' + Math.random().toString(36).substr(2, 9)
  
  // Variasi tipe kelas
  const types = ['offline', 'hybrid', 'offline', 'hybrid', 'offline', 'offline', 'offline', 'hybrid', 'offline', 'offline',
                 'offline', 'hybrid', 'offline', 'hybrid', 'offline', 'offline', 'online', 'offline', 'hybrid', 'offline']
  const uniqueType = types[index] || lesPlace.type || 'offline'
  
  return {
    id,
    name: lesPlace.name,
    description: lesPlace.description,
    type: uniqueType,
    address: lesPlace.address,
    city: lesPlace.city,
    district: lesPlace.district,
    photos: [lesPlace.thumbnail], // Gunakan thumbnail dari data
    facilities: lesPlace.facilities || [],
    highlights: lesPlace.highlights || [],
    rating: lesPlace.rating,
    review_count: lesPlace.review_count,
    student_count: lesPlace.student_count,
    total_students: lesPlace.student_count,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    created_at: new Date().toISOString(),
    // Nested relations
    programs: (lesPlace.programs || []).map((p, idx) => ({
      id: `${id}-prog-${idx}`,
      ...p,
      is_active: true
    })),
    teachers: (lesPlace.teachers || []).map((t, idx) => ({
      id: `${id}-teacher-${idx}`,
      experience_years: t.experience_years,
      education: t.education,
      specialization: t.specializations ? t.specializations[0] : '',
      specializations: t.specializations || [],
      bio: t.bio,
      is_active: true,
      users: {
        name: t.name,
        avatar_url: null
      }
    })),
    reviews: (lesPlace.reviews || []).map((r, idx) => ({
      id: `${id}-review-${idx}`,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at || new Date().toISOString(),
      reply: null,
      replied_at: null,
      bookings: {
        programs: {
          id: `${id}-prog-0`,
          name: r.program_name
        }
      },
      students: {
        users: {
          name: r.student_name,
          avatar_url: null
        }
      }
    })),
    owners: {
      id: `${id}-owner`,
      business_name: lesPlace.name,
      verification_status: 'verified',
      users: {
        name: 'Owner ' + lesPlace.name,
        avatar_url: null,
        phone: '081234567890'
      }
    }
  }
}

// Transform semua 20 tempat les
const allLesPlaces = lesPlacesData.map((lesPlace, index) => transformLesPlace(lesPlace, index))

// Export data dan config
export { USE_DUMMY_DATA }

// Backward compatibility
export const matematikaSains = lesPlacesData
export const kategori1Formal = lesPlacesData

// Get all les places (untuk listing)
export const getDummyLesPlaces = () => {
  return allLesPlaces.map(lp => ({
    id: lp.id,
    name: lp.name,
    description: lp.description?.substring(0, 150) + '...',
    type: lp.type,
    address: lp.address,
    city: lp.city,
    district: lp.district,
    photos: lp.photos,
    rating: lp.rating,
    review_count: lp.review_count,
    student_count: lp.student_count,
    total_students: lp.total_students,
    is_active: lp.is_active,
    is_verified: lp.is_verified,
    verification_status: lp.verification_status,
    programs: lp.programs.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      price_type: p.price_type,
      subject: p.subject
    }))
  }))
}

// Get single les place by ID (untuk detail page)
export const getDummyLesPlaceById = (id) => {
  return allLesPlaces.find(lp => lp.id === id) || null
}

// Search/filter les places
export const searchDummyLesPlaces = ({ search = '', category = '', type = '', city = '' }) => {
  return allLesPlaces.filter(lp => {
    const matchSearch = !search || 
      lp.name.toLowerCase().includes(search.toLowerCase()) ||
      lp.description.toLowerCase().includes(search.toLowerCase())
    
    const matchType = !type || lp.type === type
    const matchCity = !city || lp.city === city
    
    return matchSearch && matchType && matchCity
  }).map(lp => ({
    id: lp.id,
    name: lp.name,
    description: lp.description?.substring(0, 150) + '...',
    type: lp.type,
    address: lp.address,
    city: lp.city,
    district: lp.district,
    photos: lp.photos,
    rating: lp.rating,
    review_count: lp.review_count,
    student_count: lp.student_count,
    total_students: lp.total_students,
    is_active: lp.is_active,
    is_verified: lp.is_verified,
    verification_status: lp.verification_status,
    programs: lp.programs.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      price_type: p.price_type,
      subject: p.subject
    }))
  }))
}

export default allLesPlaces
