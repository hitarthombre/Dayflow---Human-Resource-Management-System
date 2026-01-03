# Multi-Company HRMS (Human Resource Management System)

A comprehensive multi-tenant Human Resource Management System built with PHP and MySQL, designed for XAMPP. Multiple organizations can register on a single platform and independently manage their employees, attendance, leave, and payroll information.

## Features

- **Multi-Tenant Architecture**: Complete data isolation between companies
- **Role-Based Access Control**: Admin, HR, and Employee roles with granular permissions
- **Employee Management**: Full employee lifecycle management
- **Attendance Tracking**: Clock-in/out with automatic hours calculation
- **Leave Management**: Custom leave types, requests, and approval workflow
- **Payroll Processing**: Salary structures and monthly payroll records

## Technology Stack

- **Backend**: PHP 7.4+
- **Database**: MySQL 5.7+ / MariaDB 10.2+ (XAMPP)
- **Testing**: PHPUnit with Eris (Property-Based Testing)

## Quick Start

### Prerequisites

- XAMPP installed with Apache and MySQL
- PHP 7.4 or higher
- Composer (for dependency management)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multi-company-hrms
   ```

2. **Start XAMPP Services**
   - Open XAMPP Control Panel
   - Start Apache and MySQL

3. **Create Database and Tables**
   
   **Option A: Using phpMyAdmin**
   - Open http://localhost/phpmyadmin
   - Click "Import" tab
   - Select `database/schema.sql` and click "Go"
   - Select `hrms_db` database
   - Click "Import" tab again
   - Select `database/seed.sql` and click "Go"

   **Option B: Using MySQL Command Line**
   ```bash
   mysql -u root < database/schema.sql
   mysql -u root hrms_db < database/seed.sql
   ```

4. **Install PHP Dependencies**
   ```bash
   composer install
   ```

5. **Configure Environment**
   ```bash
   copy config\.env.example config\.env
   ```
   Edit `config/.env` with your database credentials if different from defaults.

## Project Structure

```
multi-company-hrms/
├── config/
│   ├── database.php      # Database configuration
│   └── .env.example      # Environment template
├── database/
│   ├── schema.sql        # Database schema (tables, constraints, indexes)
│   ├── seed.sql          # Sample data for testing
│   └── README.md         # Database documentation
├── src/                  # PHP source code (to be implemented)
├── tests/                # PHPUnit tests (to be implemented)
├── composer.json         # PHP dependencies
└── README.md             # This file
```

## Database Schema

### Entity-Relationship Overview

```
COMPANIES (Tenant Root)
    │
    ├── USERS ──────────────── ROLES ──── ROLE_PERMISSIONS ──── PERMISSIONS
    │     │
    │     └── EMPLOYEES
    │           │
    │           ├── ATTENDANCE
    │           │
    │           ├── LEAVE_REQUESTS ──── LEAVE_TYPES
    │           │
    │           ├── SALARY_STRUCTURES
    │           │
    │           └── PAYROLL_RECORDS
```

### Tables

| Table | Description | Multi-Tenant |
|-------|-------------|--------------|
| roles | System roles (Admin, HR, Employee) | No |
| permissions | Granular permissions | No |
| role_permissions | Role-permission mappings | No |
| companies | Tenant organizations | Root |
| users | User accounts | Yes |
| employees | Employee profiles | Yes |
| attendance | Daily attendance records | Yes |
| leave_types | Company leave categories | Yes |
| leave_requests | Leave applications | Yes |
| salary_structures | Compensation packages | Yes |
| payroll_records | Monthly payroll | Yes |

For detailed database documentation, see [database/README.md](database/README.md).

## Multi-Tenant Isolation

Every tenant-specific table includes a `company_id` column that:
- References the `companies` table
- Is indexed for query performance
- Cascades on delete (company deletion removes all related data)
- Must be included in all application queries

```sql
-- Example: Always filter by company_id
SELECT * FROM employees WHERE company_id = :company_id AND status = 'active';
```

## Default Roles & Permissions

### Admin
- Full access to all modules
- Company settings management
- User management

### HR
- Employee management (CRUD)
- Attendance management
- Leave approval
- Payroll viewing
- User management (limited)

### Employee
- View/update own profile
- View own attendance
- Submit leave requests
- View own salary/payroll

## Sample Data

The seed data generates comprehensive test data for 50 companies across 5 industries:

| Entity | Total Count | Per Company |
|--------|-------------|-------------|
| Companies | 50 | - |
| Users/Employees | ~2,700 | 50-60 |
| Leave Types | 500 | 10 |
| Attendance Records | ~54,000 | ~1,080 |
| Leave Requests | ~5,400 | ~108 |
| Payroll Records | ~8,100 | ~162 |

### Industries Covered
- Technology (10 companies)
- Healthcare (10 companies)
- Finance (10 companies)
- Retail (10 companies)
- Manufacturing (10 companies)

### Company Features
- Each company has a unique logo (via UI Avatars API)
- Industry-specific company profiles
- Subscription plans (free/basic/professional/enterprise)

**Test Password**: `password123` (for all users)

## Development

### Running Tests
```bash
composer test
```

### Database Reset
```bash
mysql -u root < database/schema.sql
mysql -u root hrms_db < database/seed.sql
```

## API Endpoints (Planned)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User authentication |
| GET | /api/employees | List employees |
| POST | /api/employees | Create employee |
| GET | /api/attendance | List attendance |
| POST | /api/attendance/clock | Clock in/out |
| GET | /api/leave/requests | List leave requests |
| POST | /api/leave/requests | Submit leave request |
| GET | /api/payroll | List payroll records |

## Security Features

- **Password Hashing**: Bcrypt with cost factor 10
- **Role-Based Access**: Granular permission system
- **Data Isolation**: Company-scoped queries
- **Input Validation**: Server-side validation
- **SQL Injection Prevention**: Prepared statements

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
