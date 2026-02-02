# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T18:04:09.763Z |
| Version | 1.0.0 |
| Git SHA | 6177ca3 |

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
- **And** the response body should include "token"

## ✅ Bulk user creation

- **Given** the following users exist
    **Users**
    
    | email | role | status |
    | --- | --- | --- |
    | alice@example.com | admin | active |
    | bob@example.com | user | active |
    | eve@example.com | user | locked |
    
- **When** the admin opens the user list
- **Then** the user list should include
    **Expected**
    
    | email | role | status |
    | --- | --- | --- |
    | alice@example.com | admin | active |
    | bob@example.com | user | active |
    | eve@example.com | user | locked |
    

## ✅ Calculate shipping options

- **Given** the user has entered the shipping address
    **Address**
    
    | country | state | zip |
    | --- | --- | --- |
    | US | CA | 94107 |
    
- **When** shipping options are calculated
- **Then** the available options should include "Standard"
- **And** the available options should include "Express"
- **And** the estimated delivery date should be shown

## ✅ Change email address

- **Given** the user account exists
- **And** the user is logged in
- **When** the user updates their email to "new@example.com"
- **Then** a verification email should be sent
- **And** the email status should be "pending verification"

## ✅ Change password

- **Given** the user account exists
- **And** the user is logged in
- **When** the user changes their password
- **Then** the user should be able to log in with the new password

## ✅ Checkout calculates totals

- **Given** the cart has 2 items
- **When** the user proceeds to checkout
- **Then** the subtotal should be $40.00
- **And** the tax should be $4.00
- **And** the total should be $44.00

## ✅ Configure feature flags

- **Given** the following feature flags are set
    **Feature flags**
    
    | service | flag | enabled |
    | --- | --- | --- |
    | web | new_checkout_ui | true |
    | api | strict_rate_limiting | false |
    
- **When** the system starts
- **Then** the flag "new_checkout_ui" should be enabled for "web"
- **And** the flag "strict_rate_limiting" should be disabled for "api"

## ✅ Create order
Tags: `db`, `smoke`

- **Given** the database is seeded
- **And** the API is running
- **When** the client creates an order
- **Then** the response status should be 201
- **And** the order should exist in the database

## ✅ Create users from table input: a@example.com

- **Given** the admin is on the create user page
- **When** the admin submits the following user details
    **Details**
    
    | email | role |
    | --- | --- |
    | a@example.com | user |
    
- **Then** the user "a@example.com" should exist with role "user"

## ✅ Create users from table input: admin@example.com

- **Given** the admin is on the create user page
- **When** the admin submits the following user details
    **Details**
    
    | email | role |
    | --- | --- |
    | admin@example.com | admin |
    
- **Then** the user "admin@example.com" should exist with role "admin"

## ✅ Document status changes

- **Given** a document exists with status "draft"
- **When** the user submits the document
- **Then** the document status should change to "submitted"
- **And** an audit log entry should be created

## ✅ Eligible customer gets discount

- **Given** the customer is eligible for discounts
- **When** the customer checks out
- **Then** a discount should be applied

## ✅ Guest checkout allowed

- **Given** the user is on the checkout page
- **And** the user is not logged in
    _Note:_ But guest checkout is enabled
- **When** the user submits an order as a guest
- **Then** the order should be created

## ✅ Import users and send welcome email

- **Given** the following users are to be imported
    **Users**
    
    | email | name |
    | --- | --- |
    | a@example.com | Alice |
    | b@example.com | Bob |
    
- **And** the email template is
    **Template**
    
    ```json
    Welcome {{name}}!
    Thanks for joining.
    ```
    
- **When** the import job runs
- **Then** the users should exist
- **And** welcome emails should be sent

## ✅ Import XML invoice

- **Given** the invoice XML is
    **Invoice**
    
    ```xml
    <invoice>
      <id>INV-100</id>
      <amount>42.50</amount>
      <currency>USD</currency>
    </invoice>
    ```
    
- **When** the user imports the invoice
- **Then** the invoice should be saved
- **And** the invoice total should be 42.50 USD

## ✅ Ineligible customer does not get discount

- **Given** the customer is not eligible for discounts
- **When** the customer checks out
- **Then** no discount should be applied

## ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in

## ✅ Login errors: Account is locked

- **Given** the user is on the login page
- **When** the user logs in with "locked@example.com" and "secret"
- **Then** the error message should be "Account is locked"

## ⚠️ Login errors: Invalid credentials

- **Given** the user is on the login page
- **When** the user logs in with "user@example.com" and "wrong"
- **Then** the error message should be "Invalid credentials"

