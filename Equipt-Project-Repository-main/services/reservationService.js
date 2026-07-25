function parseReservationDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateCancellationDeadline(startValue) {
  const startDate = parseReservationDate(startValue);

  if (!startDate) {
    return null;
  }

  return new Date(startDate.getTime() - (24 * 60 * 60 * 1000));
}

export function formatReservationDateTime(value) {
  const parsed = parseReservationDate(value);

  if (!parsed) {
    return 'Not provided';
  }

  return parsed.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function getReservationCancellationState(reservation = {}) {
  const startValue = reservation.startAt || reservation.startDateTime || reservation.startDate || reservation.pickupAt || reservation.start || reservation.reservationStart;
  const endValue = reservation.endAt || reservation.endDateTime || reservation.endDate || reservation.end || reservation.pickupEnd || reservation.reservationEnd;
  const status = String(reservation.status || '').trim().toLowerCase();
  const now = new Date();
  const startDate = parseReservationDate(startValue);
  const endDate = parseReservationDate(endValue);
  const isCancelled = status === 'cancelled';
  const hasStarted = Boolean(startDate && now >= startDate);
  const hasEnded = Boolean(endDate && now >= endDate);
  const deadline = startDate ? calculateCancellationDeadline(startDate) : null;
  const isWithinDeadlineWindow = Boolean(startDate && deadline && now < deadline && now < startDate);
  const eligible = !isCancelled && !hasStarted && !hasEnded && isWithinDeadlineWindow;

  return {
    eligible,
    isCancelled,
    hasStarted,
    hasEnded,
    deadline,
    startDate,
    endDate,
    message: eligible
      ? ''
      : 'This reservation can no longer be cancelled online because it begins within 24 hours or is already in progress.'
  };
}

export function getRefundPolicy(reservation = {}) {
  const state = getReservationCancellationState(reservation);
  const cancelledBy = String(reservation.cancelledBy || reservation.cancellationActor || 'renter').toLowerCase();

  if (cancelledBy === 'lender') {
    return {
      canAutoRefund: true,
      label: 'Full refund',
      amount: Number(reservation.rentalAmount || reservation.rentalPrice || reservation.amount || 0),
      summary: 'The lender cancelled this reservation, so a full refund is being processed.'
    };
  }

  if (state.eligible) {
    return {
      canAutoRefund: true,
      label: 'Full refund',
      amount: Number(reservation.rentalAmount || reservation.rentalPrice || reservation.amount || 0),
      summary: 'You cancelled at least 24 hours before the reservation start, so a full refund will be issued.'
    };
  }

  return {
    canAutoRefund: false,
    label: 'No automatic refund',
    amount: 0,
    summary: 'This reservation is not eligible for online cancellation or automatic refund because it begins within 24 hours or is already in progress.'
  };
}

export function buildReservationCancellationSummary(reservation = {}) {
  const state = getReservationCancellationState(reservation);
  const refundPolicy = getRefundPolicy(reservation);

  return {
    ...state,
    refundPolicy,
    cancellationDeadlineLabel: state.deadline ? formatReservationDateTime(state.deadline) : 'Not available'
  };
}
