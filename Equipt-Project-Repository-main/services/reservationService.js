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
  const isWithinCancellationWindow = Boolean(startDate && deadline && now >= deadline && now < startDate);
  const eligible = !isCancelled && !hasStarted && !hasEnded && !isWithinCancellationWindow;

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
  const normalizedStatus = String(reservation.status || reservation.reservationStatus || '').trim().toLowerCase();
  const cancellationAt = parseReservationDate(
    reservation.cancelledAt || reservation.cancellationRequestedAt || reservation.cancellationDate || reservation.updatedAt
  );

  if (cancelledBy === 'lender') {
    return {
      canAutoRefund: true,
      label: 'Full refund',
      amount: Number(reservation.rentalAmount || reservation.rentalPrice || reservation.amount || 0),
      summary: 'The lender cancelled this reservation, so a full refund is being processed.'
    };
  }

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    const deadline = state.deadline;
    const cancelledBeforeDeadline = Boolean(cancellationAt && deadline && cancellationAt <= deadline);

    if (cancelledBeforeDeadline) {
      return {
        canAutoRefund: true,
        label: 'Full refund',
        amount: Number(reservation.rentalAmount || reservation.rentalPrice || reservation.amount || 0),
        summary: 'You cancelled more than 24 hours before the reservation start, so you are eligible for a full refund.'
      };
    }

    return {
      canAutoRefund: false,
      label: 'No automatic refund',
      amount: 0,
      summary: 'You cancelled within 24 hours of the reservation start, so you are not eligible for a refund.'
    };
  }

  if (state.eligible) {
    return {
      canAutoRefund: true,
      label: 'Full refund',
      amount: Number(reservation.rentalAmount || reservation.rentalPrice || reservation.amount || 0),
      summary: 'If you cancel at least 24 hours before the reservation start, you will receive a full refund.'
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
