# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T16:27:07.599Z |
| Version | 1.0.0 |
| Git SHA | 73f2377 |

#### ✅ User logs in successfully

- **Given** the user account exists
- **Given** the user is on the login page
- **Given** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard

#### ✅ User updates profile settings

- **Given** the user is logged in
- **When** the user navigates to settings
- **When** the user changes their display name
- **Then** the changes should be saved

#### ✅ Successful order confirmation

- **Given** the user has items in cart
- **When** the user completes checkout
- **Then** the order should be created
- **Then** a confirmation email should be sent
- **Then** the inventory should be updated

#### ✅ Complex user journey

- **Given** the user account exists
- **Given** the user has admin privileges
- **When** the user logs in
- **When** the user navigates to admin panel
- **Then** the admin dashboard should load
- **Then** the user count should be displayed

#### ✅ Login blocked for suspended user

- **Given** the user account exists
- **Given** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
- **But** the session should not be created

#### ✅ Bulk user creation

- **Given** the following users exist
    **Users**
    
    | email | role | status |
    | --- | --- | --- |
    | alice@example.com | admin | active |
    | bob@example.com | user | active |
    | carol@example.com | user | pending |
    
- **When** the admin opens the user list
- **Then** the user list should include all users

#### ✅ Form submission with multiple fields

- **Given** the user is on the registration form
- **When** the user fills in the form
    **Form Data**
    
    | field | value |
    | --- | --- |
    | name | John Doe |
    | email | john@example.com |
    | password | securepass123 |
    
- **Then** the form should be submitted successfully

#### ✅ API accepts a JSON payload

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

#### ✅ System parses XML configuration

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

#### ✅ Change email address

- **Given** the user account exists
- **Given** the user is logged in
- **When** the user updates their email to 'new@example.com'
- **Then** a verification email should be sent

#### ✅ Change password

- **Given** the user account exists
- **Given** the user is logged in
- **When** the user updates their password
- **Then** the old sessions should be invalidated
- **Then** a confirmation email should be sent

### Rule: Discounts apply only to eligible customers

#### ✅ Eligible customer gets discount

- **Given** the customer is eligible for discounts
- **Given** the customer has items worth $100
- **When** the customer checks out
- **Then** a 10% discount should be applied
- **Then** the total should be $90

#### ✅ Ineligible customer does not get discount

- **Given** the customer is not eligible for discounts
- **Given** the customer has items worth $100
- **When** the customer checks out
- **Then** no discount should be applied
- **Then** the total should be $100

#### ✅ Login error: Invalid credentials

- **Given** the user is on the login page
- **When** the user logs in with "user@example.com" and "wrong"
- **Then** the error message should be "Invalid credentials"

#### ✅ Login error: Account is locked

- **Given** the user is on the login page
- **When** the user logs in with "locked@example.com" and "secret"
- **Then** the error message should be "Account is locked"

#### ✅ Login error: Please verify your email

- **Given** the user is on the login page
- **When** the user logs in with "unverified@example.com" and "pass123"
- **Then** the error message should be "Please verify your email"

#### ✅ Shipping for 1kg order

- **Given** an order weighing 1 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $5

#### ✅ Shipping for 5kg order

- **Given** an order weighing 5 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $10

#### ✅ Shipping for 10kg order

- **Given** an order weighing 10 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $15

#### ✅ Shipping for 25kg order

- **Given** an order weighing 25 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $25

#### ✅ admin can delete users

- **Given** a user with role "admin"
- **When** the user attempts to "delete users"
- **Then** the action should succeed

#### ✅ admin can view reports

- **Given** a user with role "admin"
- **When** the user attempts to "view reports"
- **Then** the action should succeed

#### ✅ user cannot delete users

- **Given** a user with role "user"
- **When** the user attempts to "delete users"
- **Then** the action should be denied
- **But** the user should see a permission error

#### ✅ user can view reports

- **Given** a user with role "user"
- **When** the user attempts to "view reports"
- **Then** the action should succeed

#### ✅ guest cannot view reports

- **Given** a user with role "guest"
- **When** the user attempts to "view reports"
- **Then** the action should be denied
- **But** the user should see a permission error

#### ✅ Order with explicit And steps

