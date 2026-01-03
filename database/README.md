# HRMS Database Documentation

## Overview

This document provides complete documentation for the Multi-Company HRMS MySQL database schema. The database is designed for XAMPP MySQL/MariaDB and follows a multi-tenant architecture with company-level data isolation.

## Quick Start (XAMPP)

### Prerequisites
- XAMPP with MySQL/MariaDB running on port 3306
- phpMyAdmin or MySQL command line access

### Installation Steps

1. **Start XAMPP MySQL Service**
   - Open XAMPP Control Panel
   - Click "Start" next to MySQL

2. **Execute Schema Script**
   ```bash
   # Using MySQL command line
   mysql -u root < database/schema.sql
   
   # Or import via phpMyAdmin:
   # 1. Open http://localhost/phpmyadmin
   # 2. Click "Import" tab
   # 3. Select database/schema.sql
   # 4. Click "Go"
   ```

3. **Load Sample Data**
   ```bash
   # Using MySQL command line
   mysql -u root hrms_db < database/seed.sql
   
   # Or import via phpMyAdmin:
   # 1. Select hrms_db database
   # 2. Click "Import" tab
   # 3. Select database/seed.sql
   # 4. Click "Go"
   ```

### Execution Order
1. `schema.sql` - Creates database, tables, and default roles/permissions
2. `seed.sql` - Inserts sample data for testing

---

## Database Configuration

| Setting | Value |
|---------|-------|
| Database Name | `hrms_db` |
| Character Set | `utf8mb4` |
| Collation | `utf8mb4_unicode_ci` |
| Engine | `InnoDB` |
| Default User | `root` |
| Default Password | `` (empty) |

---

## Entity-Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│   ROLES     │       │ PERMISSIONS │       │ ROLE_PERMISSIONS│
├─────────────┤       ├─────────────┤       ├─────────────────┤
│ id (PK)     │◄──────│ id (PK)     │◄──────│ id (PK)         │
│ name        │       │ name        │       │ role_id (FK)    │
│ description │       │ module      │       │ permission_id   │
│ created_at  │       │ description │       │ (FK)            │
└─────────────┘       │ created_at  │       └─────────────────┘
                      └─────────────┘
                      
┌─────────────────────────────────────────────────────────────────┐
│                         COMPANIES                                │
├─────────────────────────────────────────────────────────────────┤
│ id (PK) │ name │ registration_number │ email │ phone │ address │
│ status │ created_at │ updated_at                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     USERS       │  │   EMPLOYEES     │  │  LEAVE_TYPES    │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │  │ id (PK)         │
│ company_id (FK) │  │ company_id (FK) │  │ company_id (FK) │
│ role_id (FK)    │  │ user_id (FK)    │  │ name            │
│ email           │  │ employee_code   │  │ annual_allocation│
│ password_hash   │  │ first_name      │  │ is_paid         │
│ status          │  │ last_name       │  │ is_active       │
│ last_login      │  │ email, phone    │  │ timestamps      │
│ timestamps      │  │ hire_date       │  └────────┬────────┘
└────────┬────────┘  │ department      │           │
         │           │ designation     │           │
         │           │ status          │           │
         │           │ timestamps      │           │
         │           └────────┬────────┘           │
         │                    │                    │
         │    ┌───────────────┼───────────────┐    │
         │    │               │               │    │
         │    ▼               ▼               ▼    ▼
         │ ┌──────────┐ ┌───────────────┐ ┌──────────────────┐
         │ │ATTENDANCE│ │SALARY_STRUCT. │ │ LEAVE_REQUESTS   │
         │ ├──────────┤ ├───────────────┤ ├──────────────────┤
         │ │id (PK)   │ │id (PK)        │ │id (PK)           │
         │ │company_id│ │company_id(FK) │ │company_id (FK)   │
         │ │employee_id││employee_id(FK)│ │employee_id (FK)  │
         │ │date      │ │basic_salary   │ │leave_type_id(FK) │
         │ │clock_in  │ │allowances     │ │start_date        │
         │ │clock_out │ │deductions     │ │end_date          │
         │ │total_hrs │ │effective_date │ │total_days        │
         │ │status    │ │is_current     │ │status            │
         │ │timestamps│ │timestamps     │ │approver_id (FK)──┘
         │ └──────────┘ └───────┬───────┘ │approval_date     │
         │                      │         │timestamps        │
         │                      ▼         └──────────────────┘
         │              ┌───────────────┐
         │              │PAYROLL_RECORDS│
         │              ├───────────────┤
         │              │id (PK)        │
         │              │company_id(FK) │
         │              │employee_id(FK)│
         │              │salary_struct_id│
         │              │year, month    │
         │              │gross_salary   │
         │              │deductions     │
         │              │net_salary     │
         │              │payment_status │
         │              │timestamps     │
         │              └───────────────┘
         │
         └──────────────────────────────────────────────────────┘
