describe('Network test', function() {
  it('should show the user data', function() {
    cy.visit('/');

    // fetch all users
    cy.get('#xhr-btn').click();
    cy.get('#xhr-result').should('contain', '"page":1');
    // create a user
    cy.get('#post-btn').click();
    cy.get('#post-result').should('contain', 'Cypress');
    // fetch 10 single users one by one
    cy.get('#fetch-btn').click();
    cy.waitUntilAllAPIFinished();
    cy.get('#fetch-result').should('contain', '"id":10');

    // query all users
    cy.get('#graphql-query-btn').click();
    cy.get('#graphql-query-result').should('contain', 'firstName');
    // update a user
    cy.get('#graphql-mutation-btn').click();
    cy.waitUntilAllAPIFinished();
    cy.get('#graphql-mutation-result').should('contain', 'Cypress');
  });
});
