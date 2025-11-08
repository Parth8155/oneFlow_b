# OneFlow Project Management System - Design Document

## Overview

OneFlow is a full-stack web application built with Node.js/Express backend and a modern frontend framework. The system follows a modular architecture with clear separation between project management, task execution, and financial operations modules. The design emphasizes real-time financial calculations, role-based access control, and seamless integration between planning, execution, and billing workflows.

### Technology Stack

**Backend:**
- Node.js with Express.js framework
- PostgreSQL database (recommended for complex relational data and ACID compliance)
- JWT for authentication
- Sequelize ORM for database operations

**Frontend:**
- React.js with React Router for navigation
- Redux or Context API for state management
- Axios for API communication
- Chart.js or Recharts for analytics visualization

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │   Projects   │  │  Analytics   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Tasks     │  │  Financial   │  │   Settings   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                    REST API (JSON)
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Authentication Middleware                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Project    │  │     Task     │  │  Financial   │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     User     │  │  Analytics   │  │  Timesheet   │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Users     │  │   Projects   │  │    Tasks     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Sales Orders │  │Purchase Order│  │   Invoices   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Vendor Bills  │  │   Expenses   │  │  Timesheets  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

The system is organized into distinct modules:

1. **Authentication Module**: User login, signup, JWT token management
2. **Project Module**: Project CRUD, team assignment, progress tracking
3. **Task Module**: Task management, status updates, hour logging
4. **Financial Module**: SO, PO, Customer Invoices, Vendor Bills, Expenses
5. **Timesheet Module**: Hour logging, cost calculation
6. **Analytics Module**: KPI calculation, chart data generation
7. **User Module**: Profile management, role assignment

## Components and Interfaces

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('project_manager', 'team_member', 'sales_finance', 'admin')),
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Projects Table
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold')),
    project_manager_id INTEGER REFERENCES users(id),
    deadline DATE,
    budget DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Project Members Table (Many-to-Many)
```sql
CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);
```

#### Tasks Table
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'blocked', 'done')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Task Comments Table
```sql
CREATE TABLE task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Task Attachments Table
```sql
CREATE TABLE task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Timesheets Table
```sql
CREATE TABLE timesheets (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    hours DECIMAL(5, 2) NOT NULL,
    date DATE NOT NULL,
    is_billable BOOLEAN DEFAULT false,
    description TEXT,
    cost DECIMAL(10, 2), -- Calculated: hours * user.hourly_rate
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Sales Orders Table
```sql
CREATE TABLE sales_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
    order_date DATE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Purchase Orders Table
```sql
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'received', 'cancelled')),
    order_date DATE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Customer Invoices Table
```sql
CREATE TABLE customer_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    invoice_date DATE NOT NULL,
    due_date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Vendor Bills Table
```sql
CREATE TABLE vendor_bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(100) UNIQUE NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'paid', 'cancelled')),
    bill_date DATE NOT NULL,
    due_date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Expenses Table
```sql
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    expense_number VARCHAR(100) UNIQUE NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    submitted_by INTEGER REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    is_billable BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'reimbursed')),
    receipt_path VARCHAR(500),
    expense_date DATE NOT NULL,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### Authentication Endpoints
```
POST   /api/auth/signup          - Register new user
POST   /api/auth/login           - Login and receive JWT token
GET    /api/auth/me              - Get current user profile
PUT    /api/auth/profile         - Update user profile
PUT    /api/auth/password        - Change password
```

#### Project Endpoints
```
GET    /api/projects             - List all projects (filtered by role)
POST   /api/projects             - Create new project
GET    /api/projects/:id         - Get project details
PUT    /api/projects/:id         - Update project
DELETE /api/projects/:id         - Delete project
GET    /api/projects/:id/members - Get project team members
POST   /api/projects/:id/members - Add team member to project
DELETE /api/projects/:id/members/:userId - Remove team member
GET    /api/projects/:id/financials - Get all financial docs for project
GET    /api/projects/:id/analytics  - Get project analytics (revenue, cost, profit)
```

