import { describe, expect, it } from 'vitest'
import { validateMarket } from './marketService'

const validMarket = {
  name_kh: 'ផ្សារថ្មី', market_type_id: 1, status: 'active', province_id: 1,
  district_id: 2, commune_id: 3, latitude: 11.5564, longitude: 104.9282,
  total_stalls: 100, occupied_stalls: 80, opening_time: '06:00', closing_time: '18:00',
}

describe('validateMarket', () => {
  it('accepts valid market data', () => {
    expect(validateMarket(validMarket)).toEqual({})
  })

  it('requires core market and location fields', () => {
    const errors = validateMarket({})
    expect(errors).toHaveProperty('name_kh')
    expect(errors).toHaveProperty('market_type_id')
    expect(errors).toHaveProperty('province_id')
    expect(errors).toHaveProperty('district_id')
    expect(errors).toHaveProperty('commune_id')
  })

  it('rejects invalid coordinates', () => {
    const errors = validateMarket({ ...validMarket, latitude: 91, longitude: -181 })
    expect(errors).toHaveProperty('latitude')
    expect(errors).toHaveProperty('longitude')
  })

  it('rejects occupied stalls above total stalls', () => {
    expect(validateMarket({ ...validMarket, occupied_stalls: 101 })).toHaveProperty('occupied_stalls')
  })

  it('validates phone, email and operating hours', () => {
    const errors = validateMarket({ ...validMarket, phone: '123', email: 'invalid', opening_time: '18:00', closing_time: '06:00' })
    expect(errors).toHaveProperty('phone')
    expect(errors).toHaveProperty('email')
    expect(errors).toHaveProperty('closing_time')
  })
})
