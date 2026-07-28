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