#### Task Endpoints
```
GET    /api/tasks                - List tasks (with filters: my_tasks, project_id)
POST   /api/tasks                - Create new task
GET    /api/tasks/:id            - Get task details
PUT    /api/tasks/:id            - Update task
DELETE /api/tasks/:id            - Delete task
POST   /api/tasks/:id/comments   - Add comment to task
GET    /api/tasks/:id/comments   - Get task comments
POST   /api/tasks/:id/attachments - Upload attachment
GET    /api/tasks/:id/timesheets  - Get task timesheets
```

#### Timesheet Endpoints
```
GET    /api/timesheets           - List timesheets (filtered by user, project, date)
POST   /api/timesheets           - Create timesheet entry
GET    /api/timesheets/:id       - Get timesheet details
PUT    /api/timesheets/:id       - Update timesheet
DELETE /api/timesheets/:id       - Delete timesheet
```

#### Sales Order Endpoints
```
GET    /api/sales-orders         - List all sales orders (with search/filter)
POST   /api/sales-orders         - Create sales order
GET    /api/sales-orders/:id     - Get sales order details
PUT    /api/sales-orders/:id     - Update sales order
DELETE /api/sales-orders/:id     - Delete sales order
PUT    /api/sales-orders/:id/link-project - Link to project
```

#### Purchase Order Endpoints
```
GET    /api/purchase-orders      - List all purchase orders
POST   /api/purchase-orders      - Create purchase order
GET    /api/purchase-orders/:id  - Get purchase order details
PUT    /api/purchase-orders/:id  - Update purchase order
DELETE /api/purchase-orders/:id  - Delete purchase order
PUT    /api/purchase-orders/:id/link-project - Link to project
```

#### Customer Invoice Endpoints
```
GET    /api/customer-invoices    - List all customer invoices
POST   /api/customer-invoices    - Create customer invoice
GET    /api/customer-invoices/:id - Get invoice details
PUT    /api/customer-invoices/:id - Update invoice
DELETE /api/customer-invoices/:id - Delete invoice
PUT    /api/customer-invoices/:id/link-project - Link to project
```

#### Vendor Bill Endpoints
```
GET    /api/vendor-bills         - List all vendor bills
POST   /api/vendor-bills         - Create vendor bill
GET    /api/vendor-bills/:id     - Get vendor bill details
PUT    /api/vendor-bills/:id     - Update vendor bill
DELETE /api/vendor-bills/:id     - Delete vendor bill
PUT    /api/vendor-bills/:id/link-project - Link to project
```

#### Expense Endpoints
```
GET    /api/expenses             - List all expenses
POST   /api/expenses             - Create expense
GET    /api/expenses/:id         - Get expense details
PUT    /api/expenses/:id         - Update expense
DELETE /api/expenses/:id         - Delete expense
PUT    /api/expenses/:id/approve - Approve expense (Project Manager only)
PUT    /api/expenses/:id/reject  - Reject expense (Project Manager only)
PUT    /api/expenses/:id/link-project - Link to project
```

#### Analytics Endpoints
```
GET    /api/analytics/dashboard  - Get dashboard KPIs
GET    /api/analytics/projects   - Get project progress data
GET    /api/analytics/resources  - Get resource utilization data
GET    /api/analytics/financials - Get cost vs revenue comparison
```