- **Given** the user is logged in
- **And** the user has a valid payment method
- **And** the user has items in cart
- **When** the user clicks checkout
- **And** confirms the order
- **Then** the order should be created
- **And** the payment should be processed
- **And** a confirmation should be displayed

#### ✅ Partial success scenario

- **Given** the user has multiple items in cart
- **Given** one item is out of stock
- **When** the user attempts to checkout
- **Then** the available items should be ordered
- **But** the out of stock item should be removed
- **And** the user should be notified
- **But** the order should not be cancelled

#### ✅ Premium user gets early access
Tags: `premium`, `feature-flag` | Tickets: `JIRA-456`

- **Given** the user has a premium subscription
- **Given** the early access feature is enabled
- **When** the user logs in
- **Then** the user should see early access features

#### ✅ Order summary displays correct items

- **Given** the user has completed an order
- **When** the user views the order summary
- **Then** the order should display the following items
    **Order Items**
    
    | product | quantity | price |
    | --- | --- | --- |
    | Widget A | 2 | $20.00 |
    | Widget B | 1 | $15.00 |
    | Shipping | 1 | $5.00 |
    

#### ✅ Data transformation pipeline

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
    

#### ✅ Failed login attempt

- **Given** the user account exists
- **When** the user enters an incorrect password
- **But** the user should not be logged in
- **And** an error message should be displayed
- **And** the failed attempt should be logged

#### ✅ Complete e-commerce checkout flow

- **Given** the user is logged in
- **Given** the user has items in cart
- **Given** the user has a saved address
- **Given** the user has a valid payment method
- **When** the user proceeds to checkout
- **When** the user confirms the shipping address
- **When** the user selects standard shipping
- **When** the user confirms the payment method
- **When** the user places the order
- **Then** the order should be created
- **Then** the payment should be authorized
- **Then** the inventory should be reserved
- **Then** a confirmation email should be sent
- **Then** the order should appear in order history

#### ✅ API endpoint documentation

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
    

#### ✅ Free User features

- **Given** a user with free plan
- **When** the user views available features
- **Then** the user should have access to 1 features
    **Available Features**
    
    ```json
    [
      "basic"
    ]
    ```
    

#### ✅ Pro User features

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
    

#### ✅ Enterprise User features

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
    

#### ✅ Log file format validation

- **Given** the application has processed requests
- **When** the log file is generated
- **Then** the log should match the expected format
    **Expected Log Format**
    
    ```text
    [2024-01-15 10:30:00] INFO  - Request received
    [2024-01-15 10:30:01] DEBUG - Processing started
    [2024-01-15 10:30:02] INFO  - Request completed
    ```
    

#### ✅ Multi-step process

- **Given** step one is complete
- **Given** step two is complete
- **Given** step three is complete
- **When** the process continues
- **When** additional processing occurs
- **Then** result one is correct
- **Then** result two is correct
- **Then** result three is correct

#### ✅ User registration flow

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
- **Then** a verification email should be sent

### Rule: Authenticated users can manage their data

#### ✅ User can view their profile

- **Given** the user is authenticated
- **Given** the user session is valid
- **When** the user navigates to profile page
- **Then** the profile information should be displayed

#### ✅ User can update their profile

- **Given** the user is authenticated
- **Given** the user session is valid
- **When** the user updates their profile
- **Then** the changes should be saved
- **And** a success message should be shown

#### ✅ Complete keyword demonstration

- **Given** a given step
- **Given** another given step
- **And** an explicit and step
- **When** a when step
- **When** another when step
- **Then** a then step
- **Then** another then step
- **But** a but step
- **And** a final and step

#### ✅ Standard order

- **Given** the following items in cart
    **Cart Items**
    
    | product | quantity | price |
    | --- | --- | --- |
    | A | 2 | $10 |
    | B | 1 | $20 |
    
- **When** the total is calculated
- **Then** the total should be $40

#### ✅ Order with discount

- **Given** the following items in cart
    **Cart Items**
    
    | product | quantity | price |
    | --- | --- | --- |
    | A | 2 | $10 |
    | B | 1 | $20 |
    
- **Given** a 10% discount is applied
- **When** the total is calculated
- **Then** the total should be $36
