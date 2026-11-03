import fs from 'fs';
import path from 'path';
import type { PayslipEmployee } from '../types/worker';

const NAVY = '#1b1464';
const NAVY_DARK = '#111052';
const GOLD = '#c8a415';

// Load company logo as base64 for embedding in PDF
let logoBase64 = '';
try {
  const logoPath = process.env.CLIENT_PATH
    ? path.join(process.env.CLIENT_PATH, 'icon.png')
    : path.join(__dirname, '..', '..', '..', 'client', 'public', 'icon.png');
  if (fs.existsSync(logoPath)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  }
} catch {
  // Logo not available — will fall back to text
}

function fmt(amount: number): string {
  if (amount === 0) return 'Rs. 0.00';
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonth(payMonth: string): string {
  const [year, month] = payMonth.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function row(label: string, amount: number, alt = false): string {
  if (amount === 0 && label !== 'No Pay' && label !== 'Late Comes' && label !== 'Welfare') return '';
  return `<div class="row${alt ? ' alt' : ''}"><span>${label}</span><span class="amt">${fmt(amount)}</span></div>`;
}

export function renderPayslipHTML(emp: PayslipEmployee): string {
  const totalDeductions =
    emp.epfEmployee + emp.nopayDeduction + emp.lateDeduction + emp.welfare + emp.customDeductionAmount;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: 210mm 297mm; margin: 8mm 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #fff; color: #333;
    width: 190mm; margin: 0 auto; font-size: 11px;
  }
  .header {
    background: ${NAVY}; display: flex; align-items: center;
    padding: 12px 20px; gap: 14px;
  }
  .logo-img {
    width: 52px; height: 52px; border-radius: 50%;
    object-fit: cover; flex-shrink: 0;
  }
  .logo-circle {
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(135deg, ${GOLD} 0%, #e8c930 40%, #a08510 100%);
    display: flex; align-items: center; justify-content: center;
    border: 2px solid ${GOLD}; flex-shrink: 0;
  }
  .logo-inner {
    width: 38px; height: 38px; border-radius: 50%;
    background: ${NAVY_DARK}; display: flex; align-items: center; justify-content: center;
    border: 1px solid ${GOLD};
  }
  .logo-text { color: ${GOLD}; font-size: 9px; font-weight: 800; letter-spacing: 1px; font-family: Georgia, serif; }
  .hdr-right { flex: 1; }
  .co-name { color: #fff; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; line-height: 1.3; font-family: Georgia, serif; }
  .co-sub { color: #fff; font-size: 10.5px; font-weight: 600; margin: 2px 0 5px; font-family: Georgia, serif; }
  .contact { display: flex; gap: 14px; flex-wrap: wrap; }
  .contact span { color: #ccc; font-size: 9px; }

  .info { padding: 10px 20px; border-bottom: 1.5px solid #ddd; }
  .info-grid { display: flex; gap: 12px; }
  .info-col { flex: 1; }
  .info-row { display: flex; align-items: center; padding: 3px 0; gap: 6px; }
  .info-row .lbl { font-weight: 600; font-size: 10.5px; color: #222; min-width: 85px; }
  .info-row .col { font-weight: 600; color: #222; font-size: 10.5px; }
  .info-row .val { font-size: 10.5px; color: #444; }

  .sh {
    background: ${NAVY}; display: flex; justify-content: space-between;
    align-items: center; padding: 6px 20px;
  }
  .sh span { color: #fff; font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }

  .row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 20px; border-bottom: 0.5px solid #ddd;
  }
  .row span { font-size: 11px; color: #333; }
  .row .amt { font-weight: 500; min-width: 100px; text-align: right; }
  .alt { background: #f6f6f6; }

  .total {
    background: ${NAVY}; display: flex; justify-content: space-between;
    align-items: center; padding: 6px 20px;
  }
  .total span { color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
  .total .amt { font-weight: 700; min-width: 100px; text-align: right; }

  .epf-row {
    display: flex; border-bottom: 0.5px solid #ddd;
  }
  .epf-row > div { flex: 1; display: flex; justify-content: space-between; padding: 5px 20px; }
  .epf-row > div:nth-child(2) { background: #f6f6f6; }
  .epf-row span { font-size: 11px; }
  .epf-row .amt { font-weight: 500; min-width: 90px; text-align: right; }

  .net {
    background: ${NAVY_DARK}; display: flex; justify-content: space-between;
    align-items: center; padding: 10px 20px; border-top: 3px solid ${GOLD};
  }
  .net-lbl { color: #fff; font-size: 13px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
  .net-amt { color: ${GOLD}; font-size: 13px; font-weight: 800; min-width: 100px; text-align: right; }

  .footer { text-align: center; padding: 8px 20px; font-size: 8.5px; color: #999; border-top: 0.5px solid #ddd; }
</style>
</head>
<body>
  <div class="header">
    ${logoBase64
      ? `<img class="logo-img" src="${logoBase64}" alt="Logo"/>`
      : '<div class="logo-circle"><div class="logo-inner"><span class="logo-text">PGWCS</span></div></div>'}
    <div class="hdr-right">
      <div class="co-name">PRESTIGE GLAMOUR WORKING CAPITAL SOLUTIONS</div>
      <div class="co-sub">GROUP OF COMPANY (PRIVATE) LIMITED</div>
      <div class="contact">
        <span>404/A, Galle Road, Maggona</span>
        <span>info@pgwcs.com</span>
        <span>+94 75 169 3138</span>
      </div>
    </div>
  </div>

  <div class="info">
    <div class="info-grid">
      <div class="info-col">
        <div class="info-row"><span class="lbl">Employee ID</span><span class="col">:</span><span class="val">${emp.codeNo}</span></div>
        <div class="info-row"><span class="lbl">Name</span><span class="col">:</span><span class="val">${emp.firstName} ${emp.lastName}</span></div>
        <div class="info-row"><span class="lbl">Designation</span><span class="col">:</span><span class="val">${emp.designation}</span></div>
        <div class="info-row"><span class="lbl">Branch</span><span class="col">:</span><span class="val">${emp.branch}</span></div>
      </div>
      <div class="info-col">
        <div class="info-row"><span class="lbl">Pay Month</span><span class="col">:</span><span class="val">${formatMonth(emp.payMonth)}</span></div>
        ${emp.bankName ? `<div class="info-row"><span class="lbl">Bank</span><span class="col">:</span><span class="val">${emp.bankName}</span></div>` : ''}
        ${emp.bankAccount ? `<div class="info-row"><span class="lbl">Account</span><span class="col">:</span><span class="val">${emp.bankAccount}</span></div>` : ''}
        <div class="info-row"><span class="lbl">Date</span><span class="col">:</span><span class="val">${new Date(emp.createdAt).toLocaleDateString('en-LK')}</span></div>
      </div>
    </div>
  </div>

  <div class="sh"><span>Earnings</span><span>Amount (Rs.)</span></div>
  ${row('Basic Offer', emp.basicSalary)}
  ${row('Vehicle Offer', emp.vehicleAllowance, true)}
  ${row('Fuel Offer', emp.fuelAllowance)}
  ${row('General Offer', emp.generalAllowance, true)}
  ${row('ORC', emp.orc)}
  ${row('Other Offers', emp.otherOffer, true)}
  ${emp.customEarningAmount > 0 ? row(emp.customEarningName || 'Custom Earning', emp.customEarningAmount) : ''}

  <div class="total"><span>Gross Offer</span><span class="amt">${fmt(emp.grossSalary)}</span></div>

  <div class="sh"><span>Deductions</span><span>Amount (Rs.)</span></div>
  ${row('EPF (8%)', emp.epfEmployee)}
  ${row('No Pay', emp.nopayDeduction, true)}
  ${row('Late Comes', emp.lateDeduction)}
  ${row('Welfare', emp.welfare, true)}
  ${emp.customDeductionAmount > 0 ? row(emp.customDeductionName || 'Custom Deduction', emp.customDeductionAmount) : ''}

  <div class="total"><span>Total Deductions</span><span class="amt">${fmt(totalDeductions)}</span></div>

  <div class="net">
    <span class="net-lbl">Net Offer</span>
    <span class="net-amt">${fmt(emp.netSalary)}</span>
  </div>

  <div class="footer">
    This is a computer-generated document. No signature is required.
    &copy; ${new Date().getFullYear()} Prestige Glamour Working Capital Solutions (Pvt) Ltd.
  </div>
</body>
</html>`;
}
