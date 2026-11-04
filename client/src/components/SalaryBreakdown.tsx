import type { MonthlyPaysheet, User } from '../types';
import { ROLE_CODE_TO_NAME } from '../constants/roleSalaries';
import {
  SALES_CONFIG,
  isSalesRole,
  WORKING_DAYS_PER_MONTH,
  TOTAL_MINUTES_PER_MONTH,
  EPF_EMPLOYEE_RATE,
  EPF_EMPLOYER_RATE,
  ETF_RATE,
} from '../constants/salaryConfig';

// ── Explicit colours — no CSS vars so screen + print both work ──
const C = {
  white:    '#ffffff',
  navy:     '#1a3a5c',
  navyText: '#ffffff',
  body:     '#111111',
  muted:    '#555555',
  border:   '#e0e0e0',
  stripe:   '#f8f8f8',
  thBg:     '#f0f2f5',
  gold:     '#996600',
  goldBg:   '#fff8e1',
  goldBdr:  '#f0c040',
  green:    '#1a6b3a',
  greenBg:  '#edfaf3',
  greenBdr: '#4caf7a',
  red:      '#b22234',
  refBg:    '#f0f4ff',
  refText:  '#2c4fa3',
  refBdr:   '#c5d0f0',
};

// ── Formatting ───────────────────────────────────────────────

