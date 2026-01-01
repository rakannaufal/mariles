// Main Index file untuk Dummy Data
// Menggabungkan 50 tempat les AKADEMIK

import { USE_DUMMY_DATA } from './config'
import { kategori1Formal, uniqueThumbnails, uniqueStudentCounts } from './dataDummy'
import { bahasaInggris, bahasaAsia } from './dataKategori2_5'
import { seniDesain, bimbelSD } from './dataKategori6_10'

// Transform data agar sesuai dengan format yang diharapkan aplikasi
const transformLesPlace = (lesPlace, index) => {
  const id = lesPlace.id || 'dummy-' + Math.random().toString(36).substr(2, 9)
  
  // Gunakan thumbnail dan student_count unik berdasarkan index
  const uniquePhoto = uniqueThumbnails[index] || uniqueThumbnails[0]
  const uniqueStudentCount = uniqueStudentCounts[index] || (100 + index * 17)
  
  return {
    id,
    name: lesPlace.name,
    description: lesPlace.description,
    type: lesPlace.type,
    address: lesPlace.address,
    city: lesPlace.city,
    district: lesPlace.district,
    photos: [uniquePhoto], // Gunakan thumbnail unik
    facilities: lesPlace.facilities || [],
    highlights: lesPlace.highlights || [],
    rating: lesPlace.rating,
    review_count: lesPlace.review_count,
    student_count: uniqueStudentCount, // Gunakan student_count unik
    total_students: uniqueStudentCount,
    is_active: lesPlace.is_active,
    is_verified: lesPlace.is_verified,
    verification_status: lesPlace.verification_status,
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

// Gabungkan semua 50 tempat les
// Kategori 1: Formal & Akademis (10)
// Kategori 2: Modern & Inggris-Indonesia (10)
// Kategori 3: Bersahabat & Homey (10)
// Kategori 4: Singkat, Padat & Bimbel Banget (10)
// Kategori 5: Optimis & Berorientasi Masa Depan (10)
const allLesPlaces = [
  ...kategori1Formal,   // 1-10: Formal
  ...bahasaInggris,     // 11-20: Modern
  ...bahasaAsia,        // 21-30: Bersahabat
  ...seniDesain,        // 31-40: Singkat
  ...bimbelSD           // 41-50: Optimis
].map((lesPlace, index) => transformLesPlace(lesPlace, index))

// Export data dan config
export { USE_DUMMY_DATA }

// Backward compatibility exports
export const matematikaSains = kategori1Formal

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
