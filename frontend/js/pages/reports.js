/**
 * Reports Page Logic
 * Generates CSV reports for most data and PDF for department report
 */

(async function() {
  // Require authentication
  const isAuth = await auth.requireAuth();
  if (!isAuth) return;

  // Render layout
  sidebar.render('sidebar-container', 'reports');
  header.render('header-container', 'Reports');

  // Initialize report handlers
  initReportHandlers();
})();

/**
 * Initialize click handlers for report buttons
 */
function initReportHandlers() {
  const reportCards = document.querySelectorAll('.report-card');
  
  reportCards.forEach(card => {
    const btn = card.querySelector('.btn');
    const reportType = card.dataset.report;
    
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Generating...';
      
      try {
        switch(reportType) {
          case 'employee':
            await generateEmployeeReport();
            break;
          case 'attendance':
            await generateAttendanceReport();
            break;
          case 'leave':
            await generateLeaveReport();
            break;
          case 'payroll':
            await generatePayrollReport();
            break;
          case 'department':
            await generateDepartmentReport();
            break;
          case 'custom':
            toast.info('Custom report builder coming soon');
            break;
        }
      } catch (error) {
        console.error('Report generation failed:', error);
        toast.error(error.message || 'Failed to generate report');
      } finally {
        btn.disabled = false;
        btn.innerHTML = reportType === 'department' ? 'Download PDF' : 
                        reportType === 'custom' ? 'Create Report' : 'Download CSV';
      }
    });
  });
}

// ============================================
// CSV GENERATION UTILITIES
// ============================================

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data, columns) {
  if (!data || data.length === 0) {
    return columns.map(c => c.label).join(',') + '\n';
  }
  
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row => {
    return columns.map(c => {
      let value = row[c.key];
      if (value === null || value === undefined) value = '';
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""');
        return `"${value}"`;
      }
      return value;
    }).join(',');
  });
  
  return header + '\n' + rows.join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for reports
 */
function formatReportDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
}

/**
 * Format currency for reports
 */
function formatReportCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount || 0);
}

// ============================================
// REPORT GENERATORS
// ============================================

/**
 * Generate Employee Report (CSV)
 */
async function generateEmployeeReport() {
  toast.info('Fetching employee data...');
  
  const response = await api.employees.list({ per_page: 10000 });
  const employees = response.data || [];
  
  if (employees.length === 0) {
    toast.warning('No employee data found');
    return;
  }
  
  const columns = [
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'hire_date', label: 'Hire Date' },
    { key: 'status', label: 'Status' }
  ];
  
  // Format dates
  const formattedData = employees.map(emp => ({
    ...emp,
    hire_date: formatReportDate(emp.hire_date)
  }));
  
  const csv = arrayToCSV(formattedData, columns);
  const filename = `employee_report_${new Date().toISOString().split('T')[0]}.csv`;
  
  downloadCSV(csv, filename);
  toast.success(`Employee report downloaded (${employees.length} records)`);
}

/**
 * Generate Attendance Report (CSV)
 */
async function generateAttendanceReport() {
  toast.info('Fetching attendance data...');
  
  // Get current month's attendance
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const response = await api.attendance.list({ 
    date_from: firstDay, 
    date_to: lastDay,
    per_page: 10000 
  });
  const records = response.data || [];
  
  if (records.length === 0) {
    toast.warning('No attendance data found for this month');
    return;
  }
  
  const columns = [
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'date', label: 'Date' },
    { key: 'clock_in_time', label: 'Clock In' },
    { key: 'clock_out_time', label: 'Clock Out' },
    { key: 'status', label: 'Status' },
    { key: 'work_hours', label: 'Work Hours' }
  ];
  
  const formattedData = records.map(rec => ({
    ...rec,
    date: formatReportDate(rec.date)
  }));
  
  const csv = arrayToCSV(formattedData, columns);
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const filename = `attendance_report_${monthName.replace(' ', '_')}.csv`;
  
  downloadCSV(csv, filename);
  toast.success(`Attendance report downloaded (${records.length} records)`);
}

