import { normalizeDailyRate, formatUsdRate, getEffectiveDailyRate, createReservationSnapshot, shouldBlockRateChange } from './Equipt-Project-Repository-main/services/pricingService.js';
import {
  normalizeRentalStatus,
  getRentalStatusLabel,
  getRentalStatusClass,
  getAllowedRentalStatusTransitions
} from './Equipt-Project-Repository-main/services/rentalStatusService.js';

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nReceived: ${actualJson}`);
  }
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS - ${name}`);
    return true;
  } catch (error) {
    console.log(`FAIL - ${name}`);
    console.log(`  ${error.message}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

const run = (name, fn) => {
  const ok = runTest(name, fn);
  if (ok) {
    passed += 1;
  } else {
    failed += 1;
  }
};

// Checks that a normal positive price is rounded to cents.
run('normalizeDailyRate rounds a typical price to two decimals', () => {
  assertEqual(normalizeDailyRate(19.995), 20, 'Expected daily rate to round to 20.00');
});

// Checks that invalid or non-positive prices are treated as free/invalid.
run('normalizeDailyRate returns 0 for invalid or non-positive values', () => {
  assertEqual(normalizeDailyRate('abc'), 0, 'Expected invalid input to produce 0');
  assertEqual(normalizeDailyRate(-5), 0, 'Expected negative input to produce 0');
  assertEqual(normalizeDailyRate(0), 0, 'Expected zero to produce 0');
});

// Checks that the effective rate uses the first available listing pricing field.
run('getEffectiveDailyRate prefers the listing daily rate when provided', () => {
  const listing = { dailyRate: 35.5, rentalPrice: 50 };
  assertEqual(getEffectiveDailyRate(listing), 35.5, 'Expected the daily rate field to be preferred');
});

// Checks that the helper falls back safely when a listing has no usable pricing values.
run('getEffectiveDailyRate returns 0 when pricing fields are missing or invalid', () => {
  assertEqual(getEffectiveDailyRate({}), 0, 'Expected an empty listing to produce a zero rate');
  assertEqual(getEffectiveDailyRate({ dailyRate: 'abc' }), 0, 'Expected invalid pricing values to fall back to zero');
});

// Checks that price formatting uses USD formatting.
run('formatUsdRate formats a price with USD currency text', () => {
  assertEqual(formatUsdRate(12.5), '$12.50 USD', 'Expected USD formatting to include the currency label');
});

// Checks that a reservation snapshot is created with the expected booking values.
run('createReservationSnapshot builds a reservation record with listing and rate details', () => {
  const listing = { id: 'listing-1', ownerId: 'owner-1', toolName: 'Drill' };
  const snapshot = createReservationSnapshot(listing, { bookedRateUsd: 12.5, status: 'Booked' });

  assertEqual(snapshot.listingId, 'listing-1', 'Expected the listing ID to be copied into the snapshot');
  assertEqual(snapshot.toolName, 'Drill', 'Expected the tool name to be copied into the snapshot');
  assertEqual(snapshot.bookedRateUsd, 12.5, 'Expected the booked rate to be preserved');
  assertEqual(snapshot.reservationStatus, 'Booked', 'Expected the reservation status to be set');
});

// Checks that a listing without an active reservation can still change price.
run('shouldBlockRateChange returns false when no active reservation exists', () => {
  const listing = { reservationStatus: 'Available', hasActiveReservation: false };
  assertEqual(shouldBlockRateChange(listing, 25), false, 'Expected price updates to be allowed without an active reservation');
});

// Checks that an active reservation blocks a price change.
run('shouldBlockRateChange returns true when an active reservation exists and the rate changes', () => {
  const listing = { reservationStatus: 'Booked', hasActiveReservation: false };
  assertEqual(shouldBlockRateChange(listing, 25), true, 'Expected active reservations to block rate changes');
});

// Checks that a no-op rate change does not get blocked when the rate is unchanged.
run('shouldBlockRateChange returns false when the rate stays the same despite an active reservation', () => {
  const listing = { reservationStatus: 'Booked', dailyRate: 20 };
  assertEqual(shouldBlockRateChange(listing, 20), false, 'Expected unchanged rates to be allowed');
});

// Checks that common rental status values are normalized to the app's expected values.
run('normalizeRentalStatus maps common status aliases to the core status values', () => {
  assertEqual(normalizeRentalStatus('Pending Confirmation'), 'confirmed', 'Expected pending confirmation to normalize to confirmed');
  assertEqual(normalizeRentalStatus('in progress'), 'active', 'Expected in progress to normalize to active');
  assertEqual(normalizeRentalStatus('CANCELED'), 'cancelled', 'Expected canceled to normalize to cancelled');
});

// Checks that the label formatter returns a user-friendly display label for each normalized state.
run('getRentalStatusLabel returns the correct label for each normalized status', () => {
  assertEqual(getRentalStatusLabel('booked'), 'Confirmed', 'Expected confirmed bookings to display as Confirmed');
  assertEqual(getRentalStatusLabel('active'), 'Active', 'Expected active rentals to display as Active');
  assertEqual(getRentalStatusLabel('returned'), 'Returned', 'Expected returned rentals to display as Returned');
  assertEqual(getRentalStatusLabel('cancelled'), 'Cancelled', 'Expected cancelled rentals to display as Cancelled');
});

// Checks that empty or unknown rental statuses fall back predictably instead of crashing.
run('getRentalStatusLabel and getRentalStatusClass fall back safely for empty or unknown statuses', () => {
  assertEqual(getRentalStatusLabel('   '), 'Confirmed', 'Expected whitespace-only statuses to default to Confirmed');
  assertEqual(getRentalStatusClass('unknown'), 'rental-status-chip--confirmed', 'Expected unknown statuses to use the confirmed class');
});

// Checks that the CSS class helper returns the expected class names.
run('getRentalStatusClass returns the correct class for each rental status', () => {
  assertEqual(getRentalStatusClass('confirmed'), 'rental-status-chip--confirmed', 'Expected confirmed status to use the confirmed class');
  assertEqual(getRentalStatusClass('active'), 'rental-status-chip--active', 'Expected active status to use the active class');
  assertEqual(getRentalStatusClass('returned'), 'rental-status-chip--returned', 'Expected returned status to use the returned class');
  assertEqual(getRentalStatusClass('cancelled'), 'rental-status-chip--cancelled', 'Expected cancelled status to use the cancelled class');
});

// Checks that confirmed and active statuses expose valid next actions while terminal states do not.
run('getAllowedRentalStatusTransitions returns the right next steps for each status', () => {
  assertDeepEqual(getAllowedRentalStatusTransitions('confirmed'), [
    { label: 'Mark as Active', nextStatus: 'active' },
    { label: 'Cancel Rental', nextStatus: 'cancelled' }
  ], 'Expected confirmed rentals to allow activation or cancellation');
  assertDeepEqual(getAllowedRentalStatusTransitions('active'), [
    { label: 'Mark as Returned', nextStatus: 'returned' },
    { label: 'Cancel Rental', nextStatus: 'cancelled' }
  ], 'Expected active rentals to allow completion or cancellation');
  assertDeepEqual(getAllowedRentalStatusTransitions('returned'), [], 'Expected returned rentals to have no further transitions');
  assertDeepEqual(getAllowedRentalStatusTransitions('   '), [
    { label: 'Mark as Active', nextStatus: 'active' },
    { label: 'Cancel Rental', nextStatus: 'cancelled' }
  ], 'Expected empty statuses to default to confirmed and allow normal transitions');
});

console.log(`\nSummary: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