## ✅ Login works
Tags: `smoke`, `auth`

- **Given** the user is on the login page
- **When** the user logs in with valid credentials
- **Then** the user should be logged in

## ✅ Logout clears session

- **Given** the user is logged in
- **When** the user logs out
- **Then** the session cookie should be cleared
- **And** the auth token should be revoked
- **And** the user should be redirected to the login page

## ✅ Many login attempts: u1@example.com -> success

- **Given** the user is on the login page
- **When** the user logs in with "u1@example.com" and "secret"
- **Then** the login result should be "success"

## ✅ Many login attempts: u2@example.com -> fail

- **Given** the user is on the login page
- **When** the user logs in with "u2@example.com" and "wrong"
- **Then** the login result should be "fail"

## ✅ Many login attempts: u3@example.com -> success

- **Given** the user is on the login page
- **When** the user logs in with "u3@example.com" and "secret"
- **Then** the login result should be "success"

## ✅ Many login attempts: u4@example.com -> fail

- **Given** the user is on the login page
- **When** the user logs in with "u4@example.com" and "wrong"
- **Then** the login result should be "fail"

## ✅ Password reset flow

- **Given** the user account exists
- **And** the user has a verified email
- **When** the user requests a password reset
- **And** the user opens the reset email link
- **And** the user sets a new password
- **Then** the user should be able to log in with the new password
- **And** the old password should no longer work

## ✅ Payment declined

- **Given** the user is on the checkout page
- **When** the user submits a declined card
- **Then** the payment should be declined
- **And** the user should see "Payment failed"
- **But** the order should not be created

## ✅ Post JSON payload: 123 -> 200

- **Given** the payload is
    **Payload**
    
    ```json
    {
      "id": "123",
      "status": "active"
    }
    ```
    
- **When** the client posts the payload
- **Then** the response status should be 200

## ✅ Post JSON payload: 456 -> 400

- **Given** the payload is
    **Payload**
    
    ```json
    {
      "id": "456",
      "status": "invalid"
    }
    ```
    
- **When** the client posts the payload
- **Then** the response status should be 400

## ✅ Render markdown

- **Given** the markdown input is
    **Markdown**
    
    ```markdown
    # Title
    - Item 1
    - Item 2
    ```
    
- **When** the user previews the markdown
- **Then** the preview should show a heading "Title"
- **And** the preview should show a list with 2 items

## ✅ Report shows fields in order

- **Given** a report exists for account "A1"
- **When** the user downloads the report
- **Then** the report header should be "Account Report"
- **And** the first column should be "Date"
- **And** the second column should be "Amount"

## ✅ Search results show highlights

- **Given** the search index contains "hello world"
- **When** the user searches for "hello"
- **Then** results should include "hello world"
- **And** the matching text should be highlighted

## ✅ Shipping eligibility: CA -> yes

- **Given** the cart total is 10
- **And** the destination country is "CA"
- **When** shipping eligibility is checked
- **Then** shipping should be "yes"

## ✅ Shipping eligibility: CU -> no

- **Given** the cart total is 10
- **And** the destination country is "CU"
- **When** shipping eligibility is checked
- **Then** shipping should be "no"

## ✅ Shipping eligibility: US -> yes

- **Given** the cart total is 10
- **And** the destination country is "US"
- **When** shipping eligibility is checked
- **Then** shipping should be "yes"

## ✅ Tax calculation by region: CA

- **Given** the cart subtotal is 100.00
- **And** the shipping region is "CA"
- **When** taxes are calculated
- **Then** the tax should be 8.25
- **And** the total should be 108.25

## ✅ Tax calculation by region: NY

- **Given** the cart subtotal is 100.00
- **And** the shipping region is "NY"
- **When** taxes are calculated
- **Then** the tax should be 8.00
- **And** the total should be 108.00

## ✅ Two step checkout

- **Given** the user has items in the cart
- **When** the user enters shipping information
- **And** the user selects a delivery option
- **And** the user enters payment information
- **And** the user confirms the order
- **Then** the order should be created
- **And** a confirmation email should be sent

## ✅ Update preferences

- **Given** the user has the following preferences
    **Preferences**
    
    | key | value |
    | --- | --- |
    | email_opt_in | true |
    | theme | dark |
    | timezone | UTC |
    
- **When** the user saves preferences
- **Then** the preferences should be persisted

## ✅ User logs in successfully

- **Given** the user account exists
- **And** the user is on the login page
- **And** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard

## ✅ User updates profile details

- **Given** the user is logged in
- **When** the user changes their display name
- **And** the user changes their time zone
- **And** the user saves the profile
- **Then** the profile should show the updated details
