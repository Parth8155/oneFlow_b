# Requirements Document

## Introduction

OneFlow is a modular Project Management system that enables Project Managers to manage projects from planning through execution to billing in a unified platform. The system integrates project planning, task management, time tracking, and financial operations (Sales Orders, Purchase Orders, Customer Invoices, Vendor Bills, and Expenses) to provide complete visibility into project revenue, costs, and profitability.

## Glossary

- **OneFlow System**: The complete project management platform described in this document
- **Project Manager**: A user role responsible for creating projects, assigning resources, and managing financial aspects
- **Team Member**: A user role that executes tasks, logs hours, and submits expenses
- **Sales/Finance User**: A user role that manages financial documents within projects
- **Admin**: A user role with full system access and configuration capabilities
- **Sales Order (SO)**: A document defining what the customer purchases, including scope, price, and deliverables
- **Purchase Order (PO)**: A document recording vendor purchases required to complete a project
- **Customer Invoice**: A billing document sent to customers for completed work or milestones
- **Vendor Bill**: A document recording amounts payable to vendors for goods or services
- **Timesheet**: A log of hours worked by team members on specific tasks
- **Expense**: A reimbursement or cost item submitted by team members and linked to projects
- **Links Panel**: A top bar interface within a project showing quick access to linked financial documents
- **Project Settings**: The interface within a project for creating or linking financial documents

## Requirements

### Requirement 1: User Authentication and Role-Based Access

**User Story:** As a user, I want to log in with my credentials and access a role-appropriate dashboard, so that I can perform my designated responsibilities efficiently.

#### Acceptance Criteria

1. THE OneFlow System SHALL provide a common login page accepting username and password credentials
2. WHEN a user successfully authenticates, THE OneFlow System SHALL redirect the user to a dashboard appropriate for their assigned role
3. THE OneFlow System SHALL support four distinct user roles: Project Manager, Team Member, Sales/Finance User, and Admin
4. THE OneFlow System SHALL provide a signup page for new user registration
5. WHEN an unauthenticated user attempts to access protected resources, THE OneFlow System SHALL redirect the user to the login page

### Requirement 2: Dashboard and Project Overview

**User Story:** As a Project Manager, I want to view all ongoing projects with filtering and KPI widgets, so that I can quickly assess project status and organizational health.

#### Acceptance Criteria

1. THE OneFlow System SHALL display all projects as cards on the landing dashboard
2. THE OneFlow System SHALL provide filters for project states: Planned, In Progress, Completed, and On Hold
3. THE OneFlow System SHALL display KPI widgets showing Active Projects count, Delayed Tasks count, Hours Logged total, and Revenue Earned total
4. WHEN a user applies a filter, THE OneFlow System SHALL update the project card display to show only projects matching the selected state
5. THE OneFlow System SHALL calculate and display KPI values in real-time based on current project data

### Requirement 3: Project Creation and Management

**User Story:** As a Project Manager, I want to create and manage projects with assigned team members and deadlines, so that I can organize work and track progress.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow Project Managers to create new projects with name, description, deadline, and assigned Project Manager
2. THE OneFlow System SHALL allow Project Managers to assign Team Members to projects
3. THE OneFlow System SHALL display a progress bar on each project showing completion percentage
4. THE OneFlow System SHALL display budget usage on each project
5. THE OneFlow System SHALL allow Project Managers to edit project details including team assignments and deadlines
6. THE OneFlow System SHALL allow Project Managers to delete projects
7. THE OneFlow System SHALL provide a Links Panel within each project showing Sales Orders, Purchase Orders, Customer Invoices, Vendor Bills, and Expenses linked to that project

### Requirement 4: Task Management and Execution

**User Story:** As a Team Member, I want to view my assigned tasks, update their status, and log hours, so that I can track my work and communicate progress.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow users to create task lists under projects
2. THE OneFlow System SHALL allow task assignment to specific users with due dates and priority levels
3. THE OneFlow System SHALL support task states: New, In Progress, Blocked, and Done
4. THE OneFlow System SHALL allow Team Members to log hours against tasks
5. THE OneFlow System SHALL allow users to add comments and attachments to tasks
6. THE OneFlow System SHALL provide a toggle to view "My Tasks" or "All Tasks"
7. WHEN a Team Member views "My Tasks", THE OneFlow System SHALL display only tasks assigned to that user
8. THE OneFlow System SHALL allow Team Members to update task status

### Requirement 5: Sales Order Management

