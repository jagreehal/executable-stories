/**
 * Comprehensive demonstration of complex data structures in documentation.
 *
 * Patterns covered:
 * - Nested JSON objects
 * - Large tables
 * - Multiple code formats (SQL, YAML, bash, etc.)
 * - Mermaid diagrams (various types)
 * - Complex metadata structures
 */
import { story, given, when, then, doc } from "jest-executable-stories";

// ============================================================================
// Nested JSON Objects
// ============================================================================

story("Deeply nested JSON structures", () => {
  doc.note("Demonstrating complex nested JSON in documentation");

  doc.json("Application Configuration", {
    app: {
      name: "MyApplication",
      version: "2.1.0",
      environment: "production",
    },
    server: {
      host: "api.example.com",
      port: 443,
      ssl: {
        enabled: true,
        certificate: "/path/to/cert.pem",
        key: "/path/to/key.pem",
        protocols: ["TLSv1.2", "TLSv1.3"],
      },
      timeouts: {
        connection: 30000,
        read: 60000,
        write: 60000,
      },
    },
    database: {
      primary: {
        host: "db-primary.example.com",
        port: 5432,
        name: "app_production",
        pool: {
          min: 5,
          max: 20,
          idle: 10000,
        },
      },
      replica: {
        hosts: ["db-replica-1.example.com", "db-replica-2.example.com"],
        loadBalancing: "round-robin",
      },
    },
    cache: {
      provider: "redis",
      cluster: {
        nodes: [
          { host: "redis-1.example.com", port: 6379 },
          { host: "redis-2.example.com", port: 6379 },
          { host: "redis-3.example.com", port: 6379 },
        ],
      },
      ttl: {
        default: 3600,
        session: 86400,
        static: 604800,
      },
    },
    features: {
      flags: {
        newUI: true,
        betaFeatures: false,
        experimentalAPI: {
          enabled: true,
          allowedUsers: ["admin", "beta-tester"],
        },
      },
    },
  });

  given("complex configuration is loaded", () => {});
  then("nested structures are documented", () => {
    expect(true).toBe(true);
  });
});

