# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T20:55:26.518Z |
| Version | 2.0.0 |
| Git SHA | 3149bef |

## src/__tests__/edge-cases.test.ts

### edge cases - empty and minimal values

### ✅ handles empty step text

- **Given** 

### ✅ handles whitespace-only step text

- **Given**    

### ✅ handles scenario with no steps


### ✅ handles empty tags array


### ✅ handles empty ticket array


### ✅ handles empty meta object


### edge cases - special characters

### ✅ handles special characters in step text

- **Given** a value with <brackets> & ampersand 'quotes' "double" `backticks`

### ✅ handles markdown in step text

- **Given** **bold** and _italic_ and [link](url)

### ✅ handles newlines in step text

- **Given** line one
line two
line three

### ✅ handles unicode characters

- **Given** emoji: 🎉 🚀 ✅
- **When** Chinese: 你好世界
- **Then** Arabic: مرحبا بالعالم

### ✅ handles special characters in tags
Tags: `tag-with-dash`, `tag.with.dots`, `tag_with_underscore`


### edge cases - doc method edge cases

### ✅ story.tag() with single string

- **Given** precondition
    `single-tag`

### ✅ story.tag() with array

- **Given** precondition
    `tag1` `tag2` `tag3`

### ✅ story.code() without lang parameter

- **Given** code block
    **Script**
    
    ```
    console.log('hello')
    ```
    

### ✅ story.json() with null value

- **Given** null data
    **Data**
    
    ```json
    null
    ```
    

### ✅ story.json() with array value

- **Given** array data
    **Items**
    
    ```json
    [
      1,
      2,
      3
    ]
    ```
    

### ✅ story.json() with deeply nested object

- **Given** nested data
    **Config**
    
    ```json
    {
      "level1": {
        "level2": {
          "level3": {
            "value": "deep"
          }
        }
      }
    }
    ```
    

### ✅ story.table() with empty rows

- **Given** empty table
    **Empty**
    
    | A | B |
    | --- | --- |
    

### ✅ story.kv() with complex value

- **Given** complex kv
    - **Object:** {"nested":true}

### ✅ story.mermaid() without title

- **Given** diagram
    ```mermaid
    graph LR; A-->B
    ```

### ✅ story.screenshot() without alt

- **Given** screenshot
    ![Screenshot](/path/to/image.png)

### edge cases - inline docs edge cases

### ✅ step with all inline doc types