```

---

## Table Specifications

### 1. roles

Stores system-wide role definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Role name |
| description | VARCHAR(255) | NULL | Role description |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

**Default Data:**
- Admin (id=1)
- HR (id=2)
- Employee (id=3)

---

### 2. permissions

Stores granular permission definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Permission name (e.g., 'employee.create') |
| module | VARCHAR(50) | NOT NULL, INDEX | Module name |
| description | VARCHAR(255) | NULL | Permission description |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

**Modules:** employee, attendance, leave, payroll, company, user

---

### 3. role_permissions

Junction table for role-permission mapping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| role_id | INT | FK → roles.id, NOT NULL | Role reference |
| permission_id | INT | FK → permissions.id, NOT NULL | Permission reference |

**Constraints:**
- UNIQUE(role_id, permission_id)
- ON DELETE CASCADE for both foreign keys

---

### 4. companies

Tenant root table - stores organization information with logo support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Company name |
| registration_number | VARCHAR(100) | UNIQUE, NOT NULL | Business registration |
| email | VARCHAR(255) | NOT NULL | Contact email |
| phone | VARCHAR(20) | NULL | Contact phone |
| address | TEXT | NULL | Company address |
| city | VARCHAR(100) | NULL | City |
| state | VARCHAR(100) | NULL | State/Province |
| country | VARCHAR(100) | DEFAULT 'USA' | Country |
| postal_code | VARCHAR(20) | NULL | Postal/ZIP code |
| website | VARCHAR(255) | NULL | Company website |
| industry | VARCHAR(100) | NULL | Industry sector |
| company_size | ENUM | DEFAULT '51-200' | 1-10/11-50/51-200/201-500/501-1000/1000+ |
| logo_path | VARCHAR(255) | NULL | Local logo file path |
| logo_url | VARCHAR(500) | NULL | External logo URL |
| status | ENUM | DEFAULT 'active' | active/inactive/suspended |
| subscription_plan | ENUM | DEFAULT 'professional' | free/basic/professional/enterprise |
| subscription_expires | DATE | NULL | Subscription expiry date |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

---

### 5. users

Stores user authentication data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| company_id | INT | FK → companies.id, NOT NULL | Tenant isolation |
| role_id | INT | FK → roles.id, NOT NULL | User role |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hash |
| status | ENUM | DEFAULT 'active' | active/inactive/locked |
| last_login | TIMESTAMP | NULL | Last login time |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

**Cascade Rules:**
- company_id: ON DELETE CASCADE
- role_id: ON DELETE RESTRICT

---

### 6. employees

Stores employee profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| company_id | INT | FK → companies.id, NOT NULL | Tenant isolation |
| user_id | INT | FK → users.id, UNIQUE, NULL | Linked user account |
| employee_code | VARCHAR(50) | NOT NULL | Company-specific ID |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| email | VARCHAR(255) | NOT NULL | Work email |
| phone | VARCHAR(20) | NULL | Contact phone |
| date_of_birth | DATE | NULL | Birth date |
| gender | ENUM | NULL | male/female/other |
| address | TEXT | NULL | Home address |
| hire_date | DATE | NOT NULL | Start date |
| termination_date | DATE | NULL | End date |
| department | VARCHAR(100) | NULL | Department |
| designation | VARCHAR(100) | NULL | Job title |
| employment_type | ENUM | DEFAULT 'full_time' | full_time/part_time/contract/intern |
| status | ENUM | DEFAULT 'active' | active/inactive/terminated |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

**Unique Constraints:**
- user_id (one-to-one with users)
- (company_id, employee_code)

---

### 7. attendance

Tracks daily attendance records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| company_id | INT | FK → companies.id, NOT NULL | Tenant isolation |
| employee_id | INT | FK → employees.id, NOT NULL | Employee reference |
| attendance_date | DATE | NOT NULL | Date |
| clock_in_time | TIME | NULL | Clock-in time |
| clock_out_time | TIME | NULL | Clock-out time |
| total_hours | DECIMAL(4,2) | NULL | Hours worked |
| status | ENUM | DEFAULT 'present' | present/absent/half_day/late/on_leave |
| notes | TEXT | NULL | Additional notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

**Unique Constraint:** (employee_id, attendance_date)

---

### 8. leave_types

Company-specific leave type definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| company_id | INT | FK → companies.id, NOT NULL | Tenant isolation |
| name | VARCHAR(100) | NOT NULL | Leave type name |
| annual_allocation | INT | NOT NULL, DEFAULT 0 | Days per year |
| is_paid | TINYINT(1) | DEFAULT 1 | Paid leave flag |
| is_active | TINYINT(1) | DEFAULT 1 | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

**Unique Constraint:** (company_id, name)

---

### 9. leave_requests

Stores employee leave applications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| company_id | INT | FK → companies.id, NOT NULL | Tenant isolation |
| employee_id | INT | FK → employees.id, NOT NULL | Requesting employee |
| leave_type_id | INT | FK → leave_types.id, NOT NULL | Leave type |
| start_date | DATE | NOT NULL | Start date |
| end_date | DATE | NOT NULL | End date |
| total_days | INT | NOT NULL | Number of days |
| reason | TEXT | NULL | Leave reason |
| status | ENUM | DEFAULT 'pending' | pending/approved/rejected/cancelled |
| approver_id | INT | FK → users.id, NULL | Approving user |
| approval_date | TIMESTAMP | NULL | Approval time |
| rejection_reason | TEXT | NULL | Rejection reason |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

---

### 10. salary_structures

Employee compensation packages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| company_id | INT | FK → companies.id, NOT NULL | Tenant isolation |
| employee_id | INT | FK → employees.id, NOT NULL | Employee reference |
| basic_salary | DECIMAL(12,2) | NOT NULL | Base salary |
| housing_allowance | DECIMAL(12,2) | DEFAULT 0.00 | Housing allowance |
| transport_allowance | DECIMAL(12,2) | DEFAULT 0.00 | Transport allowance |
| other_allowances | DECIMAL(12,2) | DEFAULT 0.00 | Other allowances |
| tax_deduction | DECIMAL(12,2) | DEFAULT 0.00 | Tax deduction |
| insurance_deduction | DECIMAL(12,2) | DEFAULT 0.00 | Insurance |
| other_deductions | DECIMAL(12,2) | DEFAULT 0.00 | Other deductions |
| effective_date | DATE | NOT NULL | Effective date |
| is_current | TINYINT(1) | DEFAULT 1 | Current flag |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

---

### 11. payroll_records

Monthly payroll processing results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| company_id | INT | FK → companies.id, NOT NULL | Tenant isolation |
| employee_id | INT | FK → employees.id, NOT NULL | Employee reference |
| salary_structure_id | INT | FK → salary_structures.id, NOT NULL | Salary structure |
| year | INT | NOT NULL | Payroll year |
| month | INT | NOT NULL, CHECK(1-12) | Payroll month |
| gross_salary | DECIMAL(12,2) | NOT NULL | Total before deductions |
| total_deductions | DECIMAL(12,2) | NOT NULL | Sum of deductions |
| net_salary | DECIMAL(12,2) | NOT NULL | Take-home amount |
| payment_date | DATE | NULL | Payment date |
| payment_status | ENUM | DEFAULT 'pending' | pending/processed/paid/failed |
| payment_reference | VARCHAR(100) | NULL | Transaction reference |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

**Unique Constraint:** (employee_id, year, month)

---

## Multi-Tenant Isolation Strategy

### How It Works

1. **Company ID Scoping**: Every tenant-specific table includes a `company_id` column
2. **Foreign Key Enforcement**: All `company_id` columns reference `companies.id`
3. **Cascade Deletion**: When a company is deleted, all related data is automatically removed
4. **Application Layer**: All queries must filter by `company_id` from the user's session

### Tables with company_id
- users
- employees
- attendance
- leave_types
- leave_requests
- salary_structures
- payroll_records

### Example Query Pattern
```sql
-- Always include company_id in WHERE clause
SELECT * FROM employees 
WHERE company_id = :user_company_id 
AND status = 'active';
```

---

## Indexing Strategy

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| users | idx_users_company | company_id | Tenant filtering |
| users | uk_users_email | email | Login lookup |
| employees | idx_employees_company | company_id | Tenant filtering |
| employees | uk_employees_code | company_id, employee_code | Code uniqueness |
| attendance | idx_attendance_company | company_id | Tenant filtering |
| attendance | uk_attendance_employee_date | employee_id, attendance_date | Daily uniqueness |
| attendance | idx_attendance_date | attendance_date | Date range queries |
| leave_requests | idx_leave_requests_status | status | Status filtering |
| payroll_records | uk_payroll_employee_month | employee_id, year, month | Monthly uniqueness |

---

## Sample Data Summary

The seed data generates comprehensive test data:

| Entity | Total Count | Per Company |
|--------|-------------|-------------|
| Companies | 50 | - |
| Users | ~2,700 | 50-60 |
| Employees | ~2,700 | 50-60 |
| Leave Types | 500 | 10 |
| Attendance Records | ~54,000 | ~1,080 (30 days × employees) |
| Leave Requests | ~5,400 | ~108 |
| Salary Structures | ~2,700 | 50-60 |
| Payroll Records | ~8,100 | ~162 (3 months × employees) |

### Company Industries
- Technology (10 companies)
- Healthcare (10 companies)
- Finance (10 companies)
- Retail (10 companies)
- Manufacturing (10 companies)

### Test Credentials
All sample users have the password: `password123`

| Company | Email Pattern | Role |
|---------|---------------|------|
| Any Company | `[firstname].[lastname]1@company[N].com` | Admin |
| Any Company | `[firstname].[lastname]2@company[N].com` | HR |
| Any Company | `[firstname].[lastname][3-60]@company[N].com` | Employee |

### Sample Login Examples
| Company | Email | Role |
|---------|-------|------|
| TechCorp Solutions (1) | First employee email | Admin |
| GlobalFinance Corp (21) | First employee email | Admin |
| GlobalRetail Inc (31) | First employee email | Admin |

### Company Logos
Each company has a dynamically generated logo URL using UI Avatars API:
```
https://ui-avatars.com/api/?name=Company+Name&background=COLOR&color=fff&size=128
```

---

## Useful Queries

### Count Records by Company
```sql
SELECT c.name, 
       (SELECT COUNT(*) FROM users WHERE company_id = c.id) as users,
       (SELECT COUNT(*) FROM employees WHERE company_id = c.id) as employees
FROM companies c;
```

### Get Employee with Leave Balance
```sql
SELECT e.first_name, e.last_name, lt.name as leave_type,
       lt.annual_allocation,
       COALESCE(SUM(lr.total_days), 0) as used_days,
       lt.annual_allocation - COALESCE(SUM(lr.total_days), 0) as remaining
FROM employees e
CROSS JOIN leave_types lt
LEFT JOIN leave_requests lr ON lr.employee_id = e.id 
    AND lr.leave_type_id = lt.id 
    AND lr.status = 'approved'
    AND YEAR(lr.start_date) = YEAR(CURDATE())
WHERE e.company_id = 1 AND lt.company_id = 1
GROUP BY e.id, lt.id;
```

### Monthly Payroll Summary
```sql
SELECT c.name as company, 
       pr.year, pr.month,
       COUNT(*) as employees,
       SUM(pr.gross_salary) as total_gross,
       SUM(pr.net_salary) as total_net
FROM payroll_records pr
JOIN companies c ON c.id = pr.company_id
GROUP BY pr.company_id, pr.year, pr.month
ORDER BY pr.year DESC, pr.month DESC;
```
