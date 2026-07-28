// Root launcher: execute the real test suite in the application folder.
// This keeps `node tests.js` working when run from the workspace root.
(async () => {
  await import('./Equipt-Project-Repository-main/tests.js');
})().catch((error) => {
  console.error('Unable to run project tests:', error);
  process.exit(1);
});