/**
 * Generate Leave Report (CSV)
 */
async function generateLeaveReport() {
  toast.info('Fetching leave data...');
  
  const response = await api.leave.requests({ per_page: 10000 });
  const requests = response.data || [];
  
  if (requests.length === 0) {
    toast.warning('No leave data found');
    return;
  }
  
  const columns = [
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'leave_type_name', label: 'Leave Type' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'total_days', label: 'Total Days' },
    { key: 'status', label: 'Status' },
    { key: 'reason', label: 'Reason' }
  ];
  
  const formattedData = requests.map(req => ({
    ...req,
    start_date: formatReportDate(req.start_date),
    end_date: formatReportDate(req.end_date)
  }));
  
  const csv = arrayToCSV(formattedData, columns);
  const filename = `leave_report_${new Date().toISOString().split('T')[0]}.csv`;
  
  downloadCSV(csv, filename);
  toast.success(`Leave report downloaded (${requests.length} records)`);
}

/**
 * Generate Payroll Report (CSV)
 */
async function generatePayrollReport() {
  toast.info('Fetching payroll data...');
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const response = await api.payroll.list({ month: currentMonth, per_page: 10000 });
  const records = response.data || [];
  
  if (records.length === 0) {
    toast.warning('No payroll data found for this month');
    return;
  }
  
  const columns = [
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'pay_period', label: 'Pay Period' },
    { key: 'basic_salary', label: 'Basic Salary' },
    { key: 'allowances', label: 'Allowances' },
    { key: 'gross_salary', label: 'Gross Salary' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'net_salary', label: 'Net Salary' },
    { key: 'status', label: 'Status' }
  ];
  
  const formattedData = records.map(rec => ({
    ...rec,
    pay_period: `${rec.year}-${String(rec.month).padStart(2, '0')}`,
    basic_salary: rec.basic_salary || 0,
    allowances: rec.allowances || 0,
    deductions: rec.deductions || rec.total_deductions || 0
  }));
  
  const csv = arrayToCSV(formattedData, columns);
  const filename = `payroll_report_${currentMonth}.csv`;
  
  downloadCSV(csv, filename);
  toast.success(`Payroll report downloaded (${records.length} records)`);
}

/**
 * Generate Department Report (PDF)
 */
async function generateDepartmentReport() {
  toast.info('Generating department report...');
  
  const response = await api.employees.list({ per_page: 10000 });
  const employees = response.data || [];
  
  if (employees.length === 0) {
    toast.warning('No employee data found');
    return;
  }
  
  // Group employees by department
  const departments = {};
  employees.forEach(emp => {
    const dept = emp.department || 'Unassigned';
    if (!departments[dept]) {
      departments[dept] = [];
    }
    departments[dept].push(emp);
  });
  
  // Generate PDF content
  const pdfContent = generateDepartmentPDF(departments, employees.length);
  
  // Download PDF
  downloadPDF(pdfContent, `department_report_${new Date().toISOString().split('T')[0]}.pdf`);
  toast.success('Department report downloaded');
}

/**
 * Generate PDF content for department report
 */