**User Story:** As a Sales/Finance User, I want to create Sales Orders and link them to projects, so that I can define what customers are purchasing and track project revenue.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow Sales/Finance Users to create Sales Orders with customer name, amount, description, and line items
2. THE OneFlow System SHALL allow Sales Orders to be linked to specific projects
3. THE OneFlow System SHALL display linked Sales Orders in the Project Settings interface
4. THE OneFlow System SHALL display linked Sales Orders in the Links Panel within a project
5. THE OneFlow System SHALL provide a global Sales Orders list in the Settings menu with search, filter, and group-by capabilities
6. WHEN viewing the global Sales Orders list, THE OneFlow System SHALL allow filtering by date, partner, state, and project
7. THE OneFlow System SHALL allow Sales Orders to be created from within a project via Project Settings

### Requirement 6: Purchase Order Management

**User Story:** As a Project Manager, I want to create Purchase Orders for vendor services needed for my project, so that I can track project costs accurately.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow authorized users to create Purchase Orders with vendor name, amount, description, and line items
2. THE OneFlow System SHALL allow Purchase Orders to be linked to specific projects
3. THE OneFlow System SHALL display linked Purchase Orders in the Project Settings interface
4. THE OneFlow System SHALL display linked Purchase Orders in the Links Panel within a project
5. THE OneFlow System SHALL provide a global Purchase Orders list in the Settings menu with search, filter, and group-by capabilities
6. WHEN viewing the global Purchase Orders list, THE OneFlow System SHALL allow filtering by date, partner, state, and project
7. THE OneFlow System SHALL contribute Purchase Order amounts to project cost calculations

### Requirement 7: Customer Invoice Generation

**User Story:** As a Project Manager, I want to generate Customer Invoices for completed milestones, so that I can bill customers and track revenue.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow authorized users to create Customer Invoices with customer name, amount, line items, and due date
2. THE OneFlow System SHALL allow Customer Invoices to be linked to specific projects
3. THE OneFlow System SHALL allow Customer Invoices to reference Sales Orders
4. THE OneFlow System SHALL display linked Customer Invoices in the Project Settings interface
5. THE OneFlow System SHALL display linked Customer Invoices in the Links Panel within a project
6. THE OneFlow System SHALL provide a global Customer Invoices list in the Settings menu with search, filter, and group-by capabilities
7. THE OneFlow System SHALL contribute Customer Invoice amounts to project revenue calculations

### Requirement 8: Vendor Bill Recording

**User Story:** As a Sales/Finance User, I want to record Vendor Bills against Purchase Orders, so that I can track amounts payable and project costs.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow authorized users to create Vendor Bills with vendor name, amount, line items, and due date
2. THE OneFlow System SHALL allow Vendor Bills to be linked to specific projects
3. THE OneFlow System SHALL allow Vendor Bills to reference Purchase Orders
4. THE OneFlow System SHALL display linked Vendor Bills in the Project Settings interface
5. THE OneFlow System SHALL display linked Vendor Bills in the Links Panel within a project
6. THE OneFlow System SHALL provide a global Vendor Bills list in the Settings menu with search, filter, and group-by capabilities
7. THE OneFlow System SHALL contribute Vendor Bill amounts to project cost calculations

### Requirement 9: Expense Management

**User Story:** As a Team Member, I want to submit expenses with receipts for project-related costs, so that I can be reimbursed and project costs remain accurate.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow Team Members to create Expenses with amount, description, receipt attachment, and billable flag
2. THE OneFlow System SHALL allow Expenses to be linked to specific projects
3. THE OneFlow System SHALL require Project Manager approval for submitted Expenses
4. THE OneFlow System SHALL display linked Expenses in the Project Settings interface
5. THE OneFlow System SHALL display linked Expenses in the Links Panel within a project
6. THE OneFlow System SHALL provide a global Expenses list in the Settings menu with search, filter, and group-by capabilities
7. THE OneFlow System SHALL contribute Expense amounts to project cost calculations
8. WHEN an Expense is marked as billable, THE OneFlow System SHALL allow it to be included in Customer Invoices

### Requirement 10: Timesheet Tracking

**User Story:** As a Team Member, I want to log my working hours on tasks with billable/non-billable designation, so that my time is tracked for cost and billing purposes.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow Team Members to create Timesheets linked to specific tasks
2. THE OneFlow System SHALL require Timesheets to specify hours worked, date, and billable/non-billable status
3. THE OneFlow System SHALL associate each Team Member with an hourly rate configured by Admin
4. THE OneFlow System SHALL calculate Timesheet cost by multiplying hours by the Team Member's hourly rate
5. THE OneFlow System SHALL contribute Timesheet costs to project cost calculations
6. THE OneFlow System SHALL display Timesheets within the task detail view
7. THE OneFlow System SHALL treat each Timesheet as an expense representing negative cash flow

