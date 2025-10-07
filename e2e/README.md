# Playwright E2E Tests for WovenWebApp

This directory contains end-to-end tests for the WovenWebApp using Playwright.

## Test Structure

- `math-brain.spec.ts` - Tests for /math-brain entry point, form submission, and chart generation
- `chat-auth.spec.ts` - Tests for /chat authentication gates and Poetic Brain access
- `api.spec.ts` - Direct API tests for Netlify functions
- `export-flows.spec.ts` - Tests for markdown, JSON, and other export functionality
- `regression.spec.ts` - Regression tests for core functionality and benchmarks

## Running Tests

### Install Playwright Browsers

First time setup:
```bash
npx playwright install --with-deps
```

This command installs:
- Playwright browser binaries (Chromium, Firefox, WebKit)
- System dependencies required by the browsers (--with-deps flag)

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx playwright test e2e/math-brain.spec.ts
```

### Run Tests in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Tests in Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug Tests

```bash
npx playwright test --debug
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Writing Tests

Tests follow Playwright best practices:

1. **Use data-testid attributes** for reliable selectors
2. **Wait for elements** with appropriate timeouts
3. **Test user flows**, not implementation details
4. **Use helpers** to reduce duplication
5. **Skip tests** that require credentials or external dependencies

## CI Integration

Tests run automatically in GitHub Actions when `CI=true` is set. The config includes:

- 2 retries on failure
- Single worker (no parallelization)
- GitHub reporter for annotations
- Screenshots on failure
- Trace on first retry

## Configuration

See `playwright.config.ts` for full configuration including:

- Base URL (defaults to http://localhost:8888)
- Browser projects (Chromium, Firefox, WebKit)
- Web server auto-start
- Timeout settings
- Reporter configuration

## Test Coverage

### Math Brain
- ✅ Page loads correctly
- ✅ Form fields are visible
- ✅ Solo natal chart submission
- ✅ Relational chart input
- ✅ Markdown export

### Chat (Poetic Brain)
- ✅ Auth gate redirects unauthenticated users
- ✅ RequireAuth component displays
- ⏭️ Authenticated chat interface (requires Auth0)
- ⏭️ Chat message sending (requires Auth0)

### API
- ✅ Natal chart computation
- ✅ Required field validation
- ✅ Invalid coordinate handling
- ✅ Relational chart computation
- ✅ Orb filter enforcement
- ✅ Timeout handling

### Exports
- ✅ Markdown export (natal mirror)
- ✅ Balance meter report with provenance
- ✅ JSON export with frontstage/backstage data

### Regression
- ✅ Geometry integrity across exports
- ✅ Hurricane Michael benchmark (Magnitude 5.0)
- ✅ Empty transit response handling
- ✅ Orbs enforcement validation

## Known Limitations

1. **Auth0 Tests**: Tests requiring actual authentication are skipped (marked with `test.skip()`)
2. **API Dependencies**: Some tests depend on external API availability (RapidAPI)
3. **Export Tests**: Require filesystem access and may be environment-dependent

## Troubleshooting

### Browsers not installing

```bash
npx playwright install --force --with-deps
```

### Tests timing out

Increase timeout in `playwright.config.ts` or individual tests:

```typescript
test('my test', async ({ page }) => {
  await page.goto('/math-brain', { timeout: 60000 });
});
```

### Port already in use

Kill the existing process:

```bash
pkill -f netlify
```

### Tests fail locally but pass in CI

Check environment variables and ensure `.env` is configured correctly.

## Best Practices

1. **Keep tests independent** - Each test should be able to run in isolation
2. **Use realistic data** - Test with actual birth data formats
3. **Test user journeys** - Focus on complete workflows, not individual functions
4. **Handle timing** - Use `waitForSelector` and `waitForTimeout` appropriately
5. **Clean up** - Reset state between tests if needed
6. **Document skipped tests** - Explain why tests are skipped

## Future Enhancements

- [ ] Visual regression testing with `toHaveScreenshot()`
- [ ] Performance testing with `page.metrics()`
- [ ] Accessibility testing with `@axe-core/playwright`
- [ ] Mobile device emulation tests
- [ ] Network interception for offline testing
- [ ] Database seeding for consistent test data
