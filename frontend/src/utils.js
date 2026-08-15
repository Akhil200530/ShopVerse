export function formatRupee(amount) {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)} INR`
}

export function discountPercent(price, original) {
  if (!original || original <= price) return null
  return Math.round(((original - price) / original) * 100)
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}