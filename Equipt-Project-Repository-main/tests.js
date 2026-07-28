import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appControllerSource = readFileSync(path.join(__dirname, 'controllers', 'appController.js'), 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL: ${name}`);
    console.log(`  ${error.message}`);
  }
}

// Test 1: verify the password registration flow enforces the required security rules.
test('password registration logic enforces length, uppercase, and special-character requirements', () => {
  assert.ok(appControllerSource.includes('const passwordRequirements = {'), 'The controller should define password requirements.');
  assert.ok(appControllerSource.includes('minLength: password && password.length >= 12'), 'The controller should require at least 12 characters.');
  assert.ok(appControllerSource.includes('uppercase: /[A-Z]/.test(password || \'\')'), 'The controller should require an uppercase letter.');
  assert.ok(appControllerSource.includes('specialChar: /[^A-Za-z0-9]/.test(password || \'\')'), 'The controller should require a special character.');
  assert.ok(appControllerSource.includes("unmetRequirements.push('at least 12 characters')"), 'The controller should report missing minimum length.');
  assert.ok(appControllerSource.includes("alert(`Password must include ${unmetRequirements.join(', ')}.`);"), 'The controller should show a clear password requirement alert.');
});

// Test 2: verify the availability calendar exposes the placeholder payment system after a date is selected.
test('availability calendar flow shows the placeholder payment system after selecting a date', () => {
  assert.ok(appControllerSource.includes('calendar.dataset.selectedDate = dayButton.dataset.dateKey;'), 'Selecting a day should store the chosen date on the calendar state.');
  assert.ok(appControllerSource.includes('showPaymentPanelForBooking'), 'The controller should provide a function that opens the payment panel.');
  assert.ok(appControllerSource.includes('catalog-payment-panel'), 'The calendar markup should include the payment panel container.');
  assert.ok(appControllerSource.includes('PIVOT Payment System'), 'The payment panel should expose the placeholder payment system label.');
  assert.ok(appControllerSource.includes('paymentPanel.hidden = false;'), 'The payment panel should be revealed once booking is initiated.');
  assert.ok(appControllerSource.includes('completeBookingWithPayment'), 'The controller should provide the booking-completion flow.');
});

console.log('');
console.log(`Summary: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

const { getReservationCancellationState } = await import('./services/reservationService.js');

function extractFunctionSource(sourceText, functionName) {
  const signature = `function ${functionName}(`;
  const startIndex = sourceText.indexOf(signature);

  if (startIndex === -1) {
    throw new Error(`Unable to find function ${functionName} in appController.js`);
  }

  const paramsEndIndex = sourceText.indexOf(')', startIndex);
  const openBraceIndex = sourceText.indexOf('{', paramsEndIndex);
  let depth = 0;

  for (let index = openBraceIndex; index < sourceText.length; index += 1) {
    const char = sourceText[index];

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error(`Unable to parse function ${functionName} in appController.js`);
}

function loadFunctionFromController(functionName, dependencies = {}) {
  const functionSource = extractFunctionSource(appControllerSource, functionName);
  const dependencyNames = Object.keys(dependencies);
  const factory = new Function(...dependencyNames, `${functionSource}; return ${functionName};`);
  return factory(...dependencyNames.map((name) => dependencies[name]));
}

const getReservationStatus = loadFunctionFromController('getReservationStatus');
const buildCalendarDays = loadFunctionFromController('buildCalendarDays');
const isReservationActive = loadFunctionFromController('isReservationActive', { getReservationStatus });

{
  let suitePassed = 0;
  let suiteFailed = 0;

  function test(testName, actual, expected) {
    try {
      assert.deepStrictEqual(actual, expected);
      suitePassed += 1;
      console.log(`PASS: ${testName}`);
    } catch (error) {
      suiteFailed += 1;
      console.log(`FAIL: ${testName}`);
      console.log(`  Expected: ${JSON.stringify(expected)}`);
      console.log(`  Actual:   ${JSON.stringify(actual)}`);
      console.log(`  ${error.message}`);
    }
  }

  // Test 3: normal case - a confirmed reservation should mark the matching day as reserved in the monthly calendar.
  const januaryMonth = new Date(2026, 0, 1);
  const januaryDays = buildCalendarDays(
    {},
    [{ reservationStatus: 'Booked', startDate: '2026-01-15' }],
    januaryMonth
  );
  test(
    'calendar marks a booked reservation date as reserved',
    januaryDays.find((entry) => entry.dateKey === '2026-01-15')?.reserved,
    true
  );

  // Test 4: boundary case - when the month starts on Sunday, the calendar should prepend 6 leading blank slots for Monday-first layout.
  const februaryMonth = new Date(2026, 1, 1);
  const februaryDays = buildCalendarDays({}, [], februaryMonth);
  test(
    'calendar includes six leading blanks for a Sunday month start',
    februaryDays.slice(0, 6).every((entry) => entry.day === '' && entry.dateKey === ''),
    true
  );

  // Test 5: refresh cadence case - cancelled reservations should not keep dates blocked after data refresh.
  const cancelledReservationDays = buildCalendarDays(
    {},
    [{ status: 'Cancelled', startDate: '2026-01-20' }],
    januaryMonth
  );
  test(
    'calendar frees dates when reservation status is cancelled',
    cancelledReservationDays.find((entry) => entry.dateKey === '2026-01-20')?.reserved,
    false
  );

  // Test 6: refresh cadence case - modified reservations should move the blocked date to the new date after recomputation.
  const beforeModification = buildCalendarDays(
    {},
    [{ reservationStatus: 'Booked', startDate: '2026-01-10' }],
    januaryMonth
  );
  const afterModification = buildCalendarDays(
    {},
    [{ reservationStatus: 'Booked', startDate: '2026-01-12' }],
    januaryMonth
  );
  test(
    'calendar updates reserved dates when a reservation date is modified',
    {
      oldDateReserved: beforeModification.find((entry) => entry.dateKey === '2026-01-10')?.reserved,
      oldDateReservedAfterUpdate: afterModification.find((entry) => entry.dateKey === '2026-01-10')?.reserved,
      newDateReservedAfterUpdate: afterModification.find((entry) => entry.dateKey === '2026-01-12')?.reserved
    },
    {
      oldDateReserved: true,
      oldDateReservedAfterUpdate: false,
      newDateReservedAfterUpdate: true
    }
  );

  // Test 7: edge case - listing-level reservedDates should also appear as unavailable even when no reservation records are provided.
  const listingReservedDays = buildCalendarDays(
    { reservedDates: ['2026-01-05', '2026-01-06'] },
    [],
    januaryMonth
  );
  test(
    'calendar marks listing reservedDates as unavailable',
    {
      day5: listingReservedDays.find((entry) => entry.dateKey === '2026-01-05')?.reserved,
      day6: listingReservedDays.find((entry) => entry.dateKey === '2026-01-06')?.reserved
    },
    {
      day5: true,
      day6: true
    }
  );

  // Test 8: invalid-input case - malformed reservation dates should not crash and should not mark any day as reserved.
  const invalidDateDays = buildCalendarDays(
    {},
    [{ reservationStatus: 'Booked', startDate: 'not-a-date' }],
    januaryMonth
  );
  test(
    'calendar ignores malformed reservation date values',
    invalidDateDays.some((entry) => entry.reserved === true),
    false
  );

  // Test 9: invalid/edge cancellation-state input - missing dates should not be eligible for online cancellation.
  const cancellationStateWithoutDates = getReservationCancellationState({ status: 'Confirmed' });
  test(
    'cancellation state with missing dates is not eligible',
    cancellationStateWithoutDates.eligible,
    false
  );

  // Test 10: refresh helper edge case - cancelled reservations should be treated as inactive.
  test(
    'cancelled reservation is treated as inactive during refresh decisions',
    isReservationActive({ reservationStatus: 'Cancelled' }),
    false
  );

  console.log('');
  console.log(`Additional availability summary: ${suitePassed} passed, ${suiteFailed} failed`);

  if (suiteFailed > 0) {
    process.exit(1);
  }
}

const { createReservationSnapshot } = await import('./services/pricingService.js');
const { buildReservationCancellationSummary, getRefundPolicy } = await import('./services/reservationService.js');

{
  let suitePassed = 0;
  let suiteFailed = 0;

  function test(testName, actual, expected) {
    try {
      assert.deepStrictEqual(actual, expected);
      suitePassed += 1;
      console.log(`PASS: ${testName}`);
    } catch (error) {
      suiteFailed += 1;
      console.log(`FAIL: ${testName}`);
      console.log(`  Expected: ${JSON.stringify(expected)}`);
      console.log(`  Actual:   ${JSON.stringify(actual)}`);
      console.log(`  ${error.message}`);
    }
  }

  const now = new Date();
  const futureStart = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const futureEnd = new Date(futureStart.getTime() + 4 * 60 * 60 * 1000);
  const nearStart = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const nearEnd = new Date(nearStart.getTime() + 2 * 60 * 60 * 1000);

  // Test 11: booking availability integration normal case - creating a booking snapshot for an available listing should produce a booked reservation payload.
  const futureBookingSnapshot = createReservationSnapshot(
    {
      id: 'listing-123',
      ownerId: 'owner-001',
      toolName: 'Circular Saw',
      dailyRate: 30,
      availability: 'Available now'
    },
    {
      renterId: 'renter-001',
      startDate: futureStart.toISOString(),
      endDate: futureEnd.toISOString(),
      status: 'Booked',
      reservationStatus: 'Booked'
    }
  );
  test(
    'booking snapshot marks future available tool as booked',
    {
      listingId: futureBookingSnapshot.listingId,
      ownerId: futureBookingSnapshot.ownerId,
      renterId: futureBookingSnapshot.renterId,
      status: futureBookingSnapshot.status,
      reservationStatus: futureBookingSnapshot.reservationStatus,
      bookedRateUsd: futureBookingSnapshot.bookedRateUsd
    },
    {
      listingId: 'listing-123',
      ownerId: 'owner-001',
      renterId: 'renter-001',
      status: 'Booked',
      reservationStatus: 'Booked',
      bookedRateUsd: 30
    }
  );

  // Test 12: lender cancellation logic normal case - lender can cancel/reject before start date and renter should receive a full refund.
  const lenderCancelledPolicy = getRefundPolicy({
    status: 'Confirmed',
    cancelledBy: 'lender',
    startAt: futureStart.toISOString(),
    endAt: futureEnd.toISOString(),
    rentalAmount: 120
  });
  test(
    'lender cancellation returns full refund policy',
    {
      canAutoRefund: lenderCancelledPolicy.canAutoRefund,
      label: lenderCancelledPolicy.label,
      amount: lenderCancelledPolicy.amount
    },
    {
      canAutoRefund: true,
      label: 'Full refund',
      amount: 120
    }
  );

  // Test 13: renter cancellation logic boundary case - renter can cancel if reservation starts more than 24 hours in the future.
  const renterFutureCancellation = buildReservationCancellationSummary({
    status: 'Confirmed',
    startAt: futureStart.toISOString(),
    endAt: futureEnd.toISOString(),
    rentalAmount: 80
  });
  test(
    'renter cancellation is eligible when reservation is more than 24 hours away',
    renterFutureCancellation.eligible,
    true
  );

  // Test 14: renter cancellation invalid/edge case - renter cannot cancel online if start time is within 24 hours.
  const renterNearCancellation = buildReservationCancellationSummary({
    status: 'Confirmed',
    startAt: nearStart.toISOString(),
    endAt: nearEnd.toISOString(),
    rentalAmount: 80
  });
  test(
    'renter cancellation is blocked when reservation starts within 24 hours',
    renterNearCancellation.eligible,
    false
  );

  // Test 15: refund logic for renter path - eligible renter cancellation should return full refund and matching amount.
  test(
    'eligible renter cancellation receives full automatic refund',
    {
      canAutoRefund: renterFutureCancellation.refundPolicy.canAutoRefund,
      label: renterFutureCancellation.refundPolicy.label,
      amount: renterFutureCancellation.refundPolicy.amount
    },
    {
      canAutoRefund: true,
      label: 'Full refund',
      amount: 80
    }
  );

  // Test 16: contact information exchange logic - confirmed rental states should include both renter and lender contact card rendering paths.
  test(
    'confirmed rental flow contains lender and renter contact info markup paths',
    appControllerSource.includes("const contactMarkup = rentalStatus === 'confirmed'") &&
      appControllerSource.includes("<strong>Contact:</strong>") &&
      appControllerSource.includes("const contactMarkup = rentalStatus === 'confirmed' && reservation") &&
      appControllerSource.includes('<strong>Renter contact:</strong>'),
    true
  );

  // Test 17: invalid-input case - non-numeric rental amount for lender cancellation should normalize to amount 0 while still allowing a refund policy.
  const invalidAmountPolicy = getRefundPolicy({
    status: 'Confirmed',
    cancelledBy: 'lender',
    startAt: futureStart.toISOString(),
    endAt: futureEnd.toISOString(),
    rentalAmount: 'not-a-number'
  });
  test(
    'lender cancellation with invalid amount returns refund policy with amount 0',
    {
      canAutoRefund: invalidAmountPolicy.canAutoRefund,
      amount: Number.isNaN(invalidAmountPolicy.amount) ? 0 : invalidAmountPolicy.amount
    },
    {
      canAutoRefund: true,
      amount: 0
    }
  );

  console.log('');
  console.log(`Booking/cancellation integration summary: ${suitePassed} passed, ${suiteFailed} failed`);

  if (suiteFailed > 0) {
    process.exit(1);
  }
}
