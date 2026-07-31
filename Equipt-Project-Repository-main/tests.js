import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEffectiveDailyRate, normalizeDailyRate } from './services/pricingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appControllerSource = readFileSync(path.join(__dirname, 'controllers', 'appController.js'), 'utf8');

let passed = 0;
let failed = 0;

function formatValue(value) {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return JSON.stringify(value);
}

function isDeepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function test(name, actual, expected) {
  const matches = isDeepEqual(actual, expected);

  if (matches) {
    passed += 1;
    console.log(`PASS: ${name}`);
    return;
  }

  failed += 1;
  console.log(`FAIL: ${name}`);
  console.log(`  Expected: ${formatValue(expected)}`);
  console.log(`  Actual:   ${formatValue(actual)}`);
}

async function testAsync(name, runAssertion) {
  try {
    const assertionResult = await runAssertion();
    if (assertionResult === true) {
      passed += 1;
      console.log(`PASS: ${name}`);
      return;
    }

    failed += 1;
    console.log(`FAIL: ${name}`);
    if (typeof assertionResult === 'string') {
      console.log(`  ${assertionResult}`);
    }
  } catch (error) {
    failed += 1;
    console.log(`FAIL: ${name}`);
    console.log(`  ${error.message}`);
  }
}

function extractFunctionSource(sourceText, functionName) {
  const signature = `function ${functionName}(`;
  const startIndex = sourceText.indexOf(signature);

  if (startIndex === -1) {
    throw new Error(`Unable to find function ${functionName} in appController.js`);
  }

  const asyncPrefixStart = startIndex >= 6 ? startIndex - 6 : startIndex;
  const hasAsyncPrefix = sourceText.slice(asyncPrefixStart, startIndex) === 'async ';
  const functionStart = hasAsyncPrefix ? asyncPrefixStart : startIndex;

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
        return sourceText.slice(functionStart, index + 1);
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

const matchesCatalogFilters = loadFunctionFromController('matchesCatalogFilters');
const getDateKey = loadFunctionFromController('getDateKey');
const getReservationDateRangeKeys = loadFunctionFromController('getReservationDateRangeKeys', { getDateKey });

// Test 1: Normal keyword search should be case-insensitive ("drill" should match "Drill").
test(
  'keyword search matches title text regardless of letter case',
  matchesCatalogFilters(
    {
      toolName: 'Cordless Drill',
      itemDescription: '18V compact driver',
      dailyRate: 28
    },
    {
      searchText: 'drill',
      priceMin: 0,
      priceMax: 500
    }
  ),
  true
);

// Test 2: Invalid-input case for keyword search should fail safely when listing text fields are missing.
test(
  'keyword search returns false for missing listing text fields',
  matchesCatalogFilters(
    {
      dailyRate: 28
    },
    {
      searchText: 'drill',
      priceMin: 0,
      priceMax: 500
    }
  ),
  false
);

// Test 3: Filters should narrow a listing collection down to only items matching all selected inputs.
{
  const listings = [
    {
      id: 'a',
      toolName: 'Cordless Drill',
      itemCategory: 'Power Tools',
      subcategories: ['Drills'],
      condition: 'Good',
      dailyRate: 35,
      itemLocation: '48104',
      availability: 'Available now'
    },
    {
      id: 'b',
      toolName: 'Hand Saw',
      itemCategory: 'Hand Tools',
      subcategories: ['Saws'],
      condition: 'Good',
      dailyRate: 20,
      itemLocation: '48104',
      availability: 'Available now'
    },
    {
      id: 'c',
      toolName: 'Hammer Drill',
      itemCategory: 'Power Tools',
      subcategories: ['Drills'],
      condition: 'Fair',
      dailyRate: 35,
      itemLocation: '60601',
      availability: 'Reserved'
    }
  ];

  const filters = {
    searchText: 'drill',
    category: 'Power Tools',
    selectedSubcategories: ['drills'],
    selectedConditions: ['Good'],
    location: '48104',
    availabilityNowChecked: true,
    priceMin: 30,
    priceMax: 40
  };

  const visibleIds = listings.filter((listing) => matchesCatalogFilters(listing, filters)).map((listing) => listing.id);
  test('combined filters keep only the fully matching listing', visibleIds, ['a']);
}

// Test 4: Boundary case for daily rate filtering should include exact min/max values and exclude out-of-range prices.
{
  const filters = {
    priceMin: 25,
    priceMax: 25
  };

  const inRange = matchesCatalogFilters({ toolName: 'Sander', dailyRate: 25 }, filters);
  const belowRange = matchesCatalogFilters({ toolName: 'Sander', dailyRate: 24.99 }, filters);

  test('daily rate filter includes values exactly on the boundary', inRange, true);
  test('daily rate filter excludes values below the minimum boundary', belowRange, false);

  const aboveRange = matchesCatalogFilters({ toolName: 'Sander', dailyRate: 25.01 }, filters);
  test('daily rate filter excludes values above the maximum boundary', aboveRange, false);
}

// Test 5: No-results feedback should clearly show "No tools found" when a search yields no visible listings.
await testAsync('no-results message is shown for an empty search result set', async () => {
  const resultsElement = {
    innerHTML: '',
    querySelectorAll: () => []
  };

  const feedbackElement = {
    textContent: '',
    hidden: true
  };

  const documentStub = {
    querySelector: (selector) => (selector === '.catalog-results' ? resultsElement : null),
    getElementById: (id) => (id === 'catalog-feedback' ? feedbackElement : null)
  };

  const databaseServiceStub = {
    async readRecords(collection) {
      if (collection === 'listings') {
        return [
          {
            id: 'only-tool',
            toolName: 'Lawn Mower',
            dailyRate: 40,
            publicationStatus: 'Published'
          }
        ];
      }

      return [];
    }
  };

  const isPublishedListingStub = () => true;
  const getCatalogFilterStateStub = () => ({
    searchText: 'drill',
    location: '',
    category: '',
    selectedSubcategories: [],
    selectedConditions: [],
    priceMin: 0,
    priceMax: 500,
    availabilityNowChecked: false,
    rentalStart: '',
    rentalEnd: ''
  });

  const loadCatalogListings = loadFunctionFromController('loadCatalogListings', {
    document: documentStub,
    databaseService: databaseServiceStub,
    isPublishedListing: isPublishedListingStub,
    getCatalogFilterState: getCatalogFilterStateStub,
    matchesCatalogFilters
  });

  await loadCatalogListings();

  const hasNoResultsMessage =
    feedbackElement.textContent === 'No tools found' &&
    resultsElement.innerHTML.includes('No tools found');

  if (!hasNoResultsMessage) {
    return `Expected no-results messaging. Feedback was ${formatValue(feedbackElement.textContent)}, markup was ${formatValue(resultsElement.innerHTML)}.`;
  }

  return true;
});

// Test 6: Normal rental total calculation should be daily rate multiplied by the number of selected days.
{
  const listing = { dailyRate: 30 };
  const selectedDays = getReservationDateRangeKeys({ startDate: '2026-08-01', endDate: '2026-08-03' });
  const rentalTotal = getEffectiveDailyRate(listing) * selectedDays.length;

  test('rental total equals daily rate multiplied by day count', rentalTotal, 90);
}

// Test 7: Edge case for rental dates where end date is before start date should fall back to one billed day.
{
  const listing = { dailyRate: 30 };
  const selectedDays = getReservationDateRangeKeys({ startDate: '2026-08-05', endDate: '2026-08-03' });
  const rentalTotal = getEffectiveDailyRate(listing) * selectedDays.length;

  test('rental total uses one day when end date is earlier than start date', rentalTotal, 30);
}

// Test 8: Invalid-input case for price values should normalize non-numeric daily rates to zero.
test('invalid daily rate input is normalized to zero', normalizeDailyRate('not-a-number'), 0);

// Test 9: Availability filter failure case should exclude listings that are not currently available.
test(
  'available-now filter excludes reserved listings',
  matchesCatalogFilters(
    {
      toolName: 'Impact Driver',
      availability: 'Reserved',
      dailyRate: 40
    },
    {
      availabilityNowChecked: true,
      priceMin: 0,
      priceMax: 500
    }
  ),
  false
);

// Test 10: No-results path should still be clear when only filters (not search text) eliminate listings.
await testAsync('no-results message is shown for an empty filter result set', async () => {
  const resultsElement = {
    innerHTML: '',
    querySelectorAll: () => []
  };

  const feedbackElement = {
    textContent: '',
    hidden: true
  };

  const documentStub = {
    querySelector: (selector) => (selector === '.catalog-results' ? resultsElement : null),
    getElementById: (id) => (id === 'catalog-feedback' ? feedbackElement : null)
  };

  const databaseServiceStub = {
    async readRecords(collection) {
      if (collection === 'listings') {
        return [
          {
            id: 'only-tool',
            toolName: 'Lawn Mower',
            dailyRate: 40,
            availability: 'Reserved',
            publicationStatus: 'Published'
          }
        ];
      }

      return [];
    }
  };

  const isPublishedListingStub = () => true;
  const getCatalogFilterStateStub = () => ({
    searchText: '',
    location: '',
    category: '',
    selectedSubcategories: [],
    selectedConditions: [],
    priceMin: 0,
    priceMax: 500,
    availabilityNowChecked: true,
    rentalStart: '',
    rentalEnd: ''
  });

  const loadCatalogListings = loadFunctionFromController('loadCatalogListings', {
    document: documentStub,
    databaseService: databaseServiceStub,
    isPublishedListing: isPublishedListingStub,
    getCatalogFilterState: getCatalogFilterStateStub,
    matchesCatalogFilters
  });

  await loadCatalogListings();

  const hasNoResultsMessage =
    feedbackElement.textContent === 'No tools found' &&
    resultsElement.innerHTML.includes('No tools found');

  if (!hasNoResultsMessage) {
    return `Expected no-results messaging for filter-only empty result. Feedback was ${formatValue(feedbackElement.textContent)}, markup was ${formatValue(resultsElement.innerHTML)}.`;
  }

  return true;
});

// Test 11: Boundary case for rental totals should return zero when there is no valid start date.
{
  const listing = { dailyRate: 30 };
  const selectedDays = getReservationDateRangeKeys({ startDate: '', endDate: '2026-08-03' });
  const rentalTotal = getEffectiveDailyRate(listing) * selectedDays.length;

  test('rental total is zero when no start date is provided', rentalTotal, 0);
}

// Test 12: Normal case should use rentalPrice fallback when dailyRate is not present.
{
  const listing = { rentalPrice: '19.995' };
  const selectedDays = getReservationDateRangeKeys({ startDate: '2026-09-01', endDate: '2026-09-03' });
  const rentalTotal = getEffectiveDailyRate(listing) * selectedDays.length;

  test('rental total uses normalized rentalPrice fallback when dailyRate is missing', rentalTotal, 60);
}

console.log('');
console.log(`Summary: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
