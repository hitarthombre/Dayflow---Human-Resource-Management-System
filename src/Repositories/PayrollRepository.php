<?php
/**
 * Payroll Repository
 * 
 * Handles database operations for payroll records and salary structures.
 */

namespace HRMS\Repositories;

use HRMS\Core\Database;

class PayrollRepository extends BaseRepository
{
    protected string $table = 'payroll_records';
    protected bool $tenantScoped = true;
    
    /**
     * Get salary structure for employee
     */
    public function getSalaryStructure(int $employeeId, int $companyId): ?array
    {
        return Database::fetchOne(
            'SELECT * FROM salary_structures WHERE employee_id = ? AND company_id = ?',
            [$employeeId, $companyId]
        );
    }
    
    /**
     * Get paginated payroll records with filters
     */
    public function getPaginated(int $companyId, array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $where = ['pr.company_id = ?'];
        $params = [$companyId];
        
        if (!empty($filters['employee_id'])) {
            $where[] = 'pr.employee_id = ?';
            $params[] = $filters['employee_id'];
        }
        
        if (!empty($filters['month'])) {
            $where[] = 'pr.pay_period_start LIKE ?';
            $params[] = $filters['month'] . '%';
        }
        
        if (!empty($filters['status'])) {
            $where[] = 'pr.status = ?';
            $params[] = $filters['status'];
        }
        
        $whereClause = implode(' AND ', $where);
        
        // Get total count
        $countSql = "SELECT COUNT(*) as count FROM payroll_records pr WHERE {$whereClause}";
        $total = (int) Database::fetchOne($countSql, $params)['count'];
        
        // Get paginated data
        $offset = ($page - 1) * $perPage;
        $sql = "SELECT pr.*, e.first_name, e.last_name, e.employee_code
                FROM payroll_records pr
                JOIN employees e ON pr.employee_id = e.id
                WHERE {$whereClause}
                ORDER BY pr.pay_period_start DESC, e.last_name ASC
                LIMIT {$perPage} OFFSET {$offset}";
        
        $data = Database::fetchAll($sql, $params);
        
        return [
            'data' => $data,
            'total' => $total
        ];
    }
    
    /**
     * Get employee's payroll records
     */
    public function getByEmployee(int $employeeId, int $companyId, array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $filters['employee_id'] = $employeeId;
        return $this->getPaginated($companyId, $filters, $page, $perPage);
    }
    
    /**
     * Get payroll record with details
     */
    public function findWithDetails(int $id, int $companyId): ?array
    {
        return Database::fetchOne(
            "SELECT pr.*, e.first_name, e.last_name, e.employee_code, e.department, e.position
             FROM payroll_records pr
             JOIN employees e ON pr.employee_id = e.id
             WHERE pr.id = ? AND pr.company_id = ?",
            [$id, $companyId]
        );
    }
    
    /**
     * Check if payroll exists for employee and period
     */
    public function existsForPeriod(int $employeeId, int $companyId, string $periodStart, string $periodEnd): bool
    {
        $result = Database::fetchOne(
            'SELECT COUNT(*) as count FROM payroll_records 
             WHERE employee_id = ? AND company_id = ? AND pay_period_start = ? AND pay_period_end = ?',
            [$employeeId, $companyId, $periodStart, $periodEnd]
        );
        return (int) $result['count'] > 0;
    }
    
    /**
     * Get all employees with salary structures for processing
     */
    public function getEmployeesForPayroll(int $companyId): array
    {
        return Database::fetchAll(
            "SELECT e.id as employee_id, e.first_name, e.last_name, e.employee_code,
                    ss.basic_salary, ss.housing_allowance, ss.transport_allowance, 
                    ss.other_allowances, ss.tax_deduction, ss.insurance_deduction, ss.other_deductions
             FROM employees e
             JOIN salary_structures ss ON e.id = ss.employee_id
             WHERE e.company_id = ? AND e.status = 'active'",
            [$companyId]
        );
    }
    
    /**
     * Create payroll record
     */
    public function createPayrollRecord(array $data): int
    {
        $sql = 'INSERT INTO payroll_records 
                (company_id, employee_id, pay_period_start, pay_period_end, basic_salary, 
                 allowances, gross_salary, deductions, net_salary, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
        
        Database::execute($sql, [
            $data['company_id'],
            $data['employee_id'],
            $data['pay_period_start'],
            $data['pay_period_end'],
            $data['basic_salary'],
            $data['allowances'],
            $data['gross_salary'],
            $data['deductions'],
            $data['net_salary'],
            $data['status'] ?? 'pending'
        ]);
        
        return (int) Database::lastInsertId();
    }
    
    /**
     * Get payroll summary for a period
     */
    public function getSummary(int $companyId, string $month): array
    {
        $sql = "SELECT 
                    COUNT(*) as total_records,
                    SUM(gross_salary) as total_gross,
                    SUM(deductions) as total_deductions,
                    SUM(net_salary) as total_net,
                    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
                FROM payroll_records 
                WHERE company_id = ? AND pay_period_start LIKE ?";
        
        return Database::fetchOne($sql, [$companyId, $month . '%']) ?? [
            'total_records' => 0,
            'total_gross' => 0,
            'total_deductions' => 0,
            'total_net' => 0,
            'paid_count' => 0,
            'pending_count' => 0
        ];
    }
}
