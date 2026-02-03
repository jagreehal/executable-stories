# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:41.259Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ Complete doc API demonstration

- **Given** all documentation methods are available
    **Test Configuration**
    
    ```json
    {
      "environment": "test",
      "features": [
        "all"
      ],
      "browser": "chromium"
    }
    ```
    
    _Note:_ Step-level runtime documentation
    **Browser Available:** true
- **When** documentation is generated
    **API Coverage**
    
    | Method | Supported | Playwright-specific |
    | --- | --- | --- |
    | note() | Yes | No |
    | tag() | Yes | No |
    | kv() | Yes | No |
    | code() | Yes | No |
    | json() | Yes | No |
    | table() | Yes | No |
    | link() | Yes | No |
    | section() | Yes | No |
    | mermaid() | Yes | No |
    | screenshot() | Yes | Yes - with page.screenshot() |
    | custom() | Yes | No |
    | runtime.* | Yes | No |
    
    **Documentation Flow**
    ```mermaid
    graph LR
        A[Doc API] --> B[Static Docs]
        A --> C[Runtime Docs]
        B --> D[Generated MD]
        C --> D
        E[Screenshots] --> D
    ```
    **Generated At:** 2026-02-03T22:33:47.519Z
- **Then** all methods produce rich documentation

## ✅ doc.code() demonstration

- **Given** code blocks with different languages
- **Then** code is syntax highlighted in docs

## ✅ doc.custom() demonstration

- **Given** custom content types are added
- **Then** custom renderers can process them

## ✅ doc.json() demonstration

- **Given** JSON objects are documented
- **Then** JSON is formatted and displayed

## ✅ doc.kv() demonstration

- **Given** key-value pairs are defined
    **Step-specific Key:** value after step
- **Then** all key-value pairs appear in documentation

## ✅ doc.link() demonstration

- **Given** links to external resources
- **Then** links are clickable in docs

## ✅ doc.mermaid() demonstration

- **Given** mermaid diagrams are defined
- **Then** diagrams render in documentation

## ✅ doc.note() demonstration

- **Given** a precondition with a note
    _Note:_ Notes can appear between steps
- **When** an action occurs
    _Note:_ Final note before assertion
- **Then** verification passes

## ✅ doc.runtime.* demonstration

- **Given** setup with runtime values
    **Timestamp:** 1770158027078
    _Note:_ Test started at 2026-02-03T22:33:47.078Z
    **Browser:** chromium
- **When** page produces runtime data
    **Page Title:** 
    **Page Info**
    
    ```json
    {
      "title": "",
      "url": "about:blank"
    }
    ```
    
- **Then** runtime values appear in docs
    **Final Check:** passed

## ✅ doc.screenshot() demonstration

- **Given** screenshot paths are recorded
- **Then** screenshots appear in documentation

## ✅ doc.section() demonstration

- **Given** sections with rich markdown
- **Then** sections appear as collapsible or titled blocks

## ✅ doc.table() demonstration

- **Given** tables are defined
- **Then** tables render as markdown

## ✅ doc.tag() demonstration

- **Given** tags are added
- **Then** story has multiple tags for filtering

## ✅ Runtime screenshot capture

- **Given** a page is loaded
- **When** screenshot is captured
    ![Captured during test](../screenshots/test-capture.png)
- **Then** screenshot is in the report