function rs(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctStr(p: number): string {
  return `${(p * 100).toFixed(2)}%`;
}

// ── Row type ─────────────────────────────────────────────────

type RowKind = 'input' | 'calc' | 'info' | 'gross' | 'deduction' | 'net' | 'ref' | 'ref-header' | 'spacer';

interface BreakdownRow {
  kind: RowKind;
  step: string;
  formula: string;
  result: string;
}

// ── Build rows ───────────────────────────────────────────────

export function buildBreakdownRows(ps: MonthlyPaysheet): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  const role = ps.role;
  const roleLabel = ROLE_CODE_TO_NAME[role] || role;
  const sales = isSalesRole(role);

  const basic       = ps.basicSalary          ?? 0;
  const achAmt      = ps.achieve               ?? 0;
  const achPct      = ps.achievementPct        ?? 0;
  const nopay       = ps.nopay                 ?? 0;
  const lateHrs     = ps.lateHours             ?? 0;
  const lateMins    = ps.lateMinutes           ?? 0;
  const welfare     = ps.welfare               ?? 0;
  const otherOffer  = ps.otherOffer            ?? 0;
  const custEarnAmt = ps.customEarningAmount   ?? 0;
  const custDedAmt  = ps.customDeductionAmount ?? 0;
  const totalMins   = lateHrs * 60 + lateMins;

  const achieved  = ps.achievedSalary  ?? 0;
  const vehAllow  = ps.vehicleAllowance ?? 0;
  const fuelAllow = ps.fuelAllowance   ?? 0;
  const genAllow  = ps.generalAllowance ?? 0;
  const gross     = ps.grossSalary     ?? 0;
  const nopayDed  = ps.nopayDeduction  ?? 0;
  const lateDed   = ps.lateDeduction   ?? 0;
  const epfEmp    = ps.epfEmployee     ?? 0;
  const epfEmr    = ps.epfEmployer     ?? 0;
  const etf       = ps.etf             ?? 0;
  const net       = ps.netSalary       ?? 0;

  // ── Category A ───────────────────────────────────────────

  if (sales) {
    const cfg = SALES_CONFIG[role];
    const monthTarget   = ps.assignedTarget        ?? 0;
    const prevCarry     = ps.prevCarryForward      ?? 0;
    const carryNext     = ps.carryForward          ?? 0;
    const totalAch      = ps.totalAchieved         ?? 0;
    const remTarget     = ps.remainingTarget       ?? 0;
    const paidCycle     = ps.totalSalaryPaid       ?? 0;
    const remSalary     = ps.remainingSalary       ?? 0;
    const completed     = ps.annualTargetCompleted ?? false;
    const cycleNo       = ps.cycle                 ?? 0;
    const cycleMonth    = ps.cycleMonth            ?? 0;
    const refreshed     = completed || cycleMonth >= 12;

    rows.push({ kind: 'info',  step: 'Category',       formula: 'Category A — Sales / annual-cycle salary system', result: 'Cat A' });
    rows.push({
      kind: 'info', step: 'Annual Cycle',
      formula: cycleNo > 0
        ? `Cycle ${cycleNo}, month ${cycleMonth} of 12${refreshed ? '  — new cycle starts next month' : ''}`
        : 'No cycle data (created before the annual-cycle system)',
      result: cycleNo > 0 ? `${cycleMonth} / 12` : '—',
    });
    rows.push({ kind: 'input', step: 'Monthly Salary', formula: `${roleLabel} — fixed monthly salary (rate for no-pay / late)`, result: rs(basic) });
    rows.push({ kind: 'info',  step: 'Monthly Target', formula: `${roleLabel} standard monthly target`,                          result: rs(cfg.monthlyTarget) });
    rows.push({
      kind: 'input', step: 'Previous Carry Forward',
      formula: prevCarry > 0 ? 'Extra achievement brought from last month' : 'Nothing carried from last month',
      result: rs(prevCarry),
    });
    rows.push({
      kind: 'calc', step: "This Month's Target",
      formula: prevCarry > 0
        ? `${rs(cfg.monthlyTarget)} − ${rs(prevCarry)} carry   (never more than the remaining annual target)`
        : `${rs(cfg.monthlyTarget)}   (never more than the remaining annual target)`,
      result: rs(monthTarget),
    });
    rows.push({ kind: 'input', step: 'Achievement Amount', formula: 'Input — actual sales / collections this month', result: rs(achAmt) });
    rows.push({
      kind: 'calc', step: 'Achievement %',
      formula: monthTarget > 0
        ? `${rs(achAmt)} ÷ ${rs(monthTarget)} × 100   (max 100%)`
        : "This month's target is covered by the carry forward → 100%",
      result: pctStr(achPct),
    });

    let earnedFormula: string;
    if (completed) {
      earnedFormula = 'Annual target completed — remaining annual salary paid';
    } else if (achPct >= 1) {
      earnedFormula = `${rs(basic)} × 100%   (on / over target → full monthly salary)`;
    } else {
      earnedFormula = `${rs(basic)} × ${pctStr(achPct)}   (below target → share of monthly salary)`;
    }
    rows.push({ kind: 'calc', step: 'Salary Earned', formula: earnedFormula, result: rs(achieved) });

    rows.push({ kind: 'info', step: 'Annual Target',        formula: `${roleLabel} — target for the 12-month cycle`,          result: rs(cfg.annualTarget) });
    rows.push({ kind: 'info', step: 'Total Achieved (Cycle)', formula: 'Achievement counted towards the annual target so far', result: rs(totalAch) });
    rows.push({ kind: 'info', step: 'Remaining Target',     formula: `${rs(cfg.annualTarget)} − ${rs(totalAch)}`,            result: rs(remTarget) });
    rows.push({ kind: 'info', step: 'Annual Salary',        formula: `${roleLabel} — salary for the 12-month cycle`,          result: rs(cfg.annualSalary) });
    rows.push({ kind: 'info', step: 'Salary Paid (Cycle)',  formula: 'Salary earned so far in this cycle, including this month', result: rs(paidCycle) });
    rows.push({ kind: 'info', step: 'Remaining Salary',     formula: `${rs(cfg.annualSalary)} − ${rs(paidCycle)}`,           result: rs(remSalary) });
    rows.push({
      kind: 'calc', step: 'Carry Forward to Next Month',
      formula: carryNext > 0
        ? (completed ? 'Achievement above the annual target — moves to the new cycle' : 'Achievement above this month\'s target (+ unused earlier carry)')
        : (refreshed && !completed ? 'Cycle ended without completing the annual target — carry dropped' : 'Nothing to carry'),
      result: rs(carryNext),
    });

    rows.push({
      kind: 'input', step: 'General Allowance',
      formula: genAllow > 0 ? 'Input — additional allowance' : 'No general allowance',
      result: rs(genAllow),
    });
    if (custEarnAmt > 0) {
      rows.push({ kind: 'input', step: ps.customEarningName || 'Custom Earning', formula: 'Input — custom earning entry', result: rs(custEarnAmt) });
    }
    if (otherOffer > 0) {
      rows.push({ kind: 'input', step: 'Other Offer', formula: 'Input — additional pay', result: rs(otherOffer) });
    }

  } else {
    // ── Category B ───────────────────────────────────────────

    rows.push({ kind: 'input', step: 'Basic Salary', formula: `${roleLabel} — fixed basic`,                                         result: rs(basic) });
    rows.push({ kind: 'info',  step: 'Category',     formula: 'Category B — Non-Target role (fixed salary)',                        result: 'Cat B' });
    rows.push({ kind: 'input', step: 'Other Offer',  formula: otherOffer > 0 ? 'Input — additional fixed offer' : 'None this month', result: rs(otherOffer) });

    if (genAllow > 0) {
      rows.push({ kind: 'input', step: 'General Allowance', formula: `${roleLabel} — fixed monthly allowance, always paid in full`, result: rs(genAllow) });
    }
    if (vehAllow > 0) {
      rows.push({ kind: 'input', step: 'Vehicle Allowance', formula: `${roleLabel} — flat monthly allowance, always paid in full`, result: rs(vehAllow) });
    }
    if (fuelAllow > 0) {
      rows.push({ kind: 'input', step: 'Fuel Allowance', formula: `${roleLabel} — flat monthly allowance, always paid in full`, result: rs(fuelAllow) });
    }
    if (custEarnAmt > 0) {
      rows.push({ kind: 'input', step: ps.customEarningName || 'Custom Earning', formula: 'Input — custom earning entry', result: rs(custEarnAmt) });
    }

    const parts: string[] = [`${rs(basic)} (basic)`];
    if (otherOffer > 0)  parts.push(`${rs(otherOffer)} (other offer)`);
    if (genAllow > 0)    parts.push(`${rs(genAllow)} (general allowance)`);
    if (vehAllow > 0)    parts.push(`${rs(vehAllow)} (vehicle allowance)`);
    if (fuelAllow > 0)   parts.push(`${rs(fuelAllow)} (fuel allowance)`);
    if (custEarnAmt > 0) parts.push(`${rs(custEarnAmt)} (${ps.customEarningName || 'custom earning'})`);
    rows.push({ kind: 'calc', step: 'Gross / Achieved Salary', formula: parts.join(' + '), result: rs(achieved) });
  }

  // ── Gross ─────────────────────────────────────────────────
  rows.push({ kind: 'gross', step: 'GROSS SALARY', formula: 'Sum of all earnings above', result: rs(gross) });

  // ── Deductions ────────────────────────────────────────────

  rows.push({
    kind: 'deduction', step: 'No-pay Deduction',
    formula: nopay > 0
      ? `( ${rs(basic)} ÷ ${WORKING_DAYS_PER_MONTH} days ) × ( ${nopay} days − 0.5 grace day )`
      : 'No no-pay days → Rs. 0',
    result: nopayDed > 0 ? `− ${rs(nopayDed)}` : '0.00',
  });

  rows.push({
    kind: 'deduction', step: 'Late Deduction',
    formula: totalMins > 0
      ? `( ${lateHrs}h ${lateMins}m = ${totalMins} min ) × ( ${rs(basic)} ÷ ${TOTAL_MINUTES_PER_MONTH.toLocaleString()} min/month )`
      : 'No late minutes → Rs. 0',
    result: lateDed > 0 ? `− ${rs(lateDed)}` : '0.00',
  });

  // Read from the saved amount so paysheets saved before the fixed values still explain themselves
  const salesFixedValue = sales ? SALES_CONFIG[role].epfFixedValue : 0;
  const epfFixedValue = sales && Math.abs(epfEmp - salesFixedValue * EPF_EMPLOYEE_RATE) < 0.01 ? salesFixedValue : null;

  rows.push({
    kind: 'deduction', step: `EPF — Employee (${(EPF_EMPLOYEE_RATE * 100).toFixed(0)}%)`,
    formula: !ps.epfAvailability
      ? 'EPF not enrolled → Rs. 0'
      : epfFixedValue !== null
        ? `${rs(epfFixedValue)} × ${(EPF_EMPLOYEE_RATE * 100).toFixed(0)}%   (fixed value for the role — achievement 25% or more)`
        : `${sales ? rs(achieved) : rs(basic)} × ${(EPF_EMPLOYEE_RATE * 100).toFixed(0)}%   (calculated on ${sales ? 'salary earned' : 'basic salary only'})`,
    result: epfEmp > 0 ? `− ${rs(epfEmp)}` : '0.00',
  });

  rows.push({
    kind: 'deduction', step: 'Welfare / Others',
    formula: welfare > 0 ? 'Input — welfare / other deduction' : 'None this month → Rs. 0',
    result: welfare > 0 ? `− ${rs(welfare)}` : '0.00',
  });

  if (custDedAmt > 0) {
    rows.push({
      kind: 'deduction', step: ps.customDeductionName || 'Custom Deduction',
      formula: 'Input — custom deduction entry',
      result: `− ${rs(custDedAmt)}`,
    });
  }

  // ── Net ───────────────────────────────────────────────────
  const totalDed = nopayDed + lateDed + epfEmp + welfare + custDedAmt;
  rows.push({
    kind: 'net', step: 'NET SALARY',
    formula: `${rs(gross)} (gross)  −  ${rs(totalDed)} (total deductions)`,
    result: rs(net),
  });

  // ── Company costs ─────────────────────────────────────────
  rows.push({ kind: 'ref-header', step: '', formula: 'COMPANY COSTS — NOT DEDUCTED FROM EMPLOYEE SALARY', result: '' });

  rows.push({
    kind: 'ref', step: `EPF — Employer (${(EPF_EMPLOYER_RATE * 100).toFixed(0)}%)`,
    formula: ps.epfAvailability
      ? `${sales ? rs(achieved) : rs(basic)} × ${(EPF_EMPLOYER_RATE * 100).toFixed(0)}%   (company's EPF contribution — ${sales ? 'salary earned' : 'basic salary only'})`
      : 'EPF not enrolled → Rs. 0',
    result: rs(epfEmr),
  });

  rows.push({
    kind: 'ref', step: `ETF (${(ETF_RATE * 100).toFixed(0)}%)`,
    formula: ps.epfAvailability
      ? `${sales ? rs(achieved) : rs(basic)} × ${(ETF_RATE * 100).toFixed(0)}%   (company's ETF contribution — ${sales ? 'salary earned' : 'basic salary only'})`
      : 'EPF not enrolled → Rs. 0',
    result: rs(etf),
  });

  const totalCompanyCost = gross + epfEmr + etf;
  rows.push({
    kind: 'ref', step: 'Total Company Cost',
    formula: `${rs(gross)} (gross paid)  +  ${rs(epfEmr)} (EPF employer)  +  ${rs(etf)} (ETF)`,
    result: rs(totalCompanyCost),
  });

  return rows;
}