story("Arrays of complex objects", () => {
  doc.note("Documenting arrays with complex nested structures");

  doc.json("User Profiles", [
    {
      id: "user-001",
      profile: {
        name: "Alice Johnson",
        email: "alice@example.com",
        avatar: "https://example.com/avatars/alice.jpg",
      },
      permissions: {
        roles: ["admin", "editor"],
        resources: {
          documents: ["read", "write", "delete"],
          users: ["read", "write"],
          settings: ["read", "write", "admin"],
        },
      },
      preferences: {
        theme: "dark",
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        language: "en-US",
      },
    },
    {
      id: "user-002",
      profile: {
        name: "Bob Smith",
        email: "bob@example.com",
        avatar: "https://example.com/avatars/bob.jpg",
      },
      permissions: {
        roles: ["viewer"],
        resources: {
          documents: ["read"],
          users: ["read"],
          settings: [],
        },
      },
      preferences: {
        theme: "light",
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
        language: "en-GB",
      },
    },
  ]);

  given("user profiles are loaded", () => {});
  then("complex arrays are documented", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Large Tables
// ============================================================================

story("Large data tables", () => {
  doc.note("Tables with many rows and columns");

  doc.table(
    "API Endpoints Reference",
    ["Method", "Endpoint", "Auth", "Rate Limit", "Description"],
    [
      ["GET", "/api/v1/users", "Bearer", "100/min", "List all users"],
      ["GET", "/api/v1/users/:id", "Bearer", "200/min", "Get user by ID"],
      ["POST", "/api/v1/users", "Bearer", "50/min", "Create new user"],
      ["PUT", "/api/v1/users/:id", "Bearer", "50/min", "Update user"],
      ["DELETE", "/api/v1/users/:id", "Bearer", "20/min", "Delete user"],
      ["GET", "/api/v1/orders", "Bearer", "100/min", "List all orders"],
      ["GET", "/api/v1/orders/:id", "Bearer", "200/min", "Get order by ID"],
      ["POST", "/api/v1/orders", "Bearer", "30/min", "Create new order"],
      ["PUT", "/api/v1/orders/:id", "Bearer", "30/min", "Update order"],
      ["DELETE", "/api/v1/orders/:id", "Bearer", "10/min", "Cancel order"],
      ["GET", "/api/v1/products", "None", "500/min", "List products"],
      ["GET", "/api/v1/products/:id", "None", "1000/min", "Get product"],
      ["POST", "/api/v1/products", "Admin", "20/min", "Create product"],
      ["PUT", "/api/v1/products/:id", "Admin", "20/min", "Update product"],
      ["DELETE", "/api/v1/products/:id", "Admin", "5/min", "Delete product"],
    ]
  );

  doc.table(
    "HTTP Status Codes Reference",
    ["Code", "Status", "Category", "Common Use"],
    [
      ["200", "OK", "Success", "Successful GET/PUT"],
      ["201", "Created", "Success", "Successful POST"],
      ["204", "No Content", "Success", "Successful DELETE"],
      ["301", "Moved Permanently", "Redirect", "URL changed"],
      ["302", "Found", "Redirect", "Temporary redirect"],
      ["304", "Not Modified", "Redirect", "Cache valid"],
      ["400", "Bad Request", "Client Error", "Invalid input"],
      ["401", "Unauthorized", "Client Error", "Auth required"],
      ["403", "Forbidden", "Client Error", "Access denied"],
      ["404", "Not Found", "Client Error", "Resource missing"],
      ["409", "Conflict", "Client Error", "State conflict"],
      ["422", "Unprocessable", "Client Error", "Validation failed"],
      ["429", "Too Many Requests", "Client Error", "Rate limited"],
      ["500", "Internal Error", "Server Error", "Server failure"],
      ["502", "Bad Gateway", "Server Error", "Upstream error"],
      ["503", "Unavailable", "Server Error", "Maintenance"],
    ]
  );

  given("API documentation is needed", () => {});
  then("large tables provide comprehensive reference", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Multiple Code Formats
// ============================================================================

story("SQL code examples", () => {
  doc.note("SQL queries in documentation");

  doc.code(
    "Complex SELECT Query",
    `SELECT
    u.id,
    u.name,
    u.email,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent,
    MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
    AND u.created_at > '2024-01-01'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 100;`,
    "sql"
  );

  doc.code(
    "CREATE TABLE Statement",
    `CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total DECIMAL(10, 2) NOT NULL,
    items JSONB NOT NULL,
    shipping_address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT positive_total CHECK (total >= 0)
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);`,
    "sql"
  );

  given("SQL examples are documented", () => {});
  then("SQL syntax is highlighted", () => {
    expect(true).toBe(true);
  });
});

story("YAML configuration examples", () => {
  doc.note("YAML configuration files in documentation");

  doc.code(
    "Docker Compose Configuration",
    `version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://db:5432/app
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:`,
    "yaml"
  );

  doc.code(
    "Kubernetes Deployment",
    `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: myregistry/my-app:latest
          ports:
            - containerPort: 3000
          resources:
            limits:
              cpu: "500m"
              memory: "512Mi"
            requests:
              cpu: "250m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10`,
    "yaml"
  );

  given("YAML configs are documented", () => {});
  then("YAML syntax is highlighted", () => {
    expect(true).toBe(true);
  });
});

story("Shell script examples", () => {
  doc.note("Bash scripts and commands in documentation");

  doc.code(
    "Deployment Script",
    `#!/bin/bash
set -euo pipefail

# Configuration
APP_NAME="myapp"
DEPLOY_ENV="\${1:-staging}"
VERSION="\${2:-latest}"

echo "Deploying $APP_NAME version $VERSION to $DEPLOY_ENV"

# Build the application
echo "Building..."
npm ci
npm run build

# Run tests
echo "Running tests..."
npm test

# Build Docker image
echo "Building Docker image..."
docker build -t "$APP_NAME:$VERSION" .

# Push to registry
echo "Pushing to registry..."
docker push "registry.example.com/$APP_NAME:$VERSION"

# Deploy to Kubernetes
echo "Deploying to Kubernetes..."
kubectl set image deployment/$APP_NAME \\
    app="registry.example.com/$APP_NAME:$VERSION" \\
    --namespace=$DEPLOY_ENV

# Wait for rollout
echo "Waiting for rollout..."
kubectl rollout status deployment/$APP_NAME --namespace=$DEPLOY_ENV

echo "Deployment complete!"`,
    "bash"
  );

  given("shell scripts are documented", () => {});
  then("bash syntax is highlighted", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Mermaid Diagrams
// ============================================================================

story("Various Mermaid diagram types", () => {
  doc.note("Different types of Mermaid diagrams");

  doc.mermaid(
    `flowchart TD
    subgraph Client
        A[Browser] --> B[React App]
        B --> C[API Client]
    end

    subgraph Backend
        D[API Gateway] --> E[Auth Service]
        D --> F[User Service]
        D --> G[Order Service]
    end

    subgraph Data
        H[(PostgreSQL)]
        I[(Redis Cache)]
        J[(S3 Storage)]
    end

    C --> D
    E --> H
    F --> H
    F --> I
    G --> H
    G --> J`,
    "System Architecture"
  );

  doc.mermaid(
    `sequenceDiagram
    autonumber

    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database
    participant C as Cache

    U->>F: Click Login
    F->>A: POST /auth/login
    A->>D: Query user
    D-->>A: User data
    A->>A: Verify password
    A->>C: Store session
    A-->>F: JWT + Refresh token
    F->>F: Store tokens
    F-->>U: Show dashboard

    Note over U,C: Subsequent requests

    U->>F: Request data
    F->>A: GET /data (with JWT)
    A->>C: Check cache
    C-->>A: Cache miss
    A->>D: Query data
    D-->>A: Data
    A->>C: Update cache
    A-->>F: Response
    F-->>U: Display data`,
    "Authentication Flow"
  );

  doc.mermaid(
    `stateDiagram-v2
    [*] --> Pending

    Pending --> Processing: payment_received
    Pending --> Cancelled: user_cancelled

    Processing --> Shipped: items_packed
    Processing --> Cancelled: out_of_stock

    Shipped --> Delivered: delivery_confirmed
    Shipped --> Returned: return_requested

    Delivered --> [*]
    Returned --> Refunded: refund_processed
    Refunded --> [*]
    Cancelled --> [*]

    note right of Processing
        Inventory is reserved
    end note

    note right of Shipped
        Tracking number assigned
    end note`,
    "Order State Machine"
  );

  doc.mermaid(
    `erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        uuid id PK
        string name
        string email UK
        timestamp created_at
    }

    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        uuid id PK
        uuid customer_id FK
        string status
        decimal total
        timestamp created_at
    }

    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    PRODUCT {
        uuid id PK
        string name
        string description
        decimal price
        int stock
    }

    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }`,
    "Database Schema"
  );

  doc.mermaid(
    `pie title Test Coverage by Module
    "Auth Module" : 95
    "User Module" : 87
    "Order Module" : 78
    "Payment Module" : 92
    "Notification Module" : 65`,
    "Test Coverage Distribution"
  );

  doc.mermaid(
    `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD

    section Planning
    Requirements     :done, p1, 2024-01-01, 2024-01-15
    Design          :done, p2, 2024-01-16, 2024-01-31

    section Development
    Backend API     :active, d1, 2024-02-01, 2024-03-15
    Frontend        :d2, 2024-02-15, 2024-03-31
    Integration     :d3, 2024-03-15, 2024-04-15

    section Testing
    Unit Tests      :t1, 2024-02-15, 2024-04-01
    E2E Tests       :t2, 2024-03-15, 2024-04-30

    section Release
    Beta            :r1, 2024-04-15, 2024-04-30
    Production      :milestone, 2024-05-01, 0d`,
    "Development Schedule"
  );

  given("various diagram types are documented", () => {});
  then("all Mermaid diagram types render", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Complex Metadata with Story Options
// ============================================================================

story(
  "Story with complex metadata structure",
  {
    tags: ["comprehensive", "documentation", "complex-data"],
    ticket: ["DOCS-001", "TECH-456"],
    meta: {
      complexity: "high",
      estimatedReviewTime: "30min",
      dataFormats: ["json", "sql", "yaml", "bash", "mermaid"],
      coverage: {
        nestedJson: true,
        largeTables: true,
        codeBlocks: true,
        diagrams: true,
      },
      reviewers: ["tech-writer", "senior-dev"],
      lastUpdated: "2024-01-15",
    },
  },
  () => {
    doc.note("This story demonstrates complex metadata in story options");

    given("story has rich metadata", () => {});
    when("documentation is generated", () => {});
    then("metadata is preserved in output", () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Combined Complex Documentation
// ============================================================================

story("All complex data types in one story", () => {
  doc.note("Comprehensive example combining all complex data documentation");
  doc.tag("comprehensive", "all-in-one");

  // Key-value pairs
  doc.kv("Documentation Version", "2.0");
  doc.kv("Last Updated", new Date().toISOString());
  doc.kv("Completeness", "100%");

  // Link
  doc.link("Full Documentation", "https://docs.example.com");

  // Nested JSON
  doc.json("Sample API Response", {
    data: {
      users: [{ id: 1, name: "Test" }],
      pagination: { page: 1, total: 100 },
    },
    meta: { version: "1.0" },
  });

  // Table
  doc.table(
    "Quick Reference",
    ["Type", "Example", "Support"],
    [
      ["JSON", "Nested objects", "Full"],
      ["Tables", "Multi-column", "Full"],
      ["Code", "Multiple langs", "Full"],
      ["Diagrams", "Mermaid", "Full"],
    ]
  );

  // Code
  doc.code(
    "Quick Start",
    `import { story } from 'jest-executable-stories';

story('My Test', () => {
  doc.json('Data', { key: 'value' });
});`,
    "typescript"
  );

  // Mermaid
  doc.mermaid(
    `graph LR
    A[Input] --> B[Process]
    B --> C[Output]`,
    "Simple Flow"
  );

  // Section
  doc.section(
    "Additional Notes",
    `This story demonstrates:
- Nested JSON structures
- Large tables
- Multiple code formats
- Various Mermaid diagrams
- Complex metadata`
  );

  given("all documentation types are used", () => {});
  then("comprehensive documentation is generated", () => {
    expect(true).toBe(true);
  });
});
