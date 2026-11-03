import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';
import { User, MonthlyPaysheetDTO } from '../models';
import { SALES_BASED_ROLES, NON_TARGET_ROLES } from '../engine/salary-calculator';

export async function exportUsersToExcel(users: User[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Payroll System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Users', {
    headerFooter: { firstHeader: 'Employee Data Report' },
  });

  sheet.columns = [
    { header: 'Code No', key: 'codeNo', width: 15 },
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Branch', key: 'branch', width: 18 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Join Date', key: 'joinDate', width: 14 },
    { header: 'Bank Name', key: 'bankName', width: 16 },
    { header: 'Bank Account', key: 'bankAccount', width: 18 },
    { header: 'Basic Offer', key: 'basicSalary', width: 14 },
    { header: 'Offers', key: 'allowances', width: 14 },
    { header: 'Deductions', key: 'deductions', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Add data rows
  users.forEach((user) => {
    sheet.addRow(user);
  });

  // Auto-fit and style data rows
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle' };
      });
    }
  });

  return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
}

export async function exportMonthlyPaysheetsToExcel(
  records: MonthlyPaysheetDTO[],
  users?: User[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Payroll System';
  workbook.created = new Date();

  // Build user lookup for employee names
  const userMap = new Map<string, User>();
  if (users) {
    users.forEach((u) => userMap.set(u.codeNo, u));
  }

  // Group records by payMonth → each month is one sheet
  const byMonth = new Map<string, MonthlyPaysheetDTO[]>();
  for (const rec of records) {
    if (!byMonth.has(rec.payMonth)) byMonth.set(rec.payMonth, []);
    byMonth.get(rec.payMonth)!.push(rec);
  }

  // Sort months chronologically
  const sortedMonths = [...byMonth.keys()].sort();

  const HEADER_COLOR = 'FF1b1464';        // Navy
  const ROLE_SECTION_COLOR = 'FF059669';   // Green
  const GOLD_COLOR = 'FFc8a415';           // Gold

   const dataColumns = [
     { header: 'Code No', key: 'codeNo', width: 14 },
     { header: 'Employee Name', key: 'employeeName', width: 24 },
     { header: 'Bank Name', key: 'bankName', width: 16 },
     { header: 'Bank Account', key: 'bankAccount', width: 18 },
     { header: 'Role', key: 'role', width: 18 },
    { header: 'Basic Offer', key: 'basicSalary', width: 14 },
    { header: 'Achieve', key: 'achieve', width: 14 },
    { header: 'Month Target',   key: 'assignedTarget', width: 16 },
    { header: 'Achievement %', key: 'achievementPct', width: 14 },
    { header: 'Carry Forward',  key: 'carryForward',          width: 16 },
    { header: 'Annual Achieved',key: 'totalAchieved',         width: 18 },
    { header: 'Remaining Target',key: 'remainingTarget',      width: 18 },
    { header: 'Offer', key: 'allowance', width: 14 },
    { header: 'Vehicle Offer', key: 'vehicleAllowance', width: 14 },
    { header: 'Fuel Offer', key: 'fuelAllowance', width: 14 },
    { header: 'General Offer', key: 'generalAllowance', width: 14 },
    { header: 'Other Offer', key: 'otherOffer', width: 14 },
    { header: 'Custom Earning', key: 'customEarningAmount', width: 14 },
    { header: 'Gross Offer', key: 'grossSalary', width: 14 },
    { header: 'No Pay Days', key: 'nopay', width: 10 },
    { header: 'No Pay Ded.', key: 'nopayDeduction', width: 14 },
    { header: 'Late Ded.', key: 'lateDeduction', width: 14 },
    { header: 'EPF 8%', key: 'epfEmployee', width: 14 },
    { header: 'Welfare', key: 'welfare', width: 12 },
    { header: 'Custom Ded.', key: 'customDeductionAmount', width: 14 },
    { header: 'Net Offer', key: 'netSalary', width: 14 },
  ];

  for (const month of sortedMonths) {
    const monthRecords = byMonth.get(month)!;

    // Format sheet name: "2026-03" → "Mar 2026"
    const [yr, mo] = month.split('-');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sheetLabel = `${monthNames[parseInt(mo, 10) - 1] || mo} ${yr}`;
    const safeName = sheetLabel.replace(/[\\/*?[\]:]/g, '').slice(0, 31);
    const sheet = workbook.addWorksheet(safeName);

    // Group within this month by role, sort roles alphabetically
    const byRole = new Map<string, MonthlyPaysheetDTO[]>();
    for (const rec of monthRecords) {
      const role = rec.role || 'Unknown';
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role)!.push(rec);
    }
    const sortedRoles = [...byRole.keys()].sort();

    // Set column widths
    sheet.columns = dataColumns.map((c) => ({ key: c.key, width: c.width }));

    let currentRow = 1;

    // Sheet title row
    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = `Monthly Paysheets — ${sheetLabel}`;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
    titleRow.height = 28;
    currentRow += 1;

    let monthGross = 0;
    let monthNet = 0;

    for (const role of sortedRoles) {
      const roleRecords = byRole.get(role)!;

      // Role section header
      const roleRow = sheet.getRow(currentRow);
      roleRow.getCell(1).value = role;
      roleRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      roleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROLE_SECTION_COLOR } };
      roleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      // Fill entire role header row with green
      for (let i = 2; i <= dataColumns.length; i++) {
        roleRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROLE_SECTION_COLOR } };
      }
      sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
      roleRow.height = 22;
      currentRow += 1;

      // Column headers under each role section
      const hdrRow = sheet.getRow(currentRow);
      dataColumns.forEach((col, idx) => {
        const cell = hdrRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { bold: true, size: 10, color: { argb: 'FF222222' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
      });
      currentRow += 1;

      // Data rows
      let roleGross = 0;
      let roleNet = 0;

       for (const rec of roleRecords) {
         const user = userMap.get(rec.codeNo);
         const empName = user ? `${user.firstName} ${user.lastName}` : rec.codeNo;
         const row = sheet.getRow(currentRow);

         const values: Record<string, unknown> = {
           ...rec,
           employeeName: empName,
           bankName: user?.bankName || '',
           bankAccount: user?.bankAccount || '',
           achievementPct: Number(((rec.achievementPct || 0) * 100).toFixed(2)),
         };
         dataColumns.forEach((col, idx) => {
           row.getCell(idx + 1).value = values[col.key] as string | number;
           row.getCell(idx + 1).alignment = { vertical: 'middle' };
         });

        roleGross += rec.grossSalary || 0;
        roleNet += rec.netSalary || 0;
        currentRow += 1;
      }

      // Role subtotal row
      const subtotalRow = sheet.getRow(currentRow);
      subtotalRow.getCell(1).value = `${role} Subtotal (${roleRecords.length})`;
      subtotalRow.getCell(1).font = { bold: true, size: 10 };
      // Gross column
      const grossIdx = dataColumns.findIndex((c) => c.key === 'grossSalary') + 1;
      const netIdx = dataColumns.findIndex((c) => c.key === 'netSalary') + 1;
      subtotalRow.getCell(grossIdx).value = roleGross;
      subtotalRow.getCell(grossIdx).font = { bold: true };
      subtotalRow.getCell(grossIdx).numFmt = '#,##0.00';
      subtotalRow.getCell(netIdx).value = roleNet;
      subtotalRow.getCell(netIdx).font = { bold: true };
      subtotalRow.getCell(netIdx).numFmt = '#,##0.00';
      // Light border on subtotal
      for (let i = 1; i <= dataColumns.length; i++) {
        subtotalRow.getCell(i).border = { top: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
        subtotalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
      currentRow += 2; // blank row after each role

      monthGross += roleGross;
      monthNet += roleNet;
    }

    // Month grand total row
    currentRow += 1;
    const totalRow = sheet.getRow(currentRow);
    totalRow.getCell(1).value = `GRAND TOTAL — ${sheetLabel} (${monthRecords.length} employees)`;
    totalRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    const grossIdx = dataColumns.findIndex((c) => c.key === 'grossSalary') + 1;
    const netIdx = dataColumns.findIndex((c) => c.key === 'netSalary') + 1;
    totalRow.getCell(grossIdx).value = monthGross;
    totalRow.getCell(grossIdx).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(grossIdx).numFmt = '#,##0.00';
    totalRow.getCell(netIdx).value = monthNet;
    totalRow.getCell(netIdx).font = { bold: true, color: { argb: GOLD_COLOR } };
    totalRow.getCell(netIdx).numFmt = '#,##0.00';
    for (let i = 1; i <= dataColumns.length; i++) {
      totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    }
    totalRow.height = 24;
  }

  return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
}

export async function exportMonthlyPaysheetsByBranchToExcel(
  records: MonthlyPaysheetDTO[],
  users?: User[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Payroll System';
  workbook.created = new Date();

  const userMap = new Map<string, User>();
  if (users) users.forEach((u) => userMap.set(u.codeNo, u));

  const HEADER_COLOR = 'FF1b1464';
  const BRANCH_COLOR = 'FF7c3aed';   // Purple — branch title
  const MONTH_COLOR  = 'FF0891b2';   // Teal   — month section
  const GOLD_COLOR   = 'FFc8a415';

  const dataColumns = [
    { header: 'Code No',        key: 'codeNo',               width: 14 },
    { header: 'Employee Name',  key: 'employeeName',          width: 24 },
    { header: 'Bank Name',      key: 'bankName',              width: 16 },
    { header: 'Bank Account',   key: 'bankAccount',           width: 18 },
    { header: 'Role',           key: 'role',                  width: 18 },
    { header: 'Basic Offer',    key: 'basicSalary',           width: 14 },
    { header: 'Achieve',        key: 'achieve',               width: 14 },
    { header: 'Month Target',   key: 'assignedTarget',        width: 16 },
    { header: 'Achievement %',  key: 'achievementPct',        width: 14 },
    { header: 'Carry Forward',  key: 'carryForward',          width: 16 },
    { header: 'Annual Achieved',key: 'totalAchieved',         width: 18 },
    { header: 'Remaining Target',key: 'remainingTarget',      width: 18 },
    { header: 'Offer',          key: 'allowance',             width: 14 },
    { header: 'Vehicle Offer',  key: 'vehicleAllowance',      width: 14 },
    { header: 'Fuel Offer',     key: 'fuelAllowance',         width: 14 },
    { header: 'General Offer',  key: 'generalAllowance',      width: 14 },
    { header: 'Other Offer',    key: 'otherOffer',            width: 14 },
    { header: 'Custom Earning', key: 'customEarningAmount',   width: 14 },
    { header: 'Gross Offer',    key: 'grossSalary',           width: 14 },
    { header: 'No Pay Days',    key: 'nopay',                 width: 10 },
    { header: 'No Pay Ded.',    key: 'nopayDeduction',        width: 14 },
    { header: 'Late Ded.',      key: 'lateDeduction',         width: 14 },
    { header: 'EPF 8%',         key: 'epfEmployee',           width: 14 },
    { header: 'Welfare',        key: 'welfare',               width: 12 },
    { header: 'Custom Ded.',    key: 'customDeductionAmount', width: 14 },
    { header: 'Net Offer',      key: 'netSalary',             width: 14 },
  ];

  const grossIdx = dataColumns.findIndex((c) => c.key === 'grossSalary') + 1;
  const netIdx   = dataColumns.findIndex((c) => c.key === 'netSalary')   + 1;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Group by branch
  const byBranch = new Map<string, MonthlyPaysheetDTO[]>();
  for (const rec of records) {
    const user = userMap.get(rec.codeNo);
    const branch = user?.branch || 'Unknown';
    if (!byBranch.has(branch)) byBranch.set(branch, []);
    byBranch.get(branch)!.push(rec);
  }
  const sortedBranches = [...byBranch.keys()].sort();

  for (const branch of sortedBranches) {
    const branchRecords = byBranch.get(branch)!;
    const safeName = branch.replace(/[\\/*?[\]:]/g, '').slice(0, 31);
    const sheet = workbook.addWorksheet(safeName);
    sheet.columns = dataColumns.map((c) => ({ key: c.key, width: c.width }));

    let currentRow = 1;

    // Branch title row
    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = `Branch: ${branch}`;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRANCH_COLOR } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
    titleRow.height = 28;
    currentRow += 1;

    // Group within this branch by payMonth
    const byMonth = new Map<string, MonthlyPaysheetDTO[]>();
    for (const rec of branchRecords) {
      if (!byMonth.has(rec.payMonth)) byMonth.set(rec.payMonth, []);
      byMonth.get(rec.payMonth)!.push(rec);
    }
    const sortedMonths = [...byMonth.keys()].sort();

    let totalGross = 0, totalNet = 0;

    for (const month of sortedMonths) {
      const monthRecords = byMonth.get(month)!;
      const [yr, mo] = month.split('-');
      const sheetLabel = `${monthNames[parseInt(mo, 10) - 1] || mo} ${yr}`;

      // Month section header
      const monthRow = sheet.getRow(currentRow);
      monthRow.getCell(1).value = sheetLabel;
      monthRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      monthRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MONTH_COLOR } };
      monthRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      for (let i = 2; i <= dataColumns.length; i++) {
        monthRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MONTH_COLOR } };
      }
      sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
      monthRow.height = 22;
      currentRow += 1;

      // Column headers
      const hdrRow = sheet.getRow(currentRow);
      dataColumns.forEach((col, idx) => {
        const cell = hdrRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { bold: true, size: 10, color: { argb: 'FF222222' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
      });
      currentRow += 1;

      let monthGross = 0, monthNet = 0;

      for (const rec of monthRecords) {
        const user = userMap.get(rec.codeNo);
        const empName = user ? `${user.firstName} ${user.lastName}` : rec.codeNo;
        const row = sheet.getRow(currentRow);
        const values: Record<string, unknown> = {
          ...rec,
          employeeName: empName,
          bankName: user?.bankName || '',
          bankAccount: user?.bankAccount || '',
          achievementPct: Number(((rec.achievementPct || 0) * 100).toFixed(2)),
        };
        dataColumns.forEach((col, idx) => {
          row.getCell(idx + 1).value = values[col.key] as string | number;
          row.getCell(idx + 1).alignment = { vertical: 'middle' };
        });
        monthGross += rec.grossSalary || 0;
        monthNet   += rec.netSalary   || 0;
        currentRow += 1;
      }

      // Month subtotal
      const subtotalRow = sheet.getRow(currentRow);
      subtotalRow.getCell(1).value = `${sheetLabel} Subtotal (${monthRecords.length})`;
      subtotalRow.getCell(1).font = { bold: true, size: 10 };
      subtotalRow.getCell(grossIdx).value = monthGross;
      subtotalRow.getCell(grossIdx).font = { bold: true };
      subtotalRow.getCell(grossIdx).numFmt = '#,##0.00';
      subtotalRow.getCell(netIdx).value = monthNet;
      subtotalRow.getCell(netIdx).font = { bold: true };
      subtotalRow.getCell(netIdx).numFmt = '#,##0.00';
      for (let i = 1; i <= dataColumns.length; i++) {
        subtotalRow.getCell(i).border = { top: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
        subtotalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
      currentRow += 2;

      totalGross += monthGross;
      totalNet   += monthNet;
    }

    // Grand total
    currentRow += 1;
    const totalRow = sheet.getRow(currentRow);
    totalRow.getCell(1).value = `GRAND TOTAL — ${branch} (${branchRecords.length} records)`;
    totalRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(grossIdx).value  = totalGross;
    totalRow.getCell(grossIdx).font   = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(grossIdx).numFmt = '#,##0.00';
    totalRow.getCell(netIdx).value    = totalNet;
    totalRow.getCell(netIdx).font     = { bold: true, color: { argb: GOLD_COLOR } };
    totalRow.getCell(netIdx).numFmt   = '#,##0.00';
    for (let i = 1; i <= dataColumns.length; i++) {
      totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    }
    totalRow.height = 24;
  }

  return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
}

export async function exportMonthlyPaysheetsByRoleToExcel(
  records: MonthlyPaysheetDTO[],
  users?: User[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Payroll System';
  workbook.created = new Date();

  const userMap = new Map<string, User>();
  if (users) users.forEach((u) => userMap.set(u.codeNo, u));

  const ROLE_NAMES: Record<string, string> = { ...SALES_BASED_ROLES, ...NON_TARGET_ROLES };

  const HEADER_COLOR = 'FF1b1464';
  const ROLE_COLOR   = 'FF059669';   // Green — role title
  const MONTH_COLOR  = 'FFd97706';   // Amber  — month section
  const GOLD_COLOR   = 'FFc8a415';

  const dataColumns = [
    { header: 'Code No',        key: 'codeNo',               width: 14 },
    { header: 'Employee Name',  key: 'employeeName',          width: 24 },
    { header: 'Bank Name',      key: 'bankName',              width: 16 },
    { header: 'Bank Account',   key: 'bankAccount',           width: 18 },
    { header: 'Branch',         key: 'branch',                width: 18 },
    { header: 'Basic Offer',    key: 'basicSalary',           width: 14 },
    { header: 'Achieve',        key: 'achieve',               width: 14 },
    { header: 'Month Target',   key: 'assignedTarget',        width: 16 },
    { header: 'Achievement %',  key: 'achievementPct',        width: 14 },
    { header: 'Carry Forward',  key: 'carryForward',          width: 16 },
    { header: 'Annual Achieved',key: 'totalAchieved',         width: 18 },
    { header: 'Remaining Target',key: 'remainingTarget',      width: 18 },
    { header: 'Offer',          key: 'allowance',             width: 14 },
    { header: 'Vehicle Offer',  key: 'vehicleAllowance',      width: 14 },
    { header: 'Fuel Offer',     key: 'fuelAllowance',         width: 14 },
    { header: 'General Offer',  key: 'generalAllowance',      width: 14 },
    { header: 'Other Offer',    key: 'otherOffer',            width: 14 },
    { header: 'Custom Earning', key: 'customEarningAmount',   width: 14 },
    { header: 'Gross Offer',    key: 'grossSalary',           width: 14 },
    { header: 'No Pay Days',    key: 'nopay',                 width: 10 },
    { header: 'No Pay Ded.',    key: 'nopayDeduction',        width: 14 },
    { header: 'Late Ded.',      key: 'lateDeduction',         width: 14 },
    { header: 'EPF 8%',         key: 'epfEmployee',           width: 14 },
    { header: 'Welfare',        key: 'welfare',               width: 12 },
    { header: 'Custom Ded.',    key: 'customDeductionAmount', width: 14 },
    { header: 'Net Offer',      key: 'netSalary',             width: 14 },
  ];

  const grossIdx = dataColumns.findIndex((c) => c.key === 'grossSalary') + 1;
  const netIdx   = dataColumns.findIndex((c) => c.key === 'netSalary')   + 1;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Group by role
  const byRole = new Map<string, MonthlyPaysheetDTO[]>();
  for (const rec of records) {
    const role = rec.role || 'Unknown';
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)!.push(rec);
  }
  const sortedRoles = [...byRole.keys()].sort();

  for (const role of sortedRoles) {
    const roleRecords = byRole.get(role)!;
    const roleName = ROLE_NAMES[role] || role;
    const safeName = role.replace(/[\\/*?[\]:]/g, '').slice(0, 31);
    const sheet = workbook.addWorksheet(safeName);
    sheet.columns = dataColumns.map((c) => ({ key: c.key, width: c.width }));

    let currentRow = 1;

    // Role title row
    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = `Role: ${roleName}`;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROLE_COLOR } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
    titleRow.height = 28;
    currentRow += 1;

    // Group within this role by payMonth
    const byMonth = new Map<string, MonthlyPaysheetDTO[]>();
    for (const rec of roleRecords) {
      if (!byMonth.has(rec.payMonth)) byMonth.set(rec.payMonth, []);
      byMonth.get(rec.payMonth)!.push(rec);
    }
    const sortedMonths = [...byMonth.keys()].sort();

    let totalGross = 0, totalNet = 0;

    for (const month of sortedMonths) {
      const monthRecords = byMonth.get(month)!;
      const [yr, mo] = month.split('-');
      const sheetLabel = `${monthNames[parseInt(mo, 10) - 1] || mo} ${yr}`;

      // Month section header
      const monthRow = sheet.getRow(currentRow);
      monthRow.getCell(1).value = sheetLabel;
      monthRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      monthRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MONTH_COLOR } };
      monthRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      for (let i = 2; i <= dataColumns.length; i++) {
        monthRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MONTH_COLOR } };
      }
      sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
      monthRow.height = 22;
      currentRow += 1;

      // Column headers
      const hdrRow = sheet.getRow(currentRow);
      dataColumns.forEach((col, idx) => {
        const cell = hdrRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { bold: true, size: 10, color: { argb: 'FF222222' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
      });
      currentRow += 1;

      let monthGross = 0, monthNet = 0;

      for (const rec of monthRecords) {
        const user = userMap.get(rec.codeNo);
        const empName = user ? `${user.firstName} ${user.lastName}` : rec.codeNo;
        const row = sheet.getRow(currentRow);
        const values: Record<string, unknown> = {
          ...rec,
          employeeName: empName,
          bankName: user?.bankName || '',
          bankAccount: user?.bankAccount || '',
          branch: user?.branch || '',
          achievementPct: Number(((rec.achievementPct || 0) * 100).toFixed(2)),
        };
        dataColumns.forEach((col, idx) => {
          row.getCell(idx + 1).value = values[col.key] as string | number;
          row.getCell(idx + 1).alignment = { vertical: 'middle' };
        });
        monthGross += rec.grossSalary || 0;
        monthNet   += rec.netSalary   || 0;
        currentRow += 1;
      }

      // Month subtotal
      const subtotalRow = sheet.getRow(currentRow);
      subtotalRow.getCell(1).value = `${sheetLabel} Subtotal (${monthRecords.length})`;
      subtotalRow.getCell(1).font = { bold: true, size: 10 };
      subtotalRow.getCell(grossIdx).value = monthGross;
      subtotalRow.getCell(grossIdx).font = { bold: true };
      subtotalRow.getCell(grossIdx).numFmt = '#,##0.00';
      subtotalRow.getCell(netIdx).value = monthNet;
      subtotalRow.getCell(netIdx).font = { bold: true };
      subtotalRow.getCell(netIdx).numFmt = '#,##0.00';
      for (let i = 1; i <= dataColumns.length; i++) {
        subtotalRow.getCell(i).border = { top: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
        subtotalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
      currentRow += 2;

      totalGross += monthGross;
      totalNet   += monthNet;
    }

    // Grand total
    currentRow += 1;
    const totalRow = sheet.getRow(currentRow);
    totalRow.getCell(1).value = `GRAND TOTAL — ${roleName} (${roleRecords.length} records)`;
    totalRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(grossIdx).value  = totalGross;
    totalRow.getCell(grossIdx).font   = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(grossIdx).numFmt = '#,##0.00';
    totalRow.getCell(netIdx).value    = totalNet;
    totalRow.getCell(netIdx).font     = { bold: true, color: { argb: GOLD_COLOR } };
    totalRow.getCell(netIdx).numFmt   = '#,##0.00';
    for (let i = 1; i <= dataColumns.length; i++) {
      totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    }
    totalRow.height = 24;
  }

  return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
}

export async function exportPaysheetsToMonthBranchZip(
  records: MonthlyPaysheetDTO[],
  users: User[]
): Promise<Buffer> {
  const userMap = new Map<string, User>();
  users.forEach((u) => userMap.set(u.codeNo, u));

  const byMonth = new Map<string, Map<string, MonthlyPaysheetDTO[]>>();
  for (const rec of records) {
    const user = userMap.get(rec.codeNo);
    const branch = user?.branch || 'Unknown';
    if (!byMonth.has(rec.payMonth)) byMonth.set(rec.payMonth, new Map());
    const monthMap = byMonth.get(rec.payMonth)!;
    if (!monthMap.has(branch)) monthMap.set(branch, []);
    monthMap.get(branch)!.push(rec);
  }

  const dataColumns = [
    { header: 'Code No',        key: 'codeNo',               width: 14 },
    { header: 'Employee Name',  key: 'employeeName',          width: 24 },
    { header: 'Bank Name',      key: 'bankName',              width: 16 },
    { header: 'Bank Account',   key: 'bankAccount',           width: 18 },
    { header: 'Role',           key: 'role',                  width: 18 },
    { header: 'Basic Offer',    key: 'basicSalary',           width: 14 },
    { header: 'Achieve',        key: 'achieve',               width: 14 },
    { header: 'Month Target',   key: 'assignedTarget',        width: 16 },
    { header: 'Achievement %',  key: 'achievementPct',        width: 14 },
    { header: 'Carry Forward',  key: 'carryForward',          width: 16 },
    { header: 'Annual Achieved',key: 'totalAchieved',         width: 18 },
    { header: 'Remaining Target',key: 'remainingTarget',      width: 18 },
    { header: 'Offer',          key: 'allowance',             width: 14 },
    { header: 'Vehicle Offer',  key: 'vehicleAllowance',      width: 14 },
    { header: 'Fuel Offer',     key: 'fuelAllowance',         width: 14 },
    { header: 'General Offer',  key: 'generalAllowance',      width: 14 },
    { header: 'Other Offer',    key: 'otherOffer',            width: 14 },
    { header: 'Custom Earning', key: 'customEarningAmount',   width: 14 },
    { header: 'Gross Offer',    key: 'grossSalary',           width: 14 },
    { header: 'No Pay Days',    key: 'nopay',                 width: 10 },
    { header: 'No Pay Ded.',    key: 'nopayDeduction',        width: 14 },
    { header: 'Late Ded.',      key: 'lateDeduction',         width: 14 },
    { header: 'EPF 8%',         key: 'epfEmployee',           width: 14 },
    { header: 'Welfare',        key: 'welfare',               width: 12 },
    { header: 'Custom Ded.',    key: 'customDeductionAmount', width: 14 },
    { header: 'Net Offer',      key: 'netSalary',             width: 14 },
  ];

  // Build the ZIP entirely in memory — one xlsx per month/branch, collected
  // into a single archive buffer that is streamed straight to the browser.
  const archiver = require('archiver');
  const archive = archiver('zip', { zlib: { level: 9 } });
  const collector = new PassThrough();
  const chunks: Buffer[] = [];
  collector.on('data', (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    collector.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
  });
  archive.pipe(collector);

  const HEADER_COLOR = 'FF1b1464';
  const BRANCH_COLOR = 'FF7c3aed';   // Purple — branch title, matches exportMonthlyPaysheetsByBranchToExcel
  const GOLD_COLOR   = 'FFc8a415';
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const grossIdx = dataColumns.findIndex((c) => c.key === 'grossSalary') + 1;
  const netIdx   = dataColumns.findIndex((c) => c.key === 'netSalary')   + 1;

  for (const [month, branchMap] of byMonth.entries()) {
    const [yr, mo] = month.split('-');
    const monthLabel = `${monthNames[parseInt(mo, 10) - 1] || mo} ${yr}`;

    for (const [branch, branchRecords] of branchMap.entries()) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Paysheets');
      sheet.columns = dataColumns.map(c => ({ key: c.key, width: c.width }));

      let currentRow = 1;

      // Branch + month title row
      const titleRow = sheet.getRow(currentRow);
      titleRow.getCell(1).value = `Branch: ${branch} — ${monthLabel}`;
      titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRANCH_COLOR } };
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
      titleRow.height = 28;
      currentRow += 1;

      // Column headers
      const hdrRow = sheet.getRow(currentRow);
      dataColumns.forEach((col, idx) => {
        const cell = hdrRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { bold: true, size: 10, color: { argb: 'FF222222' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
      });
      currentRow += 1;

      let totalGross = 0, totalNet = 0;

      for (const rec of branchRecords) {
        const user = userMap.get(rec.codeNo);
        const empName = user ? `${user.firstName} ${user.lastName}` : rec.codeNo;
        const row = sheet.getRow(currentRow);
        const values: Record<string, unknown> = {
          ...rec,
          employeeName: empName,
          bankName: user?.bankName || '',
          bankAccount: user?.bankAccount || '',
          achievementPct: Number(((rec.achievementPct || 0) * 100).toFixed(2)),
        };
        dataColumns.forEach((col, idx) => {
          row.getCell(idx + 1).value = values[col.key] as string | number;
          row.getCell(idx + 1).alignment = { vertical: 'middle' };
        });
        totalGross += rec.grossSalary || 0;
        totalNet   += rec.netSalary   || 0;
        currentRow += 1;
      }

      // Grand total row
      currentRow += 1;
      const totalRow = sheet.getRow(currentRow);
      totalRow.getCell(1).value = `GRAND TOTAL — ${branch} (${branchRecords.length} records)`;
      totalRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      totalRow.getCell(grossIdx).value  = totalGross;
      totalRow.getCell(grossIdx).font   = { bold: true, color: { argb: 'FFFFFFFF' } };
      totalRow.getCell(grossIdx).numFmt = '#,##0.00';
      totalRow.getCell(netIdx).value    = totalNet;
      totalRow.getCell(netIdx).font     = { bold: true, color: { argb: GOLD_COLOR } };
      totalRow.getCell(netIdx).numFmt   = '#,##0.00';
      for (let i = 1; i <= dataColumns.length; i++) {
        totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
      }
      totalRow.height = 24;

      const branchFileName = `${branch.replace(/[^a-zA-Z0-9]/g, '_')}_${month}.xlsx`;
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
      archive.append(buffer, { name: `${month}/${branchFileName}` });
    }
  }

  archive.finalize();
  return done;
}

