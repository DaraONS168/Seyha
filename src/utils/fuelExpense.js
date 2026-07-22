export const calculateFuelMetrics = ({ start_odometer, end_odometer, fuel_liters, price_per_liter }) => {
  const start = Number(start_odometer) || 0
  const end = Number(end_odometer) || 0
  const liters = Number(fuel_liters) || 0
  const price = Number(price_per_liter) || 0
  const distance = Math.max(end - start, 0)
  const total = liters * price
  return {
    distance_km: distance,
    total_amount: total,
    fuel_efficiency: liters > 0 ? distance / liters : 0,
    cost_per_km: distance > 0 ? total / distance : 0,
  }
}

export const FUEL_STATUS = {
  draft: { label: 'ព្រាង', className: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'រង់ចាំអនុម័ត', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'បានអនុម័ត', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'បានបដិសេធ', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'បានបោះបង់', className: 'bg-slate-100 text-slate-500' },
}
