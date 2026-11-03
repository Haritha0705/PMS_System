import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiDownload } from 'react-icons/fi';
import api from '../services/api';
import { userService } from '../services/userService';
import { paysheetService } from '../services/paysheetService';
import { showToast } from '../components/Toast';
import EmployeeSelector from '../components/EmployeeSelector';
import PaySheet from '../components/PaySheet';
import type { User, MonthlyPaysheet } from '../types';

export default function PrintPayslips() {
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7));

  // Employee selection state
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [selectedCodeNos, setSelectedCodeNos] = useState<Set<string>>(new Set());

  // Preview state
  const [previewPaysheets, setPreviewPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [fetching, setFetching] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payslips_${payMonth}`,
    pageStyle: '@page { size: A4 portrait; margin: 8mm 10mm; }',
  });

  // Fetch userMap for preview rendering
  useEffect(() => {
    userService
      .listUsers({ status: 'active', limit: 1000 })
      .then((res) => {
        const map = new Map<string, User>();
        res.users.forEach((u) => map.set(u.codeNo, u));
        setUserMap(map);
      })
      .catch(() => {});
  }, []);

  // Load paysheets for the selected employees + month
  const handleFetchPreview = async () => {
    if (!payMonth) return showToast('Please select a period', 'error');

    if (selectedCodeNos.size === 0) {
      setPreviewPaysheets([]);
      return showToast('Please select at least one employee', 'error');
    }

    setFetching(true);
    try {
      const res = await paysheetService.getMonthPaysheets(payMonth, { limit: 10000 });
      let paysheets = res.paysheets.filter((p) => selectedCodeNos.has(p.codeNo));

      // Filter out paysheets with achievedSalary = 0 and warn
      const zeroSalary = paysheets.filter((p) => !p.achievedSalary || p.achievedSalary === 0);
      if (zeroSalary.length > 0) {
        const names = zeroSalary.map((p) => {
          const u = userMap.get(p.codeNo);
          return u ? `${u.firstName} ${u.lastName} (${p.codeNo})` : p.codeNo;
        });
        showToast(
          `Cannot generate payslip for: ${names.join(', ')} — Basic offer is 0.`,
          'error'
        );
        paysheets = paysheets.filter((p) => p.achievedSalary && p.achievedSalary > 0);
      }

      if (paysheets.length === 0) {
        showToast('No valid payslips found for the selected period/employees.', 'error');
      } else {
        showToast(`Loaded ${paysheets.length} payslip(s)`, 'success');
      }

      setPreviewPaysheets(paysheets);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to fetch payslips', 'error');
    } finally {
      setFetching(false);
    }
  };

  // Download a server-rendered PDF for every previewed payslip
  const handleDownloadPdf = async () => {
    if (previewPaysheets.length === 0) return;
    setPdfDownloading(true);
    try {
      for (const ps of previewPaysheets) {
        if (!ps.id) continue;
        const res = await api.get(`/payslips/pdf/${ps.id}`, { responseType: 'arraybuffer' });
        const filename = `PaySlip_${ps.codeNo}_${ps.payMonth}.pdf`;

        const url = window.URL.createObjectURL(
          new Blob([res.data as ArrayBuffer], { type: 'application/pdf' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      showToast(`Downloaded ${previewPaysheets.length} PDF(s)`, 'success');
    } catch {
      showToast('PDF download failed', 'error');
    } finally {
      setPdfDownloading(false);
    }
  };

  const hasPreview = previewPaysheets.length > 0;

  return (
    <div className="animate-in">
      {/* Employee Selection Card */}
      <EmployeeSelector
        selectedCodeNos={selectedCodeNos}
        onSelectionChange={setSelectedCodeNos}
        payMonth={payMonth}
        onPayMonthChange={setPayMonth}
        title="Select Employees for Payslips"
        actionButton={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleFetchPreview}
            disabled={fetching || selectedCodeNos.size === 0}
          >
            {fetching
              ? 'Loading...'
              : `Load Payslips${selectedCodeNos.size > 0 ? ` (${selectedCodeNos.size})` : ''}`}
          </button>
        }
      />

      {/* Preview Section */}
      <div className="card" style={{ marginBottom: 24, minHeight: 200 }}>
        <div
          className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <h2 style={{ margin: 0 }}>Payslip Preview ({previewPaysheets.length})</h2>
          {hasPreview && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={() => handlePrint()}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <FiPrinter size={16} />
                Print / Save as PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleDownloadPdf}
                disabled={pdfDownloading}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <FiDownload size={16} />
                {pdfDownloading ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          )}
        </div>
        <div
          className="card-body"
          style={{
            background: hasPreview ? '#eaeaea' : undefined,
            display: 'flex',
            justifyContent: 'center',
            padding: hasPreview ? 24 : undefined,
          }}
        >
          {!hasPreview ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <p>Select employees and click "Load Payslips" to preview.</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                Paysheets must be created first in the Monthly Paysheets section.
              </p>
            </div>
          ) : (
            <div ref={printRef} className="print-area print-mode-a4">
              {previewPaysheets.map((ps) => (
                <PaySheet
                  key={ps.id || ps.codeNo}
                  paysheet={ps}
                  employee={userMap.get(ps.codeNo) ?? null}
                  size="a4"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h2>How It Works</h2>
        </div>
        <div
          className="card-body"
          style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}
        >
          <ol style={{ paddingLeft: 20 }}>
            <li>Pick the pay month and select one or more employees.</li>
            <li>Click <strong>Load Payslips</strong> to preview the payslips.</li>
            <li>Use <strong>Print / Save as PDF</strong> to open the print dialog (choose "Save as PDF").</li>
            <li>Or use <strong>Download PDF</strong> to download a rendered PDF for each payslip.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
