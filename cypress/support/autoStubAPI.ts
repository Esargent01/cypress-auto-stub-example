function getFixtureName(spec: any) {
  const specName = spec.name
    .replace('integration/', '')
    .replace('.spec.ts', '');
  return `${specName}.api.snapshot.json`;
}

before(() => {
  let polyfill: any;
  /**
   * Cypress does not support monitor Fetch API request right now (see
   * https://github.com/cypress-io/cypress/issues/95), so here we need
   * to manually load a polyfill Fetch to make sure Fetch API will fallback
   * to XHR, which Cypress can monitor.
   */
  const polyfillUrl = 'https://unpkg.com/unfetch/dist/unfetch.umd.js';
  cy.request(polyfillUrl).then(response => {
    polyfill = response.body;
  });
  Cypress.on('window:before:load', win => {
    delete win.fetch;
    (win as any).eval(polyfill);
    win.fetch = (win as any).unfetch;
  });
});

beforeEach(function() {
  const isAutoStubEnabled = Cypress.env('autoRecordEnabled');
  cy.log(`API Auto Record: ${isAutoStubEnabled ? 'ON' : 'OFF'}`);

  cy._apiData = [];
  cy._apiCount = 0;
  cy.server({
    onRequest: (req: any) => {
      cy._apiCount++;
    },
    onResponse: (xhr: any) => {
      cy._apiCount--;
      if (isAutoStubEnabled) {
        // save URL without the host info, because API host might be different between
        // Record and Replay session
        const url = xhr.url.replace(Cypress.env('apiHost'), '');
        const method = xhr.method;
        const request = {
          body: xhr.request.body,
        };
        const response = {
          body: xhr.response.body,
        };
        // save API request/response into an array so we can write these info to fixture
        cy._apiData.push({ url, method, request, response });
      }
    },
  });

  if (isAutoStubEnabled) {
    const stubAPIPattern = new RegExp(Cypress.env('stubAPIPattern'));
    // let Cypress stub all API requests which match the pattern defined in cypress.json
    cy.route('GET', stubAPIPattern);
    cy.route('POST', stubAPIPattern);
    cy.route('PUT', stubAPIPattern);
    cy.route('DELETE', stubAPIPattern);
  } else {
    const testFileInfo = Cypress.spec;
    const testCaseTitle = this.currentTest.fullTitle();
    const fixtureName = getFixtureName(testFileInfo);
    cy.fixture(fixtureName).then((apiRecords: APISnapshotFixture) => {
      apiRecords[testCaseTitle].forEach(apiRecord => {
        const fullUrl = `${Cypress.env('apiHost')}${apiRecord.url}`;
        cy.route(apiRecord.method, fullUrl, apiRecord.response.body);
      });
    });
  }
});

afterEach(function() {
  const isAutoStubEnabled = Cypress.env('autoRecordEnabled');
  if (isAutoStubEnabled) {
    const testFileInfo = Cypress.spec;
    const testCaseTitle = this.currentTest.fullTitle();
    const fixtureName = getFixtureName(testFileInfo);
    const fixturePath = `cypress/fixtures/${fixtureName}`;
    cy.log('API recorded', cy._apiData);
    cy.writeFile(fixturePath, {
      [testCaseTitle]: cy._apiData,
    });
  }
});