### Requirement 11: Financial Analytics and Profitability

**User Story:** As a Project Manager, I want to view project revenue, costs, and profit in real-time, so that I can make informed decisions about project health.

#### Acceptance Criteria

1. THE OneFlow System SHALL calculate project revenue as the sum of all linked Customer Invoice amounts
2. THE OneFlow System SHALL calculate project cost as the sum of Vendor Bills, Expenses, and Timesheet costs
3. THE OneFlow System SHALL calculate project profit as revenue minus cost
4. THE OneFlow System SHALL display revenue, cost, and profit on the project overview
5. THE OneFlow System SHALL update financial calculations in real-time when financial documents are created or modified
6. THE OneFlow System SHALL display budget usage percentage on projects
7. WHEN a Sales Order is linked to a project, THE OneFlow System SHALL use the Sales Order amount as the project budget

### Requirement 12: Analytics Dashboard

**User Story:** As a Project Manager, I want to view analytics showing project progress, resource utilization, and profitability, so that I can identify trends and optimize operations.

#### Acceptance Criteria

1. THE OneFlow System SHALL provide an Analytics Dashboard accessible from the main navigation
2. THE OneFlow System SHALL display KPI cards showing Total Projects, Tasks Completed, Hours Logged, and Billable vs Non-billable Hours
3. THE OneFlow System SHALL display a chart showing Project Progress percentage for all active projects
4. THE OneFlow System SHALL display a chart showing Resource Utilization by team member
5. THE OneFlow System SHALL display a chart comparing Project Cost vs Revenue
6. THE OneFlow System SHALL calculate analytics metrics based on current system data

### Requirement 13: Navigation and User Interface

**User Story:** As a user, I want intuitive navigation between Projects, Tasks, and Analytics sections, so that I can efficiently access the information I need.

#### Acceptance Criteria

1. THE OneFlow System SHALL provide a left sidebar with navigation links to Projects, Tasks, Analytics, and Profile sections
2. THE OneFlow System SHALL provide a Settings menu with links to global lists: Sales Orders, Purchase Orders, Customer Invoices, Vendor Bills, and Expenses
3. WHEN a user clicks a navigation link, THE OneFlow System SHALL display the corresponding section
4. THE OneFlow System SHALL highlight the active navigation item in the sidebar
5. THE OneFlow System SHALL maintain consistent navigation structure across all pages

### Requirement 14: User Profile Management

**User Story:** As a user, I want to update my personal information and password, so that I can maintain accurate account details and security.

#### Acceptance Criteria

1. THE OneFlow System SHALL provide a My Profile section accessible from the left sidebar
2. THE OneFlow System SHALL allow users to update their name, email, and contact information
3. THE OneFlow System SHALL allow users to change their password
4. WHEN a user changes their password, THE OneFlow System SHALL require the current password for verification
5. THE OneFlow System SHALL validate that new passwords meet minimum security requirements

### Requirement 15: Global Document Lists and Search

**User Story:** As a Sales/Finance User, I want to search and filter all financial documents globally, so that I can find specific documents across all projects.

#### Acceptance Criteria

1. THE OneFlow System SHALL provide global lists for Sales Orders, Purchase Orders, Customer Invoices, Vendor Bills, and Expenses in the Settings menu
2. THE OneFlow System SHALL allow users to search documents by number, partner name, amount, and state
3. THE OneFlow System SHALL allow users to filter documents by date range, partner, state, and project
4. THE OneFlow System SHALL allow users to group documents by project, partner, or state
5. WHEN a user opens a document from a global list, THE OneFlow System SHALL display the document form with the ability to link it to a project
6. THE OneFlow System SHALL display all documents in global lists regardless of project association

### Requirement 16: Role-Based Permissions

**User Story:** As an Admin, I want to control what actions each role can perform, so that I can maintain system security and data integrity.

#### Acceptance Criteria

1. THE OneFlow System SHALL allow Project Managers to create, edit, and delete projects
2. THE OneFlow System SHALL allow Project Managers to assign team members and approve expenses
3. THE OneFlow System SHALL allow Team Members to view assigned tasks, update task status, log hours, and submit expenses
4. THE OneFlow System SHALL allow Sales/Finance Users to create and link Sales Orders, Purchase Orders, Customer Invoices, Vendor Bills, and Expenses
5. THE OneFlow System SHALL allow Admins to perform all actions available to other roles
6. THE OneFlow System SHALL allow Admins to configure user hourly rates
7. WHEN a user attempts an unauthorized action, THE OneFlow System SHALL deny the action and display an appropriate error message
