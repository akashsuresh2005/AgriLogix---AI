export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (value, decimals = 1) => {
  if (value === undefined || value === null || isNaN(value)) return '0.0%';
  return `${Number(value).toFixed(decimals)}%`;
};

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  try {
    let str = String(dateString).trim();
    // If backend timestamp lacks timezone offset (e.g. SQLite UTC "2026-09-28T04:03:00" or "2026-09-28 04:03:00"), treat as UTC
    if (str && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      if (str.includes('T')) {
        str = str + 'Z';
      } else if (str.includes(' ')) {
        str = str.replace(' ', 'T') + 'Z';
      }
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options,
    });
  } catch (e) {
    return dateString;
  }
};

