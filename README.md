# OneFlow - Project Management System

OneFlow is a comprehensive, modular project management platform that seamlessly integrates project planning, task management, time tracking, and financial operations. Built to provide complete visibility into project revenue, costs, and profitability, OneFlow enables organizations to manage projects from planning through execution to billing in a unified system.

## Features

### Core Functionality
- **Project Management**: Create, manage, and track projects with team assignments, deadlines, and progress monitoring
- **Task Management**: Assign tasks, track status, add comments and attachments, log time
- **Time Tracking**: Log billable and non-billable hours with automatic cost calculations
- **Financial Operations**: Complete suite of financial document management including:
  - Sales Orders (SO)
  - Purchase Orders (PO)
  - Customer Invoices
  - Vendor Bills
  - Expenses with receipt uploads

### User Management
- **Role-Based Access Control**: Four distinct user roles (Project Manager, Team Member, Sales/Finance User, Admin)
- **Secure Authentication**: JWT-based authentication with password hashing
- **Profile Management**: User profile updates and password management

### Advanced Features
- **Links Panel**: Quick access to financial documents within project context
- **Global Document Search**: Cross-project search and filtering for financial documents
- **File Attachments**: Upload and manage task attachments and expense receipts
- **Approval Workflows**: Expense approval process for financial control

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **File Uploads**: Multer
- **CORS**: Enabled for cross-origin requests

### Dependencies
```json
{
  "express": "^5.1.0",
  "sequelize": "^6.37.7",
  "pg": "^8.16.3",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^6.0.0",
  "multer": "^2.0.2",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3"
}
```

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn** package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Parth8155/oneFlow_b.git
   cd oneFlow_b/Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=oneflow_db
   DB_USER=your_db_username
   DB_PASS=your_db_password

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

## Database Setup

1. **Create PostgreSQL Database**
   ```sql
   CREATE DATABASE oneflow_db;
   ```

2. **Run Migrations**
   ```bash
   npx sequelize-cli db:migrate
   ```

3. **Optional: Seed Database**
   If seeders are available:
   ```bash
   npx sequelize-cli db:seed:all
   ```

## Running the Application

1. **Start the server**
   ```bash
   npm start
   ```

2. **Server will start on port 3000** (or the port specified in your `.env` file)

3. **API Base URL**: `http://localhost:3000/api`

## API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Project Management
- `GET /api/projects` - List all projects (role-based filtering)
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/members` - Get project team members
- `POST /api/projects/:id/members` - Add team member
- `DELETE /api/projects/:id/members/:userId` - Remove team member

### Task Management
- `GET /api/tasks` - List tasks with filters
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/comments` - Add comment
- `POST /api/tasks/:id/attachments` - Upload attachment

### Time Tracking
- `GET /api/timesheets` - List timesheets
- `POST /api/timesheets` - Create timesheet entry
- `GET /api/timesheets/:id` - Get timesheet details
- `PUT /api/timesheets/:id` - Update timesheet
- `DELETE /api/timesheets/:id` - Delete timesheet

### Financial Operations
- `GET /api/sales-orders` - List sales orders
- `POST /api/sales-orders` - Create sales order
- `GET /api/purchase-orders` - List purchase orders
- `POST /api/purchase-orders` - Create purchase order
- `GET /api/customer-invoices` - List customer invoices
- `POST /api/customer-invoices` - Create customer invoice
- `GET /api/vendor-bills` - List vendor bills
- `POST /api/vendor-bills` - Create vendor bill
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense

## User Roles & Permissions

### 1. Project Manager
- Create, edit, and delete projects
- Assign team members to projects
- Approve expenses
- View all project financial data

### 2. Team Member
- View assigned tasks and projects
- Update task status
- Log timesheets
- Submit expenses with receipts
- View personal task assignments

### 3. Sales/Finance User
- Create and manage all financial documents (SO, PO, Invoices, Bills)
- Link financial documents to projects
- View global financial document lists

### 4. Admin
- All permissions from other roles
- Configure user hourly rates
- Full system access and configuration

## Project Structure

```
Backend/
├── app.js                 # Main application file
├── package.json           # Dependencies and scripts
├── config/
│   ├── database.js        # Database configuration
│   └── config.js          # General configuration
├── controllers/           # Route handlers
│   ├── authController.js
│   ├── projectController.js
│   ├── taskController.js
│   ├── timesheetController.js
│   ├── financialController.js
│   └── ...
├── models/               # Sequelize models
│   ├── index.js
│   ├── user.js
│   ├── project.js
│   ├── task.js
│   ├── timesheet.js
│   ├── salesOrder.js
│   ├── purchaseOrder.js
│   ├── customerInvoice.js
│   ├── vendorBill.js
│   └── expense.js
├── routes/               # API route definitions
│   ├── auth.js
│   ├── projects.js
│   ├── tasks.js
│   ├── timesheets.js
│   ├── salesOrderRoutes.js
│   ├── purchaseOrderRoutes.js
│   ├── customerInvoiceRoutes.js
│   ├── vendorBillRoutes.js
│   ├── expenseRoutes.js
│   └── financialRoutes.js
├── middleware/           # Custom middleware
│   ├── auth.js           # JWT authentication
│   ├── authorization.js  # Role-based access control
│   └── upload.js         # File upload handling
├── services/             # Business logic services
│   ├── authService.js
│   ├── financialService.js
├── migrations/           # Database migrations
├── seeders/              # Database seeders
├── uploads/              # File upload directory
│   ├── attachments/      # Task attachments
│   └── receipts/         # Expense receipts
└── project_info/         # Documentation
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## Financial Calculations

### Project Revenue
Sum of all Customer Invoice amounts linked to the project (excluding cancelled invoices)

### Project Cost
Sum of:
- Vendor Bill amounts
- Approved Expense amounts
- Timesheet costs (hours × user hourly rate)

### Project Profit
Revenue - Total Cost

### Budget Usage
(Total Cost / Sales Order Amount) × 100

## Development

### Available Scripts
- `npm start` - Start the production server
- `npm test` - Run tests (when implemented)

### Database Migrations
- Create new migration: `npx sequelize-cli migration:generate --name migration-name`
- Run migrations: `npx sequelize-cli db:migrate`
- Undo migration: `npx sequelize-cli db:migrate:undo`

### Testing
Backend testing framework: Jest + Supertest (planned)
Frontend testing framework: Jest + React Testing Library (planned)

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_PORT=5432
DB_NAME=oneflow_prod
DB_USER=prod_user
DB_PASS=prod_password
JWT_SECRET=your_production_jwt_secret
PORT=3000
```

### Production Considerations
- Use environment-specific database
- Enable HTTPS with SSL certificate
- Configure CORS for your domain
- Set up proper logging
- Use process manager like PM2
- Implement rate limiting
- Set up database backups

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code structure and naming conventions
- Add proper error handling and validation
- Write meaningful commit messages
- Update documentation as needed
- Test your changes thoroughly

## License

This project is licensed under the ISC License - see the package.json file for details.

## Support

For support, please contact the development team or create an issue in the repository.

## Roadmap

- [ ] Frontend implementation (React)
- [ ] Comprehensive test suite
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Advanced reporting features
- [ ] Mobile application
- [ ] Integration with external tools (Slack, Jira, etc.)

---

**OneFlow** - Streamlining project management with integrated financial operations.</content>
<parameter name="filePath">c:\Users\asus\OneDrive\Pictures\CE\Hackathon\oneFlow_\Backend\README.md