import { useState, useEffect } from 'react';
import { paysheetService } from '../services/paysheetService';
import { userService } from '../services/userService';
import { ROLE_NAME_TO_CODE, ROLE_CODE_TO_NAME } from '../constants/roleSalaries';
import { SALES_CONFIG, NON_TARGET_CONFIG } from '../constants/salaryConfig';
import type { User, MonthlyPaysheet } from '../types';
import { showToast } from './Toast';

interface MonthlyPaysheetFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: MonthlyPaysheet;
  isEditMode?: boolean;
}

const parseFormattedNumber = (value: string): number => {
  const cleaned = value.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

const AMOUNT_FIELDS = ['achieve', 'allowance', 'welfare', 'otherOffer', 'customEarningAmount', 'customDeductionAmount'];

// Role codes grouped for the dropdown
const SALES_ROLE_CODES = Object.keys(SALES_CONFIG);
const NON_TARGET_ROLE_CODES = Object.keys(NON_TARGET_CONFIG);

const errorStyle: React.CSSProperties = { color: 'var(--ruby-500)', fontSize: 12, marginTop: 4 };

export function MonthlyPaysheetForm({
  onSuccess,
  onCancel,
  initialData,
  isEditMode = false,
}: MonthlyPaysheetFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<MonthlyPaysheet>>({
    codeNo: initialData?.codeNo || '',
    payMonth: initialData?.payMonth || new Date().toISOString().slice(0, 7),
    role: initialData?.role || '',
    monthsOfService: initialData?.monthsOfService || 0,
    achieve: initialData?.achieve || 0,
    allowance: initialData?.allowance || 0,
    nopay: initialData?.nopay || 0,
    lateHours: initialData?.lateHours || 0,
    lateMinutes: initialData?.lateMinutes || 0,
    epfAvailability: initialData?.epfAvailability || false,
    etfAvailability: initialData?.etfAvailability || false,
    welfare: initialData?.welfare || 0,
    otherOffer: initialData?.otherOffer || 0,
    customEarningName: initialData?.customEarningName || '',
    customEarningAmount: initialData?.customEarningAmount || 0,
    customDeductionName: initialData?.customDeductionName || '',
    customDeductionAmount: initialData?.customDeductionAmount || 0,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userService.listUsers({ status: 'active', limit: 1000 });
      setUsers(res.users);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load employees', 'error');
    }
  };

  const handleCodeNoChange = (value: string) => {
    setFormData((prev) => ({ ...prev, codeNo: value }));
    const selected = users.find((u) => u.codeNo === value);
    if (selected) {
      const roleName = selected.role || selected.designation;
      const roleCode = ROLE_NAME_TO_CODE[roleName] || roleName;
      setFormData((prev) => ({ ...prev, codeNo: value, role: roleCode }));
      setErrors((prev) => ({ ...prev, codeNo: '', role: '' }));
    } else {
      setFormData((prev) => ({ ...prev, codeNo: value, role: '' }));
    }
  };

  const matchedUser = users.find((u) => u.codeNo === formData.codeNo);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const raw = value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setFormData((prev) => ({
        ...prev,
        [name]: raw === '' ? 0 : raw.endsWith('.') ? raw : parseFormattedNumber(raw),
      }));
    }
  };

  const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const val = formData[name as keyof typeof formData];
    if (typeof val === 'string' && val.endsWith('.')) {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(val) || 0 }));
    }
  };

  const getAmountDisplayValue = (fieldName: string): string => {
    const val = formData[fieldName as keyof typeof formData];
    if (typeof val === 'string') return val;
    if (val === 0 || val === undefined) return '';
    return String(val);
  };

  const validateForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    // Required fields
    if (!formData.codeNo?.trim()) {
      errs.codeNo = 'Code No is required';
    } else if (!users.find((u) => u.codeNo === formData.codeNo)) {
      errs.codeNo = 'Invalid code — no employee found';
    }
    if (!formData.payMonth?.trim()) errs.payMonth = 'Pay month is required';
    if (!formData.role?.trim()) errs.role = 'Role is required';

    // payMonth format
    if (formData.payMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(formData.payMonth)) {
      errs.payMonth = 'Invalid month format (YYYY-MM)';
    }

    // Role must be a valid code
    const allCodes = [...SALES_ROLE_CODES, ...NON_TARGET_ROLE_CODES];
    if (formData.role && !allCodes.includes(formData.role)) {
      errs.role = 'Invalid role selected';
    }

    // monthsOfService
    const mos = Number(formData.monthsOfService);
    if (isNaN(mos) || mos < 0) errs.monthsOfService = 'Must be 0 or greater';
    if (mos % 1 !== 0) errs.monthsOfService = 'Must be a whole number';

    // Amount fields: must be >= 0
    for (const field of AMOUNT_FIELDS) {
      const val = formData[field as keyof typeof formData];
      const num = typeof val === 'string' ? parseFloat(val) : (val as number);
      if (num !== undefined && num !== 0 && (isNaN(num) || num < 0)) {
        errs[field] = 'Must be 0 or a positive number';
      }
    }

    // nopay
    const nopay = Number(formData.nopay);
    if (!isNaN(nopay) && nopay < 0) errs.nopay = 'Cannot be negative';
    if (!isNaN(nopay) && nopay > 31) errs.nopay = 'Cannot exceed 31 days';

    // lateHours
    const lh = Number(formData.lateHours);
    if (!isNaN(lh) && lh < 0) errs.lateHours = 'Cannot be negative';
    if (!isNaN(lh) && lh % 1 !== 0) errs.lateHours = 'Must be a whole number';

    // lateMinutes
    const lm = Number(formData.lateMinutes);
    if (!isNaN(lm) && (lm < 0 || lm > 59)) errs.lateMinutes = 'Must be 0–59';
    if (!isNaN(lm) && lm % 1 !== 0) errs.lateMinutes = 'Must be a whole number';

    // Custom earning: if amount > 0, name is required
    const ceAmt = Number(formData.customEarningAmount) || 0;
    if (ceAmt > 0 && !formData.customEarningName?.trim()) {
      errs.customEarningName = 'Name required when amount is set';
    }

    // Custom deduction: if amount > 0, name is required
    const cdAmt = Number(formData.customDeductionAmount) || 0;
    if (cdAmt > 0 && !formData.customDeductionName?.trim()) {
      errs.customDeductionName = 'Name required when amount is set';
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      showToast('Please fix the errors before submitting', 'error');
      return;
    }

    const submitData = { ...formData };
    AMOUNT_FIELDS.forEach((field) => {
      const val = submitData[field as keyof typeof submitData];
      if (typeof val === 'string') {
        (submitData as Record<string, unknown>)[field] = parseFloat(val) || 0;
      }
    });

    setLoading(true);
    try {
      if (isEditMode && initialData?.id) {
        await paysheetService.updatePaysheet(initialData.id, submitData as Partial<MonthlyPaysheet>);
        showToast('Paysheet updated successfully', 'success');
      } else {
        await paysheetService.createPaysheet(submitData as Omit<MonthlyPaysheet, 'id' | 'createdAt' | 'updatedAt'>);
        showToast('Paysheet created successfully', 'success');
      }
      onSuccess?.();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to save paysheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-row">
        <div className="form-group">
          <label>
            Code No. <span style={{ color: 'var(--ruby-500)' }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            name="codeNo"
            value={formData.codeNo || ''}
            onChange={(e) => handleCodeNoChange(e.target.value)}
            placeholder="Enter employee code"
            required
            disabled={isEditMode}
            list="codeNo-list"
          />
          <datalist id="codeNo-list">
            {users.map((u) => (
              <option key={u.codeNo} value={u.codeNo}>
                {u.firstName} {u.lastName} — {u.role || u.designation}
              </option>
            ))}
          </datalist>
          {matchedUser && (
            <div style={{ fontSize: 12, color: 'var(--gold-400)', marginTop: 4 }}>
              {matchedUser.firstName} {matchedUser.lastName} — {matchedUser.branch}
            </div>
          )}
          {!matchedUser && formData.codeNo && formData.codeNo.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ruby-500)', marginTop: 4 }}>
              No employee found
            </div>
          )}
          {errors.codeNo && <div style={errorStyle}>{errors.codeNo}</div>}
        </div>

        <div className="form-group">
          <label>
            Pay Month <span style={{ color: 'var(--ruby-500)' }}>*</span>
          </label>
          <input
            type="month"
            className="form-input"
            name="payMonth"
            value={formData.payMonth || ''}
            onChange={handleInputChange}
            required
            disabled={isEditMode}
          />
          {errors.payMonth && <div style={errorStyle}>{errors.payMonth}</div>}
        </div>

        <div className="form-group">
          <label>
            Role <span style={{ color: 'var(--ruby-500)' }}>*</span>
          </label>
          <select
            className="form-select"
            name="role"
            value={formData.role || ''}
            onChange={handleInputChange}
            required
            disabled={isEditMode}
          >
            <option value="">Select Role</option>
            <optgroup label="Sales/Target-Based Roles">
              {SALES_ROLE_CODES.map((code) => (
                <option key={code} value={code}>
                  {ROLE_CODE_TO_NAME[code] || code}
                </option>
              ))}
            </optgroup>
            <optgroup label="Non-Target Roles">
              {NON_TARGET_ROLE_CODES.map((code) => (
                <option key={code} value={code}>
                  {ROLE_CODE_TO_NAME[code] || code}
                </option>
              ))}
            </optgroup>
          </select>
          {errors.role && <div style={errorStyle}>{errors.role}</div>}
        </div>

        <div className="form-group">
          <label>
            Months of Service <span style={{ color: 'var(--ruby-500)' }}>*</span>
          </label>
          <input
            type="number"
            inputMode='numeric'
            className="form-input"
            name="monthsOfService"
            value={formData.monthsOfService ?? ''}
            onChange={handleInputChange}
            placeholder="e.g., 6"
            min="0"
            step="1"
            required
          />
          {errors.monthsOfService && <div style={errorStyle}>{errors.monthsOfService}</div>}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--neutral-700)', paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Offer Components
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label>Achievement Amount</label>
            <input
              type="text"
              inputMode='numeric'
              className="form-input"
              name="achieve"
              value={getAmountDisplayValue('achieve')}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              placeholder="0.00"
            />
            {errors.achieve && <div style={errorStyle}>{errors.achieve}</div>}
          </div>

          <div className="form-group">
            <label>Offer</label>
            <input
              type="number"
              inputMode='numeric'
              className="form-input"
              name="allowance"
              value={getAmountDisplayValue('allowance')}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              placeholder="0.00"
            />
            {errors.allowance && <div style={errorStyle}>{errors.allowance}</div>}
          </div>

          <div className="form-group">
            <label>Welfare</label>
            <input
              type="number"
              inputMode='numeric'
              className="form-input"
              name="welfare"
              value={getAmountDisplayValue('welfare')}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              placeholder="0.00"
            />
            {errors.welfare && <div style={errorStyle}>{errors.welfare}</div>}
          </div>

          <div className="form-group">
            <label>Other Offers</label>
            <input
              type="number"
              inputMode='numeric'
              className="form-input"
              name="otherOffer"
              value={getAmountDisplayValue('otherOffer')}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              placeholder="0.00"
            />
            {errors.otherOffer && <div style={errorStyle}>{errors.otherOffer}</div>}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--neutral-700)', paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Deductions
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label>No Pay Days</label>
            <input
              type="number"
              inputMode='numeric'
              className="form-input"
              name="nopay"
              value={formData.nopay ?? ''}
              onChange={handleInputChange}
              placeholder="0"
              step="1"
              min="0"
              max="31"
            />
            {errors.nopay && <div style={errorStyle}>{errors.nopay}</div>}
          </div>

          <div className="form-group">
            <label>Late Hours</label>
            <input
              type="number"
              inputMode='numeric'
              className="form-input"
              name="lateHours"
              value={formData.lateHours ?? ''}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="1"
            />
            {errors.lateHours && <div style={errorStyle}>{errors.lateHours}</div>}
          </div>

          <div className="form-group">
            <label>Late Minutes</label>
            <input
              type="number"
              inputMode='numeric'
              className="form-input"
              name="lateMinutes"
              value={formData.lateMinutes ?? ''}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="1"
            />
            {errors.lateMinutes && <div style={errorStyle}>{errors.lateMinutes}</div>}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--neutral-700)', paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Custom Earnings & Deductions
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label>Custom Earning Name</label>
            <input
              type="text"
              className="form-input"
              name="customEarningName"
              value={formData.customEarningName || ''}
              onChange={handleInputChange}
              placeholder="e.g., Bonus"
            />
            {errors.customEarningName && <div style={errorStyle}>{errors.customEarningName}</div>}
          </div>

          <div className="form-group">
            <label>Custom Earning Amount</label>
            <input
              type="number"
              inputMode='numeric'
              className="form-input"
              name="customEarningAmount"
              value={getAmountDisplayValue('customEarningAmount')}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              placeholder="0.00"
            />
            {errors.customEarningAmount && <div style={errorStyle}>{errors.customEarningAmount}</div>}
          </div>

          <div className="form-group">
            <label>Custom Deduction Name</label>
            <input
              type="text"
              className="form-input"
              name="customDeductionName"
              value={formData.customDeductionName || ''}
              onChange={handleInputChange}
              placeholder="e.g., Loan"
            />
            {errors.customDeductionName && <div style={errorStyle}>{errors.customDeductionName}</div>}
          </div>

          <div className="form-group">
            <label>Custom Deduction Amount</label>
            <input
              type="number"
              inputMode='numeric'
              className="form-input"
              name="customDeductionAmount"
              value={getAmountDisplayValue('customDeductionAmount')}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              placeholder="0.00"
            />
            {errors.customDeductionAmount && <div style={errorStyle}>{errors.customDeductionAmount}</div>}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--neutral-700)', paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Fund Availability
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                name="epfAvailability"
                checked={formData.epfAvailability === true}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData((prev) => ({
                    ...prev,
                    epfAvailability: checked,
                    etfAvailability: checked,
                  }));
                }}
              />
              EPF / ETF
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : isEditMode ? 'Update Paysheet' : 'Create Paysheet'}
        </button>
      </div>
    </form>
  );
}
