# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:38.390Z |
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
      ]
    }
    ```
    
- **When** documentation is generated
    **API Coverage**
    
    | Method | Supported | Example |
    | --- | --- | --- |
    | note() | Yes | Free text notes |
    | tag() | Yes | Categorization |
    | kv() | Yes | Key-value pairs |
    | code() | Yes | Syntax highlighted code |
    | json() | Yes | JSON objects |
    | table() | Yes | Markdown tables |
    | link() | Yes | Hyperlinks |
    | section() | Yes | Markdown sections |
    | mermaid() | Yes | Diagrams |
    | screenshot() | Yes | Images |
    | custom() | Yes | Custom types |
    | runtime.* | Yes | Runtime values |
    
    **Documentation Flow**
    ```mermaid
    graph LR
        A[Doc API] --> B[Static Docs]
        A --> C[Runtime Docs]
        B --> D[Generated MD]
        C --> D
    ```
- **Then** all methods produce rich documentation

## ✅ doc via callback parameter

- **Given** setup via callback
    **Pattern:** callback
- **When** action via callback
    **Runtime via callback:** value
- **Then** assertion via callback

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
    **Timestamp:** 1770158019452
    _Note:_ Test started at 2026-02-03T22:33:39.452Z
- **When** action produces runtime data
    **Action Result**
    
    ```json
    {
      "success": true,
      "count": 42
    }
    ```
    
    **Generated Code**
    
    ```javascript
    const result = {"success":true,"count":42};
    ```
    
- **Then** runtime values appear in docs
    **Assertions:** 3
    **Duration (ms):** 15

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