### Frontend Component Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   └── ProtectedRoute.jsx
│   ├── dashboard/
│   │   ├── Dashboard.jsx
│   │   ├── ProjectCard.jsx
│   │   ├── KPIWidget.jsx
│   │   └── ProjectFilters.jsx
│   ├── projects/
│   │   ├── ProjectList.jsx
│   │   ├── ProjectForm.jsx
│   │   ├── ProjectDetail.jsx
│   │   ├── LinksPanel.jsx
│   │   └── ProjectSettings.jsx
│   ├── tasks/
│   │   ├── TaskList.jsx
│   │   ├── TaskBoard.jsx
│   │   ├── TaskForm.jsx
│   │   ├── TaskDetail.jsx
│   │   └── TimesheetForm.jsx
│   ├── financial/
│   │   ├── SalesOrderList.jsx
│   │   ├── SalesOrderForm.jsx
│   │   ├── PurchaseOrderList.jsx
│   │   ├── PurchaseOrderForm.jsx
│   │   ├── CustomerInvoiceList.jsx
│   │   ├── CustomerInvoiceForm.jsx
│   │   ├── VendorBillList.jsx
│   │   ├── VendorBillForm.jsx
│   │   ├── ExpenseList.jsx
│   │   └── ExpenseForm.jsx
│   ├── analytics/
│   │   ├── AnalyticsDashboard.jsx
│   │   ├── ProjectProgressChart.jsx
│   │   ├── ResourceUtilizationChart.jsx
│   │   └── CostRevenueChart.jsx
│   ├── profile/
│   │   ├── Profile.jsx
│   │   └── ChangePassword.jsx
│   └── common/
│       ├── Sidebar.jsx
│       ├── Header.jsx
│       ├── SearchBar.jsx
│       └── DataTable.jsx
├── services/
│   ├── authService.js
│   ├── projectService.js
│   ├── taskService.js
│   ├── financialService.js
│   └── analyticsService.js
├── context/
│   └── AuthContext.jsx
├── utils/
│   ├── api.js
│   └── helpers.js
└── App.jsx
```

## Data Models

### Financial Calculation Logic

#### Project Revenue Calculation
```javascript
// Sum of all Customer Invoices linked to the project
revenue = SUM(customer_invoices.amount WHERE project_id = X AND status != 'cancelled')
```

#### Project Cost Calculation
```javascript
// Sum of Vendor Bills + Expenses + Timesheet Costs
vendorBillsCost = SUM(vendor_bills.amount WHERE project_id = X AND status != 'cancelled')
expensesCost = SUM(expenses.amount WHERE project_id = X AND status = 'approved')
timesheetCost = SUM(timesheets.cost WHERE project_id = X)