function generateDepartmentPDF(departments, totalEmployees) {
  const companyName = auth.user?.company_name || 'Company';
  const reportDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Create PDF document structure
  let yPos = 50;
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);
  
  // PDF header and content
  let pdfObjects = [];
  let contentStream = '';
  
  // Title
  contentStream += `BT /F1 24 Tf ${margin} ${pageHeight - yPos} Td (Department Report) Tj ET\n`;
  yPos += 30;
  
  // Company and date
  contentStream += `BT /F2 12 Tf ${margin} ${pageHeight - yPos} Td (${companyName}) Tj ET\n`;
  yPos += 18;
  contentStream += `BT /F2 10 Tf ${margin} ${pageHeight - yPos} Td (Generated: ${reportDate}) Tj ET\n`;
  yPos += 30;
  
  // Summary section
  contentStream += `BT /F1 14 Tf ${margin} ${pageHeight - yPos} Td (Summary) Tj ET\n`;
  yPos += 20;
  contentStream += `BT /F2 11 Tf ${margin} ${pageHeight - yPos} Td (Total Employees: ${totalEmployees}) Tj ET\n`;
  yPos += 16;
  contentStream += `BT /F2 11 Tf ${margin} ${pageHeight - yPos} Td (Total Departments: ${Object.keys(departments).length}) Tj ET\n`;
  yPos += 30;
  
  // Department breakdown
  contentStream += `BT /F1 14 Tf ${margin} ${pageHeight - yPos} Td (Department Breakdown) Tj ET\n`;
  yPos += 25;
  
  // Table header
  const colWidths = [200, 100, 150];
  contentStream += drawTableRow(margin, pageHeight - yPos, colWidths, ['Department', 'Employees', 'Percentage'], true);
  yPos += 20;
  
  // Draw line under header
  contentStream += `${margin} ${pageHeight - yPos + 5} m ${margin + contentWidth} ${pageHeight - yPos + 5} l S\n`;
  
  // Department rows
  Object.entries(departments)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([dept, emps]) => {
      const percentage = ((emps.length / totalEmployees) * 100).toFixed(1) + '%';
      contentStream += drawTableRow(margin, pageHeight - yPos, colWidths, [dept, emps.length.toString(), percentage], false);
      yPos += 18;
      
      // Check for page break
      if (yPos > pageHeight - 100) {
        // Would need to handle page breaks for very long reports
      }
    });
  
  // Draw bottom line
  yPos += 5;
  contentStream += `${margin} ${pageHeight - yPos} m ${margin + contentWidth} ${pageHeight - yPos} l S\n`;
  
  // Build PDF
  return buildPDF(contentStream, pageWidth, pageHeight);
}

/**
 * Draw a table row in PDF
 */
function drawTableRow(x, y, colWidths, values, isHeader) {
  let stream = '';
  let currentX = x;
  const fontSize = isHeader ? 11 : 10;
  const font = isHeader ? '/F1' : '/F2';
  
  values.forEach((val, i) => {
    stream += `BT ${font} ${fontSize} Tf ${currentX} ${y} Td (${escapePDFString(val)}) Tj ET\n`;
    currentX += colWidths[i];
  });
  
  return stream;
}

/**
 * Escape special characters for PDF strings
 */
function escapePDFString(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Build complete PDF document
 */
function buildPDF(contentStream, width, height) {
  const objects = [];
  let objectNum = 1;
  
  // Catalog
  objects.push(`${objectNum} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  objectNum++;
  
  // Pages
  objects.push(`${objectNum} 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
  objectNum++;
  
  // Page
  objects.push(`${objectNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj`);
  objectNum++;
  
  // Content stream
  const streamContent = contentStream;
  objects.push(`${objectNum} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj`);
  objectNum++;
  
  // Font 1 (Bold)
  objects.push(`${objectNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);
  objectNum++;
  
  // Font 2 (Regular)
  objects.push(`${objectNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  objectNum++;
  
  // Build PDF structure
  let pdf = '%PDF-1.4\n';
  let xref = 'xref\n0 ' + (objectNum) + '\n0000000000 65535 f \n';
  let offset = pdf.length;
  
  objects.forEach((obj, i) => {
    xref += String(offset).padStart(10, '0') + ' 00000 n \n';
    pdf += obj + '\n';
    offset = pdf.length;
  });
  
  pdf += xref;
  pdf += `trailer\n<< /Size ${objectNum} /Root 1 0 R >>\n`;
  pdf += 'startxref\n' + (pdf.length - xref.length - 1) + '\n%%EOF';
  
  return pdf;
}

/**
 * Download PDF file
 */
function downloadPDF(pdfContent, filename) {
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export functions for global access
window.generateEmployeeReport = generateEmployeeReport;
window.generateAttendanceReport = generateAttendanceReport;
window.generateLeaveReport = generateLeaveReport;
window.generatePayrollReport = generatePayrollReport;
window.generateDepartmentReport = generateDepartmentReport;