- **Given** everything
    > A note
    `tag1` `tag2`
    - **key1:** value1
    - **key2:** value2
    **Code**
    
    ```python
    x = 1
    ```
    
    **JSON**
    
    ```json
    {
      "foo": "bar"
    }
    ```
    
    **Table**
    
    | A |
    | --- |
    | 1 |
    
    [Link](https://example.com)
    **Section**
    
    content
    
    **Diagram**
    ```mermaid
    graph LR
    ```
    ![Image](/img.png)
    **[myType]**
    
    ```json
    {
      "custom": true
    }
    ```
    

### ✅ step with empty inline docs object

- **Given** no docs

### edge cases - multiple docs on same step

### ✅ multiple note() calls attach to same step

- **Given** precondition
    > First note
    > Second note
    > Third note

### ✅ mixed doc types attach to same step

- **When** action
    > A note
    - **Key:** Value
    **Data**
    
    ```json
    {
      "x": 1
    }
    ```
    
    [Link](https://example.com)

### edge cases - story-level docs ordering

### ✅ multiple story-level docs before steps maintain order

> First note
[API](https://api.example.com)
> Second note
- **Given** then a step

### edge cases - long content

### ✅ handles very long step text

- **Given** xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

### ✅ handles many steps

- **And** step 0
- **And** step 1
- **And** step 2
- **And** step 3
- **And** step 4
- **And** step 5
- **And** step 6
- **And** step 7
- **And** step 8
- **And** step 9
- **And** step 10
- **And** step 11
- **And** step 12
- **And** step 13
- **And** step 14
- **And** step 15
- **And** step 16
- **And** step 17
- **And** step 18
- **And** step 19
- **And** step 20
- **And** step 21
- **And** step 22
- **And** step 23
- **And** step 24
- **And** step 25
- **And** step 26
- **And** step 27
- **And** step 28
- **And** step 29
- **And** step 30
- **And** step 31
- **And** step 32
- **And** step 33
- **And** step 34
- **And** step 35
- **And** step 36
- **And** step 37
- **And** step 38
- **And** step 39
- **And** step 40
- **And** step 41
- **And** step 42
- **And** step 43
- **And** step 44
- **And** step 45
- **And** step 46
- **And** step 47
- **And** step 48
- **And** step 49
- **And** step 50
- **And** step 51
- **And** step 52
- **And** step 53
- **And** step 54
- **And** step 55
- **And** step 56
- **And** step 57
- **And** step 58
- **And** step 59
- **And** step 60
- **And** step 61
- **And** step 62
- **And** step 63
- **And** step 64
- **And** step 65
- **And** step 66
- **And** step 67
- **And** step 68
- **And** step 69
- **And** step 70
- **And** step 71
- **And** step 72
- **And** step 73
- **And** step 74
- **And** step 75
- **And** step 76
- **And** step 77
- **And** step 78
- **And** step 79
- **And** step 80
- **And** step 81
- **And** step 82
- **And** step 83
- **And** step 84
- **And** step 85
- **And** step 86
- **And** step 87
- **And** step 88
- **And** step 89
- **And** step 90
- **And** step 91
- **And** step 92
- **And** step 93
- **And** step 94
- **And** step 95
- **And** step 96
- **And** step 97
- **And** step 98
- **And** step 99

### ✅ handles many tags
Tags: `tag0`, `tag1`, `tag10`, `tag11`, `tag12`, `tag13`, `tag14`, `tag15`, `tag16`, `tag17`, `tag18`, `tag19`, `tag2`, `tag20`, `tag21`, `tag22`, `tag23`, `tag24`, `tag25`, `tag26`, `tag27`, `tag28`, `tag29`, `tag3`, `tag30`, `tag31`, `tag32`, `tag33`, `tag34`, `tag35`, `tag36`, `tag37`, `tag38`, `tag39`, `tag4`, `tag40`, `tag41`, `tag42`, `tag43`, `tag44`, `tag45`, `tag46`, `tag47`, `tag48`, `tag49`, `tag5`, `tag6`, `tag7`, `tag8`, `tag9`


## src/__tests__/source-order.test.ts

### sourceOrder tracking

### ✅ first test gets sourceOrder 0 or higher


### ✅ second test gets a higher sourceOrder


### ✅ third test continues incrementing


### sourceOrder tracking - nested describe

### ✅ sourceOrder continues incrementing in nested describes


### ✅ and again


### sourceOrder relative ordering

### ✅ collect order A


### ✅ collect order B


### ✅ collect order C


## src/__tests__/story-api.test.ts

### story.init()

### ✅ creates StoryMeta from task.name


### ✅ accepts options with tags
Tags: `admin`, `security`


### ✅ accepts options with single ticket
Tickets: `JIRA-123`


### ✅ accepts options with multiple tickets
Tickets: `JIRA-123`, `JIRA-456`


### ✅ accepts options with meta


### story step markers

### ✅ adds Given step

- **Given** two numbers 5 and 3

### ✅ adds When step

- **When** I add them together

### ✅ adds Then step

- **Then** the result is 8

### ✅ adds And step

- **And** another condition

### ✅ adds But step

- **But** not this condition

### ✅ builds full Given/When/Then sequence

- **Given** two numbers 5 and 3
- **When** I add them together
- **Then** the result is 8

### story step aliases

### ✅ arrange is alias for Given

- **Given** setup state

### ✅ act is alias for When

- **When** perform action

### ✅ assert is alias for Then

- **Then** verify result

### ✅ setup/context are aliases for Given

- **Given** initial state
- **Given** additional context

### ✅ execute/action are aliases for When

- **When** run operation
- **When** perform action

### ✅ verify is alias for Then

- **Then** check outcome

### step with inline docs

### ✅ adds json inline doc

- **Given** valid credentials
    **Credentials**
    
    ```json
    {
      "email": "test@example.com",
      "password": "***"
    }
    ```
    

### ✅ adds note inline doc

- **Then** user is authenticated
    > Session cookie is set

### ✅ adds multiple inline docs

- **Given** order data
    > Order ID is auto-generated
    `order`
    **Order**
    
    ```json
    {
      "id": 123
    }
    ```
    

### ✅ adds table inline doc

- **Then** items are listed
    **Items**
    
    | Item | Qty |
    | --- | --- |
    | Widget | 1 |
    | Gadget | 2 |
    

### ✅ adds kv inline docs

- **When** payment processed
    - **Payment ID:** pay_123
    - **Amount:** $99.99

### ✅ adds link inline doc

- **Given** API endpoint
    [API Docs](https://docs.example.com)

### standalone doc methods

### ✅ story.note() after step attaches to step

- **Given** precondition
    > This is important

### ✅ story.note() before steps attaches to story-level

> This test requires a running database
- **Given** database is seeded

### ✅ story.link() before steps attaches to story-level

[API Docs](https://docs.example.com/api)
- **Given** API is available

### ✅ story.kv() attaches to current step

- **When** payment is processed
    - **Payment ID:** pay_abc123
    - **Amount:** $99.99

### ✅ story.json() attaches to current step

- **Given** an order exists
    **Order**
    
    ```json
    {
      "id": 123,
      "items": [
        "widget",
        "gadget"
      ]
    }
    ```
    

### ✅ story.table() attaches to current step

- **Then** order is confirmed
    **Order Summary**
    
    | Item | Qty | Price |
    | --- | --- | --- |
    | Widget | 1 | $49.99 |
    | Gadget | 1 | $50.00 |
    

### ✅ story.code() attaches to current step

- **Given** a config file
    **Config**
    
    ```yaml
    port: 3000
    host: localhost
    ```
    

### ✅ story.mermaid() attaches to current step

- **When** workflow executes
    **Workflow**
    ```mermaid
    graph LR
      A-->B-->C
    ```

### ✅ story.screenshot() attaches to current step

- **Then** page renders correctly
    ![Final result](/screenshots/result.png)

### ✅ story.tag() attaches to current step

- **Given** admin user
    `admin` `elevated`

### ✅ story.custom() attaches to current step

- **Given** custom data
    **[myType]**
    
    ```json
    {
      "foo": "bar"
    }
    ```
    

### ✅ story.section() attaches to current step

- **Given** complex setup
    **Details**
    
    This is **markdown** content
    

### describe and nested describe behavior

### ✅ captures single describe level

- **Given** a precondition
- **When** action occurs
- **Then** result is verified

### describe and nested describe behavior - Authentication

### ✅ user can login

- **Given** valid credentials
- **When** user submits login form
- **Then** user is redirected to dashboard

### ✅ user can logout

- **Given** user is logged in
- **When** user clicks logout
- **Then** user is redirected to login page

### describe and nested describe behavior - Authentication - Two-Factor Auth

### ✅ user enters valid 2FA code

- **Given** user has 2FA enabled
- **And** user has entered password
- **When** user enters valid 2FA code
- **Then** user is authenticated

### ✅ user enters invalid 2FA code

- **Given** user has 2FA enabled
- **And** user has entered password
- **When** user enters invalid 2FA code
- **Then** error message is shown
- **And** user can retry

### describe and nested describe behavior - Shopping Cart

### ✅ adds item to cart

- **Given** user is on product page
- **When** user clicks add to cart
- **Then** item appears in cart
- **And** cart count increases

### ✅ removes item from cart

- **Given** user has items in cart
- **When** user clicks remove
- **Then** item is removed from cart

### describe and nested describe behavior - Shopping Cart - Checkout

### ✅ completes purchase

- **Given** user has items in cart
- **And** user is on checkout page
- **When** user enters payment details
- **And** user clicks purchase
- **Then** order is confirmed
    > Order confirmation email is sent
- **And** cart is emptied

### beforeEach pattern - User Profile

### ✅ updates email

- **Given** user is logged in
- **When** user changes email
- **Then** email is updated

### ✅ updates password

- **Given** user is logged in
- **When** user changes password
- **Then** password is updated

### Gherkin patterns with story.init + story.*

### ✅ User logs in successfully

- **Given** the user account exists
- **And** the user is on the login page
- **And** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard

### ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
- **But** the session should not be created

### ✅ Bulk user creation

- **Given** the following users exist
    **Users**
    
    | email | role | status |
    | --- | --- | --- |
    | alice@example.com | admin | active |
    | bob@example.com | user | active |
    
- **When** the admin opens the user list
- **Then** the user list should include all users

### ✅ API accepts a JSON payload

- **Given** the client has the following JSON payload
    **Payload**
    
    ```json
    {
      "email": "user@example.com",
      "password": "secret"
    }
    ```
    
- **When** the client sends the request
- **Then** the response status should be 200

### ✅ System parses XML configuration

- **Given** the following XML configuration
    **Configuration**
    
    ```xml
    <config>
      <server>localhost</server>
      <port>8080</port>
    </config>
    ```
    
- **When** the system loads the configuration
- **Then** the settings should be applied

### ✅ User registration flow

- **Given** the registration form is displayed
    **Registration Flow**
    ```mermaid
    graph LR
      A[Form Displayed] --> B[User Fills Form]
      B --> C{Valid?}
      C -->|Yes| D[Create Account]
      C -->|No| E[Show Errors]
    ```
- **When** the user submits valid information
- **Then** the account should be created
- **And** a verification email should be sent

### ✅ Premium user gets early access
Tags: `feature-flag`, `premium` | Tickets: `JIRA-456`

- **Given** the user has a premium subscription
- **And** the early access feature is enabled
- **When** the user logs in
- **Then** the user should see early access features

### ✅ API endpoint documentation

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
    

### Parameterized scenarios

### ✅ Login error: Invalid credentials

- **Given** the user is on the login page
- **When** the user logs in with "user@example.com" and "wrong"
- **Then** the error message should be "Invalid credentials"

### ✅ Login error: Account is locked

- **Given** the user is on the login page
- **When** the user logs in with "locked@example.com" and "secret"
- **Then** the error message should be "Account is locked"

### ✅ Shipping for 1kg order

- **Given** an order weighing 1 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $5

### ✅ Shipping for 5kg order

- **Given** an order weighing 5 kg
- **When** the shipping cost is calculated
- **Then** the shipping cost should be $10

### Rule: Discounts apply only to eligible customers

### ✅ Eligible customer gets discount

- **Given** the customer is eligible for discounts
- **And** the customer has items worth $100
- **When** the customer checks out
- **Then** a 10% discount should be applied
- **And** the total should be $90

### ✅ Ineligible customer does not get discount

- **Given** the customer is not eligible for discounts
- **And** the customer has items worth $100
- **When** the customer checks out
- **Then** no discount should be applied
- **And** the total should be $100

### Background: User is authenticated

### ✅ Change email address

- **Given** the user account exists
- **And** the user is logged in
- **When** the user updates their email to 'new@example.com'
- **Then** a verification email should be sent

### ✅ Change password

- **Given** the user account exists
- **And** the user is logged in
- **When** the user updates their password
- **Then** the old sessions should be invalidated
- **And** a confirmation email should be sent

### real-world example scenarios

### ✅ Calculator: adds two numbers

- **Given** two numbers 5 and 3
- **When** I add them together
- **Then** the result is 8

### ✅ Authentication: user login with inline docs

- **Given** valid credentials
    **Credentials**
    
    ```json
    {
      "email": "test@example.com",
      "password": "***"
    }
    ```
    
- **When** user submits login form
- **Then** user is authenticated
    > Session cookie is set

### ✅ Order processing: with story-level docs
Tags: `e2e`, `orders` | Tickets: `SHOP-789`

> This test requires a running database
[API Docs](https://docs.example.com/api)
- **Given** an order exists
    **Order**
    
    ```json
    {
      "id": 123,
      "items": [
        "widget",
        "gadget"
      ]
    }
    ```
    
- **When** payment is processed
    - **Payment ID:** pay_abc123
    - **Amount:** $99.99
- **Then** order is confirmed
    **Order Summary**
    
    | Item | Qty | Price |
    | --- | --- | --- |
    | Widget | 1 | $49.99 |
    | Gadget | 1 | $50.00 |