// ── Component ────────────────────────────────────────────────

interface SalaryBreakdownProps {
  paysheet: MonthlyPaysheet;
  employee?: User | null;
}

export function SalaryBreakdown({ paysheet, employee }: SalaryBreakdownProps) {
  const rows = buildBreakdownRows(paysheet);
  const roleLabel = ROLE_CODE_TO_NAME[paysheet.role] || paysheet.role;
  const empName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : paysheet.codeNo;
  const sales = isSalesRole(paysheet.role);
  const generated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const tdBase: React.CSSProperties = {
    padding: '7px 12px',
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
    fontSize: 12.5,
  };

  return (
    <div style={{
      background: C.white,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 28,
      boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: C.body,
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', minHeight: 72 }}>
        {/* Left: Employee info */}
        <div style={{ flex: 1, padding: '14px 18px', background: C.white }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.body, lineHeight: 1.3 }}>
            {empName}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            {paysheet.codeNo}
            {roleLabel && <span> &nbsp;—&nbsp; {roleLabel}</span>}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
            Salary Audit Report &nbsp;·&nbsp; Generated {generated}
          </div>
        </div>

        {/* Right: Pay month badge */}
        <div style={{
          background: C.navy,
          color: C.navyText,
          padding: '14px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
          minWidth: 160,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.02em' }}>
            Pay Month: {paysheet.payMonth}
          </div>
          <div style={{ fontSize: 11, marginTop: 5, opacity: 0.82 }}>
            {sales ? 'Category A — Sales / Target-Based' : 'Category B — Non-Target (Fixed)'}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>

          {/* Column widths */}
          <colgroup>
            <col style={{ width: '26%' }} />
            <col style={{ width: '52%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>

          <thead>
            <tr style={{ background: C.thBg }}>
              <th style={{ ...tdBase, fontWeight: 700, color: C.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left' }}>
                Step
              </th>
              <th style={{ ...tdBase, fontWeight: 700, color: C.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left' }}>
                Input / Calculation
              </th>
              <th style={{ ...tdBase, fontWeight: 700, color: C.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right' }}>
                Result (Rs.)
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => {
              // ── Ref header (company costs divider) ──────────
              if (row.kind === 'ref-header') {
                return (
                  <tr key={i}>
                    <td colSpan={3} style={{
                      ...tdBase,
                      background: '#e8eaf6',
                      color: C.refText,
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      borderTop: `2px solid ${C.refBdr}`,
                      paddingTop: 9,
                      paddingBottom: 9,
                    }}>
                      {row.formula}
                    </td>
                  </tr>
                );
              }

              const isGross = row.kind === 'gross';
              const isNet   = row.kind === 'net';
              const isDed   = row.kind === 'deduction';
              const isRef   = row.kind === 'ref';
              const isInfo  = row.kind === 'info';

              const rowBg = isGross ? C.goldBg
                          : isNet   ? C.greenBg
                          : isRef   ? C.refBg
                          : i % 2 === 0 ? C.white : C.stripe;

              const stepColor = isGross ? C.gold
                              : isNet   ? C.green
                              : isDed   ? C.red
                              : isRef   ? C.refText
                              : isInfo  ? C.muted
                              : C.body;

              const resultColor = isGross ? C.gold
                                : isNet   ? C.green
                                : isDed && row.result !== '0.00' ? C.red
                                : isRef   ? C.refText
                                : C.body;

              const rowBorderTop = isGross
                ? `2px solid ${C.goldBdr}`
                : isNet
                  ? `2px solid ${C.greenBdr}`
                  : `1px solid ${C.border}`;

              return (
                <tr key={i} style={{ background: rowBg, borderTop: rowBorderTop }}>
                  <td style={{
                    ...tdBase,
                    fontWeight: (isGross || isNet) ? 700 : isInfo ? 400 : 500,
                    color: stepColor,
                    fontStyle: isInfo ? 'italic' : undefined,
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    {row.step}
                  </td>
                  <td style={{
                    ...tdBase,
                    color: isRef ? C.refText : C.muted,
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: 11.5,
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    {row.formula}
                  </td>
                  <td style={{
                    ...tdBase,
                    textAlign: 'right',
                    fontWeight: (isGross || isNet) ? 700 : 500,
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: 12.5,
                    color: resultColor,
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    {row.result}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '9px 14px',
        background: C.stripe,
        borderTop: `1px solid ${C.border}`,
        fontSize: 10.5,
        color: '#888',
        fontStyle: 'italic',
      }}>
        This report is system generated for internal audit purposes and reflects the calculation logic applied for the stated pay month.
      </div>
    </div>
  );
}
