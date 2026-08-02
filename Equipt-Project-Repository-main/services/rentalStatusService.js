export function normalizeRentalStatus(value = '') {
  const rawStatus = String(value || '').trim().toLowerCase();

  if (!rawStatus) {
    return 'confirmed';
  }

  if (['booked', 'reserved', 'pending', 'confirmed', 'pending confirmation'].includes(rawStatus)) {
    return 'confirmed';
  }

  if (['active', 'in progress', 'in-progress'].includes(rawStatus)) {
    return 'active';
  }

  if (['returned', 'complete', 'completed'].includes(rawStatus)) {
    return 'returned';
  }

  if (['cancelled', 'canceled'].includes(rawStatus)) {
    return 'cancelled';
  }

  return rawStatus;
}

export function getRentalStatusLabel(status = '') {
  const normalizedStatus = normalizeRentalStatus(status);

  switch (normalizedStatus) {
    case 'active':
      return 'Active';
    case 'returned':
      return 'Returned';
    case 'cancelled':
      return 'Cancelled';
    case 'confirmed':
    default:
      return 'Confirmed';
  }
}

export function getRentalStatusClass(status = '') {
  const normalizedStatus = normalizeRentalStatus(status);

  switch (normalizedStatus) {
    case 'active':
      return 'rental-status-chip--active';
    case 'returned':
      return 'rental-status-chip--returned';
    case 'cancelled':
      return 'rental-status-chip--cancelled';
    case 'confirmed':
    default:
      return 'rental-status-chip--confirmed';
  }
}

export function getAllowedRentalStatusTransitions(status = '') {
  const normalizedStatus = normalizeRentalStatus(status);

  if (!normalizedStatus || normalizedStatus === 'returned' || normalizedStatus === 'cancelled') {
    return [];
  }

  if (normalizedStatus === 'confirmed') {
    return [
      { label: 'Mark as Active', nextStatus: 'active' },
      { label: 'Cancel Rental', nextStatus: 'cancelled' }
    ];
  }

  if (normalizedStatus === 'active') {
    return [
      { label: 'Mark as Returned', nextStatus: 'returned' },
      { label: 'Cancel Rental', nextStatus: 'cancelled' }
    ];
  }

  return [];
}