totalCost = vendorBillsCost + expensesCost + timesheetCost
```

#### Project Profit Calculation
```javascript
profit = revenue - totalCost
```

#### Budget Usage Calculation
```javascript
// Budget comes from linked Sales Order
budget = sales_orders.amount WHERE project_id = X
budgetUsage = (totalCost / budget) * 100
```

#### Timesheet Cost Calculation
```javascript
// Calculated when timesheet is created/updated
timesheet.cost = timesheet.hours * user.hourly_rate
```

### State Management

The frontend will use Context API or Redux to manage:

1. **AuthContext**: Current user, role, authentication status
2. **ProjectContext**: Active project, project list
3. **FilterContext**: Dashboard filters, search queries
4. **NotificationContext**: Success/error messages

## Error Handling

### Backend Error Handling

```javascript
// Centralized error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.details
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }
    
    if (err.name === 'ForbiddenError') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions'
        });
    }
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
    });
});
```

### Frontend Error Handling

- Display user-friendly error messages using toast notifications
- Handle network errors with retry mechanisms
- Validate form inputs before submission
- Show loading states during API calls
- Handle 401 errors by redirecting to login

### Validation Rules

1. **User Registration**: Email format, password strength (min 8 chars), unique username
2. **Project Creation**: Required name, valid deadline date, valid budget amount
3. **Task Creation**: Required title, valid due date, assigned user must be project member
4. **Timesheet Entry**: Hours must be positive, date cannot be future
5. **Financial Documents**: Amount must be positive, valid date, required customer/vendor name
6. **Expense Approval**: Only Project Manager can approve, expense must be in 'submitted' status

## Testing Strategy

### Unit Testing

**Backend (Jest + Supertest):**
- Test individual service functions (e.g., calculateProjectCost, calculateProfit)
- Test database models and validations
- Test utility functions (e.g., JWT generation, password hashing)
- Mock database calls using jest.mock()

**Frontend (Jest + React Testing Library):**
- Test component rendering with different props
- Test user interactions (button clicks, form submissions)
- Test conditional rendering based on user role
- Mock API calls using MSW (Mock Service Worker)

### Integration Testing

- Test complete API endpoints with real database (test database)
- Test authentication flow (signup → login → protected routes)
- Test project creation → task assignment → timesheet logging flow
- Test financial document creation → project cost calculation flow
- Test role-based access control across different endpoints

### End-to-End Testing (Optional - Cypress/Playwright)

- Test complete user workflows:
  - Project Manager creates project → assigns team → creates tasks
  - Team Member logs in → views tasks → logs hours
  - Sales/Finance creates SO → links to project → creates invoice
- Test dashboard KPI calculations
- Test analytics chart rendering

### Test Coverage Goals

- Backend: Minimum 70% code coverage
- Frontend: Minimum 60% code coverage
- Critical paths (authentication, financial calculations): 90%+ coverage

## Security Considerations

1. **Authentication**: JWT tokens with expiration, secure password hashing (bcrypt)
2. **Authorization**: Middleware to verify user roles before allowing actions
3. **Input Validation**: Sanitize all user inputs to prevent SQL injection
4. **File Uploads**: Validate file types and sizes for attachments/receipts
5. **CORS**: Configure allowed origins for API access
6. **Environment Variables**: Store sensitive data (DB credentials, JWT secret) in .env
7. **Rate Limiting**: Implement rate limiting on authentication endpoints

## Performance Considerations

1. **Database Indexing**: Add indexes on frequently queried columns (project_id, user_id, status)
2. **Pagination**: Implement pagination for large lists (tasks, financial documents)
3. **Caching**: Cache dashboard KPIs and analytics data (Redis optional)
4. **Lazy Loading**: Load project details and financial data on demand
5. **Query Optimization**: Use JOIN queries to reduce database round trips
6. **File Storage**: Store attachments/receipts on disk or cloud storage (S3), not in database

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Optional)                  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────────────────┐                  ┌───────────────────┐
│   Web Server 1    │                  │   Web Server 2    │
│  (Node.js/Express)│                  │  (Node.js/Express)│
└───────────────────┘                  └───────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                ┌───────────────────────┐
                │  PostgreSQL Database  │
                └───────────────────────┘
                            │
                ┌───────────────────────┐
                │   File Storage        │
                │  (Local/S3/Cloud)     │
                └───────────────────────┘
```

### Environment Setup

**Development:**
- Local PostgreSQL instance
- Node.js development server with hot reload
- React development server (port 3000)
- Express API server (port 5000)

**Production:**
- PostgreSQL on managed service (AWS RDS, Heroku Postgres)
- Node.js server with PM2 process manager
- React build served via Express static files or CDN
- HTTPS with SSL certificate
- Environment-specific configuration

## Design Decisions and Rationales

1. **PostgreSQL over MySQL**: Better support for complex queries, JSON data types, and ACID compliance for financial data
2. **JWT Authentication**: Stateless authentication suitable for REST APIs, scalable
3. **Separate Financial Tables**: Each document type (SO, PO, Invoice, Bill, Expense) has its own table for flexibility and clear data modeling
4. **Calculated Fields**: Timesheet cost and project financials calculated on-the-fly to ensure accuracy
5. **Soft Deletes (Optional)**: Consider adding deleted_at column for audit trail
6. **Role-Based Access**: Four distinct roles provide clear separation of responsibilities
7. **Links Panel Design**: Quick access to financial documents within project context improves UX
8. **Global Lists in Settings**: Allows cross-project visibility for finance team
9. **Approval Workflow**: Expenses require approval to maintain financial control
10. **Real-time Calculations**: Financial metrics calculated on each request to ensure accuracy (can be optimized with caching later)
