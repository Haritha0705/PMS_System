import type { CSSProperties } from 'react';
import type { MonthlyPaysheet, User } from '../types';
import { formatCurrency, formatMonth } from '../utils/format';

export type PaySheetSize = 'a5' | 'a4' | '2up';

interface PaySheetProps {
  paysheet: MonthlyPaysheet;
  employee?: User | null;
  size?: PaySheetSize;
}

export default function PaySheet({ paysheet, employee, size = 'a5' }: PaySheetProps) {
  // a5 = 420×595px, a4 = 595×842px, 2up = 561×794px (fills 148.5×210mm print slot)
  const scale = size === 'a4' ? 1.42 : size === '2up' ? 1.335 : 1;
  const earnings = {
    basicSalary: paysheet.achievedSalary || 0,
    vehicleAllowance: paysheet.vehicleAllowance || 0,
    fuelAllowance: paysheet.fuelAllowance || 0,
    orc: paysheet.orc || 0,
    otherOffers: paysheet.otherOffer || 0,
    generalAllowance: paysheet.generalAllowance || 0,
    customEarning: paysheet.customEarningAmount || 0,
  };

  const customEarningLabel = paysheet.customEarningName || 'Custom Earning';
  const customDeductionLabel = paysheet.customDeductionName || 'Custom Deduction';

  const deductions = {
    epf8: paysheet.epfEmployee || 0,
    noPay: paysheet.nopayDeduction || 0,
    lateComes: paysheet.lateDeduction || 0,
    welfare: paysheet.welfare || 0,
    customDeduction: paysheet.customDeductionAmount || 0,
  };

  const grossSalary = paysheet.grossSalary || (
    earnings.basicSalary +
    earnings.vehicleAllowance +
    earnings.fuelAllowance +
    earnings.orc +
    earnings.otherOffers +
    earnings.generalAllowance +
    earnings.customEarning
  );

  const totalDeductions =
    deductions.epf8 +
    deductions.noPay +
    deductions.lateComes +
    deductions.welfare +
    deductions.customDeduction;

  const netSalary = paysheet.netSalary || (grossSalary - totalDeductions);

  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : paysheet.codeNo;

  const designation = employee?.designation || paysheet.role;
  const branch = employee?.branch || '';

  const px = (base: number) => base * scale;
  const fs = (base: number) => base * scale;

  // Dynamic styles based on size
  const ds: Record<string, CSSProperties> = {
    page: {
      ...s.page,
      width: size === 'a4' ? 595 : size === '2up' ? 561 : 420,
      minHeight: size === 'a4' ? 842 : size === '2up' ? 794 : 595,
      fontSize: fs(9),
    },
    header: { ...s.header, padding: `${px(8)}px ${px(12)}px`, gap: px(10) },
    logoCircle: { ...s.logoCircle, width: px(40), height: px(40) },
    logoInner: { ...s.logoInner, width: px(30), height: px(30) },
    logoText: { ...s.logoText, fontSize: fs(7) },
    companyName: { ...s.companyName, fontSize: fs(9.5) },
    companySub: { ...s.companySub, fontSize: fs(8) },
    contactText: { ...s.contactText, fontSize: fs(7) },
    infoSection: { ...s.infoSection, padding: `${px(6)}px ${px(12)}px` },
    infoLabel: { ...s.infoLabel, fontSize: fs(8), minWidth: px(62) },
    infoColon: { ...s.infoColon, fontSize: fs(8) },
    infoValue: { ...s.infoValue, fontSize: fs(8) },
    infoRow: { ...s.infoRow, padding: `${px(2)}px 0`, gap: px(4) },
    sectionHeader: { ...s.sectionHeader, padding: `${px(4)}px ${px(12)}px` },
    sectionHeaderText: { ...s.sectionHeaderText, fontSize: fs(8) },
    dataRow: { ...s.dataRow, padding: `${px(3)}px ${px(12)}px` },
    rowLabel: { ...s.rowLabel, fontSize: fs(8.5) },
    rowAmt: { ...s.rowAmt, fontSize: fs(8.5), minWidth: px(80) },
    totalRow: { ...s.totalRow, padding: `${px(4)}px ${px(12)}px` },
    totalLabel: { ...s.totalLabel, fontSize: fs(9) },
    totalAmt: { ...s.totalAmt, fontSize: fs(9), minWidth: px(80) },
    netRow: { ...s.netRow, padding: `${px(6)}px ${px(12)}px` },
    netLabel: { ...s.netLabel, fontSize: fs(10) },
    netAmount: { ...s.netAmount, fontSize: fs(10), minWidth: px(80) },
    footer: { ...s.footer, fontSize: fs(6.5), padding: `${px(5)}px ${px(12)}px` },
  };

  return (
    <div style={ds.page}>
      {/* ── HEADER ── */}
      <div style={ds.header}>
        <div style={s.logoWrap}>
          <img
            src="/icon.png"
            alt="Logo"
            style={{ width: px(40), height: px(40), borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>
        <div style={s.headerRight}>
          <div style={ds.companyName}>PRESTIGE GLAMOUR WORKING CAPITAL SOLUTIONS</div>
          <div style={ds.companySub}>GROUP OF COMPANY (PRIVATE) LIMITED</div>
          <div style={s.contactRow}>
            <span style={ds.contactText}>404/A, Galle Road, Maggona, Sri Lanka</span>
            <span style={ds.contactText}>www.pgwcs.com</span>
            <span style={ds.contactText}>+94 75 169 3138</span>
          </div>
        </div>
      </div>

      {/* ── EMPLOYEE INFO ── */}
      <div style={ds.infoSection}>
        <div style={s.infoGrid}>
          <div style={s.infoCol}>
            <InfoRow label="Employee ID" value={paysheet.codeNo} ds={ds} />
            <InfoRow label="Name" value={employeeName} ds={ds} />
            <InfoRow label="Designation" value={designation} ds={ds} />
            <InfoRow label="Branch" value={branch} ds={ds} />
          </div>
          <div style={s.infoCol}>
            <InfoRow label="Pay Month" value={formatMonth(paysheet.payMonth)} ds={ds} />
            {employee?.bankName && <InfoRow label="Bank" value={employee.bankName} ds={ds} />}
            {employee?.bankAccount && <InfoRow label="Account" value={employee.bankAccount} ds={ds} />}
            <InfoRow
              label="Date"
              value={
                paysheet.createdAt
                  ? new Date(paysheet.createdAt).toLocaleDateString('en-LK')
                  : new Date().toLocaleDateString('en-LK')
              }
              ds={ds}
            />
          </div>
        </div>
      </div>

      {/* ── EARNINGS ── */}
      <SectionHdr left="EARNINGS" right="AMOUNT (Rs.)" ds={ds} />
      <DataItem label="Basic Offers" amount={earnings.basicSalary} ds={ds} />
      {earnings.vehicleAllowance > 0 && (
        <DataItem label="Vehicle Offer" amount={earnings.vehicleAllowance} ds={ds} alt />
      )}
      {earnings.fuelAllowance > 0 && (
        <DataItem label="Fuel Offer" amount={earnings.fuelAllowance} ds={ds} />
      )}
      {earnings.generalAllowance > 0 && (
        <DataItem label="General Offer" amount={earnings.generalAllowance} ds={ds} alt />
      )}
      {earnings.orc > 0 && <DataItem label="ORC" amount={earnings.orc} ds={ds} />}
      {earnings.otherOffers > 0 && (
        <DataItem label="Other OFFERS" amount={earnings.otherOffers} ds={ds} alt />
      )}
      {earnings.customEarning > 0 && (
        <DataItem label={customEarningLabel} amount={earnings.customEarning} ds={ds} />
      )}

      {/* ── GROSS SALARY ── */}
      <TotalItem label="GROSS OFFERS" amount={grossSalary} ds={ds} />

      {/* ── DEDUCTIONS ── */}
      <SectionHdr left="DEDUCTIONS" right="AMOUNT (Rs.)" ds={ds} />
      {deductions.epf8 > 0 && <DataItem label="EPF (8%)" amount={deductions.epf8} ds={ds} />}
      <DataItem label="No Pay" amount={deductions.noPay} ds={ds} alt />
      <DataItem label="Late Comes" amount={deductions.lateComes} ds={ds} />
      <DataItem label="Welfare" amount={deductions.welfare} ds={ds} alt />
      {deductions.customDeduction > 0 && (
        <DataItem label={customDeductionLabel} amount={deductions.customDeduction} ds={ds} />
      )}

      {/* ── TOTAL DEDUCTIONS ── */}
      <TotalItem label="TOTAL DEDUCTIONS" amount={totalDeductions} ds={ds} />

      {/* ── NET SALARY ── */}
      <div style={ds.netRow}>
        <span style={ds.netLabel}>NET OFFERS</span>
        <span style={ds.netAmount}>{formatCurrency(netSalary)}</span>
      </div>

      {/* ── FOOTER ── */}
      <div style={ds.footer}>
        This is a computer-generated document. No signature is required.
      </div>
    </div>
  );
}

/* ── Small sub-components ── */

function InfoRow({ label, value, ds }: { label: string; value: string; ds: Record<string, CSSProperties> }) {
  return (
    <div style={ds.infoRow}>
      <span style={ds.infoLabel}>{label}</span>
      <span style={ds.infoColon}>:</span>
      <span style={ds.infoValue}>{value}</span>
    </div>
  );
}

function SectionHdr({ left, right, ds }: { left: string; right: string; ds: Record<string, CSSProperties> }) {
  return (
    <div style={ds.sectionHeader}>
      <span style={ds.sectionHeaderText}>{left}</span>
      <span style={ds.sectionHeaderText}>{right}</span>
    </div>
  );
}

function DataItem({ label, amount, alt, ds }: { label: string; amount: number; alt?: boolean; ds: Record<string, CSSProperties> }) {
  return (
    <div style={{ ...ds.dataRow, ...(alt ? s.altBg : {}) }}>
      <span style={ds.rowLabel}>{label}</span>
      <span style={ds.rowAmt}>{formatCurrency(amount)}</span>
    </div>
  );
}

function TotalItem({ label, amount, ds }: { label: string; amount: number; ds: Record<string, CSSProperties> }) {
  return (
    <div style={ds.totalRow}>
      <span style={ds.totalLabel}>{label}</span>
      <span style={ds.totalAmt}>{formatCurrency(amount)}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STYLES — designed for A5 (148 × 210 mm ≈ 420 × 595 px)
   ══════════════════════════════════════════════════════════════ */

const NAVY = '#1b1464';
const NAVY_DARK = '#111052';
const GOLD = '#c8a415';
const BORDER = '#ddd';
const ALT = '#f6f6f6';

const s: Record<string, CSSProperties> = {
  /* ── Page container ── */
  page: {
    width: 420,
    minHeight: 595,
    background: '#fff',
    margin: '0 auto',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontSize: 9,
    color: '#333',
    boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  } as CSSProperties,

  /* ── Header ── */
  header: {
    background: NAVY,
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    gap: 10,
  },
  logoWrap: {
    flexShrink: 0,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${GOLD} 0%, #e8c930 40%, #a08510 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${GOLD}`,
  },
  logoInner: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: NAVY_DARK,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${GOLD}`,
  },
  logoText: {
    color: GOLD,
    fontSize: 7,
    fontWeight: 800,
    letterSpacing: 1,
    fontFamily: 'Georgia, serif',
  },
  headerRight: {
    flex: 1,
  },
  companyName: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.5,
    lineHeight: 1.2,
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  companySub: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 600,
    margin: '1px 0 4px 0',
    letterSpacing: 0.4,
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  contactRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  contactText: {
    color: '#ccc',
    fontSize: 7,
    lineHeight: 1.3,
  },

  /* ── Employee info ── */
  infoSection: {
    padding: '6px 12px',
    borderBottom: `1.5px solid ${BORDER}`,
  },
  infoGrid: {
    display: 'flex',
    gap: 8,
  },
  infoCol: {
    flex: 1,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '2px 0',
    gap: 4,
  },
  infoLabel: {
    fontWeight: 600,
    fontSize: 8,
    color: '#222',
    minWidth: 62,
  },
  infoColon: {
    fontWeight: 600,
    color: '#222',
    fontSize: 8,
  },
  infoValue: {
    fontSize: 8,
    color: '#444',
  },

  /* ── Section header (Earnings / Deductions) ── */
  sectionHeader: {
    background: NAVY,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 12px',
  },
  sectionHeaderText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },

  /* ── Data rows ── */
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 12px',
    borderBottom: `0.5px solid ${BORDER}`,
  },
  altBg: {
    background: ALT,
  },
  rowLabel: {
    fontSize: 8.5,
    color: '#333',
  },
  rowAmt: {
    fontSize: 8.5,
    color: '#333',
    fontWeight: 500,
    minWidth: 80,
    textAlign: 'right' as const,
  },

  /* ── Total rows (Gross / Total Deductions) ── */
  totalRow: {
    background: NAVY,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 12px',
  },
  totalLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  totalAmt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    minWidth: 80,
    textAlign: 'right' as const,
  },

  /* ── Net offer ── */
  netRow: {
    background: NAVY_DARK,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    borderTop: `2px solid ${GOLD}`,
  },
  netLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  netAmount: {
    color: GOLD,
    fontSize: 10,
    fontWeight: 800,
    minWidth: 80,
    textAlign: 'right' as const,
  },

  /* ── Footer ── */
  footer: {
    textAlign: 'center' as const,
    padding: '5px 12px',
    fontSize: 6.5,
    color: '#999',
    borderTop: `0.5px solid ${BORDER}`,
  },
};


