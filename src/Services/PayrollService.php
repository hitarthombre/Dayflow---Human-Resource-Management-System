<?php
/**
 * Payroll Service
 * 
 * Business logic for payroll management.
 */

namespace HRMS\Services;

use HRMS\Repositories\PayrollRepository;
use HRMS\Repositories\EmployeeRepository;
use HRMS\Exceptions\NotFoundException;
use HRMS\Exceptions\ValidationException;

class PayrollService
{
    private PayrollRepository $payrollRepository;
    private EmployeeRepository $employeeRepository;
    
    public function __construct()
    {
        $this->payrollRepository = new PayrollRepository();
        $this->employeeRepository = new EmployeeRepository();
    }
    
    /**
     * Get paginated payroll records
     */
    public function getPayrollRecords(int $companyId, array $filters = [], int $page = 1, int $perPage = 20): array
    {
        return $this->payrollRepository->getPaginated($companyId, $filters, $page, $perPage);
    }
    
    /**
     * Get single payroll record
     */
    public function getPayrollRecord(int $id, int $companyId): array
    {
        $record = $this->payrollRepository->findWithDetails($id, $companyId);
        
        if (!$record) {
            throw new NotFoundException('Payroll record not found');
        }
        
        return $record;
    }
    
    /**
     * Get employee's own payroll records
     */
    public function getMyPayroll(int $employeeId, int $companyId, array $filters = [], int $page = 1, int $perPage = 20): array
    {
        return $this->payrollRepository->getByEmployee($employeeId, $companyId, $filters, $page, $perPage);
    }
    
    /**
     * Process payroll for a month
     */
    public function processPayroll(int $companyId, array $data): array
    {
        $this->validateProcessData($data);
        
        $month = $data['month']; // Format: YYYY-MM
        $periodStart = $month . '-01';
        $periodEnd = date('Y-m-t', strtotime($periodStart));
        
        // Get all employees with salary structures
        $employees = $this->payrollRepository->getEmployeesForPayroll($companyId);
        
        if (empty($employees)) {
            throw new ValidationException(['employees' => 'No employees with salary structures found']);
        }
        
        $processed = [];
        $skipped = [];
        
        foreach ($employees as $employee) {
            // Check if already processed
            if ($this->payrollRepository->existsForPeriod(
                $employee['employee_id'], 
                $companyId, 
                $periodStart, 
                $periodEnd
            )) {
                $skipped[] = [
                    'employee_id' => $employee['employee_id'],
                    'name' => $employee['first_name'] . ' ' . $employee['last_name'],
                    'reason' => 'Already processed'
                ];
                continue;
            }
            
            // Calculate payroll
            $basicSalary = (float) $employee['basic_salary'];
            $allowances = (float) ($employee['housing_allowance'] ?? 0) 
                        + (float) ($employee['transport_allowance'] ?? 0) 
                        + (float) ($employee['other_allowances'] ?? 0);
            $grossSalary = $basicSalary + $allowances;
            
            $deductions = (float) ($employee['tax_deduction'] ?? 0) 
                        + (float) ($employee['insurance_deduction'] ?? 0) 
                        + (float) ($employee['other_deductions'] ?? 0);
            $netSalary = $grossSalary - $deductions;
            
            $payrollData = [
                'company_id' => $companyId,
                'employee_id' => $employee['employee_id'],
                'pay_period_start' => $periodStart,
                'pay_period_end' => $periodEnd,
                'basic_salary' => $basicSalary,
                'allowances' => $allowances,
                'gross_salary' => $grossSalary,
                'deductions' => $deductions,
                'net_salary' => $netSalary,
                'status' => 'pending'
            ];
            
            $id = $this->payrollRepository->createPayrollRecord($payrollData);
            
            $processed[] = [
                'id' => $id,
                'employee_id' => $employee['employee_id'],
                'name' => $employee['first_name'] . ' ' . $employee['last_name'],
                'net_salary' => $netSalary
            ];
        }
        
        return [
            'month' => $month,
            'processed_count' => count($processed),
            'skipped_count' => count($skipped),
            'processed' => $processed,
            'skipped' => $skipped,
            'summary' => $this->payrollRepository->getSummary($companyId, $month)
        ];
    }
    
    /**
     * Get payroll summary
     */
    public function getSummary(int $companyId, string $month): array
    {
        return $this->payrollRepository->getSummary($companyId, $month);
    }
    
    /**
     * Validate process data
     */
    private function validateProcessData(array $data): void
    {
        $errors = [];
        
        if (empty($data['month'])) {
            $errors['month'] = 'Month is required (format: YYYY-MM)';
        } elseif (!preg_match('/^\d{4}-\d{2}$/', $data['month'])) {
            $errors['month'] = 'Invalid month format (use YYYY-MM)';
        }
        
        if (!empty($errors)) {
            throw new ValidationException($errors);
        }
    }
}
