# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T18:04:09.763Z |
| Version | 1.0.0 |
| Git SHA | 6177ca3 |

## ✅ admin can delete users

- **Given** a user with role "admin"
- **When** the user attempts to "delete users"
- **Then** the action should succeed

## ✅ admin can view reports

- **Given** a user with role "admin"
- **When** the user attempts to "view reports"
- **Then** the action should succeed

## ✅ API accepts a JSON payload

- **Given** the client has the following JSON payload
    **Payload**
    
    ```json
    {
      "email": "user@example.com",
      "password": "secret",
      "rememberMe": true
    }
    ```
    
- **When** the client sends the request
- **Then** the response status should be 200

## ✅ API endpoint documentation

- **Given** the API server is running
    **Endpoint Details**
    
    This endpoint handles user authentication and returns a JWT token.
    
- **When** a POST request is made to /api/login
    **Request Headers**
    
    ```json
    {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
    ```
    
- **Then** the response should include a token
    **Response**
    
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600,
      "user": {
        "id": 1,
        "email": "user@example.com"
      }
    }
    ```
    

## ✅ Bulk user creation

- **Given** the following users exist
    **Users**
    
    | email | role | status |
    | --- | --- | --- |
    | alice@example.com | admin | active |
    | bob@example.com | user | active |
    | carol@example.com | user | pending |
    
- **When** the admin opens the user list
- **Then** the user list should include all users

## ✅ Change email address

- **Given** the user account exists
- **And** the user is logged in
- **When** the user updates their email to 'new@example.com'
- **Then** a verification email should be sent

## ✅ Change password

- **Given** the user account exists
- **And** the user is logged in
- **When** the user updates their password
- **Then** the old sessions should be invalidated
- **And** a confirmation email should be sent

## ✅ Complete e-commerce checkout flow

- **Given** the user is logged in
- **And** the user has items in cart
- **And** the user has a saved address
- **And** the user has a valid payment method
- **When** the user proceeds to checkout
- **And** the user confirms the shipping address
- **And** the user selects standard shipping
- **And** the user confirms the payment method
- **And** the user places the order
- **Then** the order should be created
- **And** the payment should be authorized
- **And** the inventory should be reserved
- **And** a confirmation email should be sent
- **And** the order should appear in order history

## ✅ Complete keyword demonstration

- **Given** a given step
- **And** another given step
- **And** an explicit and step
- **When** a when step
- **And** another when step
- **Then** a then step
- **And** another then step
- **But** a but step
- **And** a final and step

## ✅ Complex user journey

- **Given** the user account exists
- **And** the user has admin privileges
- **When** the user logs in
- **And** the user navigates to admin panel
- **Then** the admin dashboard should load
- **And** the user count should be displayed

## ✅ Data transformation pipeline

- **Given** the following input data
    **Input**
    
    | id | name | value |
    | --- | --- | --- |
    | 1 | item-a | 100 |
    | 2 | item-b | 200 |
    
- **When** the transformation is applied
- **Then** the output should be
    **Output**
    
    | id | name | processedValue |
    | --- | --- | --- |
    | 1 | ITEM-A | 110 |
    | 2 | ITEM-B | 220 |
    

## ✅ Eligible customer gets discount

- **Given** the customer is eligible for discounts
- **And** the customer has items worth $100
- **When** the customer checks out
- **Then** a 10% discount should be applied
- **And** the total should be $90

## ✅ Enterprise User features

- **Given** a user with enterprise plan
- **When** the user views available features
- **Then** the user should have access to 3 features
    **Available Features**
    
    ```json
    [
      "basic",
      "advanced",
      "custom"
    ]
    ```
    

## ✅ Failed login attempt

- **Given** the user account exists
- **When** the user enters an incorrect password
- **But** the user should not be logged in
- **And** an error message should be displayed
- **And** the failed attempt should be logged

## ⚠️ Feature under development

- **Given** the new feature flag is enabled
- **When** the user accesses the new feature _(todo)_
- **Then** the feature should work correctly _(todo)_

## ✅ Form submission with multiple fields

- **Given** the user is on the registration form
- **When** the user fills in the form
    **Form Data**
    
    | field | value |
    | --- | --- |
    | name | John Doe |
    | email | john@example.com |
    | password | securepass123 |
    
- **Then** the form should be submitted successfully

## ✅ Free User features

- **Given** a user with free plan
- **When** the user views available features
- **Then** the user should have access to 1 features
    **Available Features**
    
    ```json
    [
      "basic"
    ]
    ```
    

## ✅ guest cannot view reports

- **Given** a user with role "guest"
- **When** the user attempts to "view reports"
- **Then** the action should be denied
- **But** the user should see a permission error

## ✅ Ineligible customer does not get discount

- **Given** the customer is not eligible for discounts
- **And** the customer has items worth $100
- **When** the customer checks out
- **Then** no discount should be applied
- **And** the total should be $100

## ✅ Log file format validation

- **Given** the application has processed requests
- **When** the log file is generated
- **Then** the log should match the expected format
    **Expected Log Format**
    
    ```text
    [2024-01-15 10:30:00] INFO  - Request received
    [2024-01-15 10:30:01] DEBUG - Processing started
    [2024-01-15 10:30:02] INFO  - Request completed
    ```
    

## ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
- **But** the session should not be created

## ✅ Login error: Account is locked

- **Given** the user is on the login page
- **When** the user logs in with "locked@example.com" and "secret"
- **Then** the error message should be "Account is locked"

## ✅ Login error: Invalid credentials

- **Given** the user is on the login page
- **When** the user logs in with "user@example.com" and "wrong"
- **Then** the error message should be "Invalid credentials"

## ✅ Login error: Please verify your email

- **Given** the user is on the login page
- **When** the user logs in with "unverified@example.com" and "pass123"
- **Then** the error message should be "Please verify your email"

## ✅ Multi-step process

- **Given** step one is complete
- **And** step two is complete
- **And** step three is complete
- **When** the process continues
- **And** additional processing occurs
- **Then** result one is correct
- **And** result two is correct
- **And** result three is correct

## ✅ Order summary displays correct items

- **Given** the user has completed an order
- **When** the user views the order summary
- **Then** the order should display the following items
    **Order Items**
    
    | product | quantity | price |
    | --- | --- | --- |
    | Widget A | 2 | $20.00 |
    | Widget B | 1 | $15.00 |
    | Shipping | 1 | $5.00 |
    

## ✅ Order with discount

- **Given** the following items in cart
    **Cart Items**
    
    | product | quantity | price |
    | --- | --- | --- |
    | A | 2 | $10 |
    | B | 1 | $20 |
    
- **And** a 10% discount is applied
- **When** the total is calculated
- **Then** the total should be $36

## ✅ Order with explicit And steps

- **Given** the user is logged in
- **And** the user has a valid payment method
- **And** the user has items in cart
- **When** the user clicks checkout
- **And** confirms the order
- **Then** the order should be created
- **And** the payment should be processed
- **And** a confirmation should be displayed

## ✅ Partial success scenario

- **Given** the user has multiple items in cart
- **And** one item is out of stock
- **When** the user attempts to checkout
- **Then** the available items should be ordered
- **But** the out of stock item should be removed
- **And** the user should be notified
- **But** the order should not be cancelled

## ✅ Premium user gets early access
Tags: `premium`, `feature-flag`
Tickets: `JIRA-456`

- **Given** the user has a premium subscription
- **And** the early access feature is enabled
- **When** the user logs in
- **Then** the user should see early access features

## ✅ Pro User features

- **Given** a user with pro plan
- **When** the user views available features
- **Then** the user should have access to 2 features
    **Available Features**
    
    ```json
    [
      "basic",
      "advanced"
    ]
    ```
    

## ✅ Shipping for 10kg order

- **Given** an order weighing 10 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $15

## ✅ Shipping for 1kg order

- **Given** an order weighing 1 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $5

## ✅ Shipping for 25kg order

- **Given** an order weighing 25 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $25

## ✅ Shipping for 5kg order

- **Given** an order weighing 5 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $10

## ✅ Standard order

- **Given** the following items in cart
    **Cart Items**
    
    | product | quantity | price |
    | --- | --- | --- |
    | A | 2 | $10 |
    | B | 1 | $20 |
    
- **When** the total is calculated
- **Then** the total should be $40

## ✅ Successful order confirmation

- **Given** the user has items in cart
- **When** the user completes checkout
- **Then** the order should be created
- **And** a confirmation email should be sent
- **And** the inventory should be updated

## ✅ System parses XML configuration

- **Given** the following XML configuration
    **Configuration**
    
    ```xml
    <config>
      <server>localhost</server>
      <port>8080</port>
      <debug>true</debug>
    </config>
    ```
    
- **When** the system loads the configuration
- **Then** the settings should be applied

## ⏩ Temporarily disabled test

- **Given** some precondition
- **When** some action
- **Then** some expected result

## ✅ User can update their profile

- **Given** the user is authenticated
- **And** the user session is valid
- **When** the user updates their profile
- **Then** the changes should be saved
- **And** a success message should be shown

## ✅ user can view reports

- **Given** a user with role "user"
- **When** the user attempts to "view reports"
- **Then** the action should succeed

## ✅ User can view their profile

- **Given** the user is authenticated
- **And** the user session is valid
- **When** the user navigates to profile page
- **Then** the profile information should be displayed

## ✅ user cannot delete users

- **Given** a user with role "user"
- **When** the user attempts to "delete users"
- **Then** the action should be denied
- **But** the user should see a permission error

## ✅ User logs in successfully

- **Given** the user account exists
- **And** the user is on the login page
- **And** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard

## ✅ User registration flow

- **Given** the registration form is displayed
    **Registration Flow**
    ```mermaid
    graph LR
        A[Form Displayed] --> B[User Fills Form]
        B --> C{Valid?}
        C -->|Yes| D[Create Account]
        C -->|No| E[Show Errors]
        D --> F[Send Email]
        F --> G[Success Page]
    ```
- **When** the user submits valid information
- **Then** the account should be created
- **And** a verification email should be sent

## ✅ User updates profile settings

- **Given** the user is logged in
- **When** the user navigates to settings
- **And** the user changes their display name
- **Then** the changes should be saved
