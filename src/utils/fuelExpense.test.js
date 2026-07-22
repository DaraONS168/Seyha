import { describe, expect, it } from 'vitest'
import { calculateFuelMetrics } from './fuelExpense'

describe('calculateFuelMetrics', () => {
  it('calculates distance, total, efficiency and cost per km', () => {
    expect(calculateFuelMetrics({ start_odometer: 100, end_odometer: 250, fuel_liters: 10, price_per_liter: 4200 })).toEqual({
      distance_km: 150,
      total_amount: 42000,
      fuel_efficiency: 15,
      cost_per_km: 280,
    })
  })

  it('avoids negative distance and division by zero', () => {
    expect(calculateFuelMetrics({ start_odometer: 20, end_odometer: 10, fuel_liters: 0, price_per_liter: 4000 })).toEqual({
      distance_km: 0,
      total_amount: 0,
      fuel_efficiency: 0,
      cost_per_km: 0,
    })
  })
})
