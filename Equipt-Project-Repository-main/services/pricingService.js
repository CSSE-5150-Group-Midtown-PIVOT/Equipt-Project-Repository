export function normalizeDailyRate(value) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 0;
  }

  return Math.round(parsedValue * 100) / 100;
}

export function formatUsdRate(value) {
  const normalizedValue = normalizeDailyRate(value);
  return `$${normalizedValue.toFixed(2)} USD`;
}

export function getEffectiveDailyRate(listing = {}) {
  return normalizeDailyRate(listing.dailyRate ?? listing.rentalPrice ?? listing.rateUsd ?? listing.bookingRateUsd ?? 0);
}

export function createReservationSnapshot(listing = {}, overrides = {}) {
  const bookedRateUsd = normalizeDailyRate(overrides.bookedRateUsd ?? getEffectiveDailyRate(listing));

  return {
    listingId: listing.id || '',
    ownerId: listing.ownerId || '',
    toolName: listing.toolName || '',
    bookedRateUsd,
    dailyRateUsd: bookedRateUsd,
    currency: 'USD',
    bookedAt: overrides.bookedAt || new Date().toISOString(),
    status: overrides.status || 'Booked',
    reservationStatus: overrides.reservationStatus || 'Booked',
    ...overrides
  };
}

export function shouldBlockRateChange(listing = {}, nextDailyRate) {
  const nextRate = normalizeDailyRate(nextDailyRate);
  const currentRate = getEffectiveDailyRate(listing);
  const hasActiveReservation = Boolean(
    listing.reservationStatus === 'Booked' ||
    listing.reservationStatus === 'Reserved' ||
    listing.isReserved ||
    listing.hasActiveReservation ||
    listing.bookingId ||
    listing.reservationId ||
    (typeof listing.availability === 'string' && listing.availability.toLowerCase().includes('reserved'))
  );

  return hasActiveReservation && nextRate !== currentRate;
}
