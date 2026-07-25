import assert from 'node:assert/strict';
import { buildReservationCancellationSummary, getRefundPolicy } from '../services/reservationService.js';

const now = new Date();
const soon = new Date(now.getTime() + 12 * 60 * 60 * 1000);
const farFuture = new Date(now.getTime() + 48 * 60 * 60 * 1000);

const eligibleReservation = {
  status: 'Confirmed',
  startAt: farFuture.toISOString(),
  endAt: new Date(farFuture.getTime() + 4 * 60 * 60 * 1000).toISOString(),
  rentalAmount: 80
};

const ineligibleReservation = {
  status: 'Confirmed',
  startAt: soon.toISOString(),
  endAt: new Date(soon.getTime() + 4 * 60 * 60 * 1000).toISOString(),
  rentalAmount: 80
};

const summary = buildReservationCancellationSummary(eligibleReservation);
assert.equal(summary.eligible, true);
assert.equal(summary.refundPolicy.canAutoRefund, true);
assert.equal(summary.refundPolicy.label, 'Full refund');

const blocked = buildReservationCancellationSummary(ineligibleReservation);
assert.equal(blocked.eligible, false);
assert.equal(blocked.refundPolicy.canAutoRefund, false);
assert.equal(blocked.refundPolicy.label, 'No automatic refund');

const lenderCancelled = getRefundPolicy({ status: 'Confirmed', cancelledBy: 'lender', rentalAmount: 40 });
assert.equal(lenderCancelled.canAutoRefund, true);
assert.equal(lenderCancelled.label, 'Full refund');

console.log('reservationService tests passed');
