import { useState, useEffect, useRef, useCallback } from 'react';
import { currentMonth } from '../utils/format';
import { FiPrinter, FiDownload, FiCheckCircle, FiAlertCircle, FiFileText, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { paysheetService } from '../services/paysheetService';
import { userService } from '../services/userService';
import type { User, MonthlyPaysheet } from '../types';
import { showToast } from '../components/Toast';
import PaySheet from '../components/PaySheet';
import EmployeeSelector from '../components/EmployeeSelector';
import { SalaryBreakdown } from '../components/SalaryBreakdown';
import api from '../services/api';
import { BRANCHES } from "../constants/branches.ts";
import { formatCurrency } from "../utils/format.ts";

// ── Bulk PDF job progress type ──────────────────────────────

interface JobProgress {
  id: string;
  status: 'pending' | 'processing' | 'zipping' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
  progress: number;
  error: string | null;
}

// ── Main Component ──────────────────────────────────────────

export default function Payroll() {
  const [activeTab, setActiveTab] = useState<'generate' | 'bulk-pdf' | 'history' | 'audit'>('generate');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ── Generate & Preview state ──────────────────────────────
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [selectedCodeNos, setSelectedCodeNos] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState(currentMonth());
  const [previewPaysheets, setPreviewPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [fetching, setFetching] = useState(false);
  const [printMode, setPrintMode] = useState<'a4' | '2up'>('a4');
  const [missingEmployees, setMissingEmployees] = useState<string[]>([]);

  // ── History state ─────────────────────────────────────────
  const [historyPaysheets, setHistoryPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  // ── Bulk PDF state ────────────────────────────────────────
  const [pdfMonth, setPdfMonth] = useState(currentMonth());
  const [concurrency, setConcurrency] = useState(5);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [job, setJob] = useState<JobProgress | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfPrinting, setPdfPrinting] = useState(false);
  const [jsonExporting, setJsonExporting] = useState(false);
  const [pdfPrinterName, setPdfPrinterName] = useState('');
  const [pdfCopies, setPdfCopies] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Salary Audit tab state ────────────────────────────────
  const [auditPeriod, setAuditPeriod] = useState(currentMonth());
  const [auditSelectedCodeNos, setAuditSelectedCodeNos] = useState<Set<string>>(new Set());
  const [auditPaysheets, setAuditPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [auditFetching, setAuditFetching] = useState(false);
  const auditPrintRef = useRef<HTMLDivElement>(null);
  const handleAuditPrint = useReactToPrint({
    contentRef: auditPrintRef,
    documentTitle: `SalaryAudit_${auditPeriod}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm 12mm; }
      body * { visibility: visible !important; }
      body { background: #fff !important; }
      :root {
        --border: #cccccc;
        --bg-secondary: #f5f5f5;
        --bg-tertiary: #ebebeb;
        --text-primary: #111111;
        --text-secondary: #333333;
        --text-muted: #666666;
        --gold-400: #B8860B;
        --gold-600: #8B6508;
        --success: #1A8754;
        --error: #B22234;
      }
    `,
  });

  // ── Branch Print state ────────────────────────────────────
  const [branchPrintMonth, setBranchPrintMonth] = useState(currentMonth());
  const [branchPrintBranch, setBranchPrintBranch] = useState('');
  const [branchPrintPaysheets, setBranchPrintPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [branchPrintLoading, setBranchPrintLoading] = useState(false);
  const branchPrintRef = useRef<HTMLDivElement>(null);
  const handleBranchPrint = useReactToPrint({
    contentRef: branchPrintRef,
    documentTitle: `PaySlips_${branchPrintBranch}_${branchPrintMonth}`,
    pageStyle: '@page { size: A4 portrait; margin: 8mm 10mm; }',
  });

  // ── Preview PDF download state ─────────────────────────────
  const [previewPdfDownloading, setPreviewPdfDownloading] = useState(false);

  // ── Print ref ─────────────────────────────────────────────
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payroll_${period}`,
    pageStyle: '@page { size: A4 portrait; margin: 8mm 10mm; }',
  });

  // ── Data fetching ─────────────────────────────────────────

  // Fetch a full user map for preview rendering (names, details)
  useEffect(() => {
    userService.listUsers({ status: 'active', limit: 1000 }).then((res) => {
      const map = new Map<string, User>();
      res.users.forEach((u) => map.set(u.codeNo, u));
      setUserMap(map);
    }).catch(() => { });
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await paysheetService.listPaysheets({ limit: 10000 });
      setHistoryPaysheets(res.paysheets);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load paysheet history', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch history when history tab is active and refreshTrigger changes
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'generate') {
      // Refresh user map when on generate tab
      userService.listUsers({ status: 'active', limit: 1000 }).then((res) => {
        const map = new Map<string, User>();
        res.users.forEach((u) => map.set(u.codeNo, u));
        setUserMap(map);
      }).catch(() => { });
    }
  }, [activeTab, refreshTrigger]);

  // Clear preview when pay month changes so stale data is not shown
  useEffect(() => {
    setPreviewPaysheets([]);
    setMissingEmployees([]);
  }, [period]);

  // Initial load of history data on component mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // ── Fetch paysheets for preview ───────────────────────────

  const handleFetchPreview = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!period) return showToast('Please select a period', 'error');

    setFetching(true);
    setMissingEmployees([]);
    try {
      let res = await paysheetService.getMonthPaysheets(period, { limit: 10000 });
      let paysheets = res.paysheets;

      // Filter by selected employees if any
      if (selectedCodeNos.size > 0) {
        paysheets = paysheets.filter((p) => selectedCodeNos.has(p.codeNo));

        // Find which selected employees have no paysheet
        const foundCodes = new Set(paysheets.map((p) => p.codeNo));
        const missingCodes = [...selectedCodeNos].filter((c) => !foundCodes.has(c));

        // Auto-create basic paysheets for missing employees
        if (missingCodes.length > 0) {
          try {
            const bulkRes = await api.post<{ created: number; errors: string[] }>('/paysheets/bulk-create', {
              codeNos: missingCodes,
              payMonth: period,
            });
            if (bulkRes.data.created > 0) {
              showToast(`Auto-created ${bulkRes.data.created} basic paysheet(s) for missing employees`, 'info');
              // Re-fetch to include newly created
              res = await paysheetService.getMonthPaysheets(period, { limit: 10000 });
              paysheets = res.paysheets.filter((p) => selectedCodeNos.has(p.codeNo));
            }
            if (bulkRes.data.errors.length > 0) {
              const failedNames = bulkRes.data.errors.map((err) => {
                const match = err.match(/:\s*(.+)/);
                return match ? match[1] : err;
              });
              setMissingEmployees(failedNames);
            }
          } catch {
            // If bulk-create fails, just show what we have
            const missingNames = missingCodes.map((c) => {
              const u = userMap.get(c);
              return u ? `${u.firstName} ${u.lastName} (${c})` : c;
            });
            setMissingEmployees(missingNames);
          }
        }
      }

      // Filter out paysheets with achievedSalary = 0 and warn
      const zeroSalary = paysheets.filter((p) => !p.achievedSalary || p.achievedSalary === 0);
      if (zeroSalary.length > 0) {
        const names = zeroSalary.map((p) => {
          const u = userMap.get(p.codeNo);
          return u ? `${u.firstName} ${u.lastName} (${p.codeNo})` : p.codeNo;
        });
        showToast(
          `Cannot generate paysheet for: ${names.join(', ')} — Basic offer is 0.`,
          'error'
        );
        paysheets = paysheets.filter((p) => p.achievedSalary && p.achievedSalary > 0);
      }

      if (paysheets.length === 0) {
        showToast('No valid paysheets found for the selected period/employees.', 'error');
      } else {
        showToast(`Loaded ${paysheets.length} paysheet(s)`, 'success');
      }

      setPreviewPaysheets(paysheets);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to fetch paysheets', 'error');
    } finally {
      setFetching(false);
    }
  };

  // ── Download preview paysheets as PDF ─────────────────────

  const handlePreviewPdfDownload = async () => {
    if (previewPaysheets.length === 0) return;
    setPreviewPdfDownloading(true);

    try {
      if (previewPaysheets.length === 1 && previewPaysheets[0].id) {
        // Single paysheet — use the single PDF endpoint
        const res = await api.get(`/payslips/pdf/${previewPaysheets[0].id}`, { responseType: 'arraybuffer' });
        const ps = previewPaysheets[0];
        const filename = `PaySlip_${ps.codeNo}_${ps.payMonth}.pdf`;

        const url = window.URL.createObjectURL(new Blob([res.data as ArrayBuffer], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        showToast('PDF download started', 'success');
      } else {
        // Multiple paysheets — use bulk generation for selected code numbers
        const codeNos = previewPaysheets.map((p) => p.codeNo);
        const res = await api.post<{ jobId: string; total: number; skipped: string[] }>('/payslips/generate', {
          payMonth: period,
          codeNos,
          concurrency: 5,
        });

        if (res.data.skipped.length > 0) {
          showToast(`Skipped (basic offer is 0): ${res.data.skipped.join(', ')}`, 'error');
        }
        showToast(`Generating ${res.data.total} PDFs... Go to "Bulk PDF Export" tab to download when ready.`, 'info');
        setJob({
          id: res.data.jobId,
          status: 'processing',
          total: res.data.total,
          completed: 0,
          failed: 0,
          progress: 0,
          error: null,
        });
        setPdfMonth(period);
        setActiveTab('bulk-pdf');
        pollProgress(res.data.jobId);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'PDF download failed', 'error');
    } finally {
      setPreviewPdfDownloading(false);
    }
  };

  const viewPaysheet = (paysheet: MonthlyPaysheet) => {
    setPreviewPaysheets([paysheet]);
    setActiveTab('generate');
  };

  // ── Bulk PDF polling ──────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  const pollProgress = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get<JobProgress>(`/payslips/progress/${jobId}`);
          setJob(res.data);

          if (res.data.status === 'completed' || res.data.status === 'failed') {
            stopPolling();
            setPdfGenerating(false);

            if (res.data.status === 'completed') {
              if (res.data.failed > 0) {
                showToast(`Generated ${res.data.completed} PDF payslips, but ${res.data.failed} failed`, 'error');
              } else {
                showToast(`Generated ${res.data.completed} PDF payslips successfully!`, 'success');
              }
            } else {
              showToast(res.data.error || 'Generation failed', 'error');
            }
          }
        } catch {
          stopPolling();
          setPdfGenerating(false);
        }
      }, 800);
    },
    [stopPolling]
  );

  const handleBulkPdfGenerate = async () => {
    if (!pdfMonth) {
      showToast('Please select a pay month', 'error');
      return;
    }

    setPdfGenerating(true);
    setJob(null);

    try {
      const res = await api.post<{ jobId: string; total: number; skipped: string[] }>('/payslips/generate', {
        payMonth: pdfMonth,
        concurrency,
      });

      if (res.data.skipped.length > 0) {
        showToast(
          `Skipped (basic offer is 0): ${res.data.skipped.join(', ')}`,
          'error'
        );
      }
      showToast(`Started PDF generation for ${res.data.total} payslips`, 'info');
      setJob({
        id: res.data.jobId,
        status: 'processing',
        total: res.data.total,
        completed: 0,
        failed: 0,
        progress: 0,
        error: null,
      });

      pollProgress(res.data.jobId);
    } catch (err: unknown) {
      setPdfGenerating(false);
      showToast(err instanceof Error ? err.message : 'Failed to start generation', 'error');
    }
  };

  const handleDownloadZip = async () => {
    if (!job?.id) return;

    setDownloading(true);
    try {
      const res = await api.get(`/payslips/download/${job.id}`, { responseType: 'arraybuffer' });
      const url = window.URL.createObjectURL(new Blob([res.data as ArrayBuffer]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslips_${pdfMonth}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Download started', 'success');
    } catch {
      showToast('Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintPdfs = async () => {
    if (!job?.id) return;

    setPdfPrinting(true);
    try {
      const res = await api.post<{ message: string }>('/payslips/print', {
        jobId: job.id,
        printerName: pdfPrinterName || undefined,
        copies: pdfCopies,
      });
      showToast(res.data.message, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Print failed', 'error');
    } finally {
      setPdfPrinting(false);
    }
  };

  // ── JSON Export (ZIP of individual JSON files) ────────────

  const handleJsonExport = async () => {
    if (!pdfMonth) {
      showToast('Please select a pay month', 'error');
      return;
    }

    setJsonExporting(true);
    try {
      const res = await api.get(`/export/paysheets-json`, {
        params: { payMonth: pdfMonth },
        responseType: 'arraybuffer',
      });

      // Show skipped paysheets notification
      const skippedNames = res.headers['x-skipped-names'];
      if (skippedNames) {
        showToast(
          `Skipped (basic offer is 0): ${decodeURIComponent(skippedNames)}`,
          'error'
        );
      }

      const url = window.URL.createObjectURL(new Blob([res.data as ArrayBuffer]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `paysheets_json_${pdfMonth}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('JSON export download started', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'JSON export failed', 'error');
    } finally {
      setJsonExporting(false);
    }
  };

  // ── Salary Audit: clear results when period changes ──────────

  useEffect(() => {
    setAuditPaysheets([]);
  }, [auditPeriod]);

  // ── Fetch paysheets for salary audit ──────────────────────

  const handleFetchAudit = async () => {
    if (!auditPeriod) return showToast('Please select a pay month', 'error');
    setAuditFetching(true);
    try {
      const res = await paysheetService.getMonthPaysheets(auditPeriod, { limit: 10000 });
      let paysheets = res.paysheets;
      if (auditSelectedCodeNos.size > 0) {
        paysheets = paysheets.filter((p) => auditSelectedCodeNos.has(p.codeNo));
      }
      if (paysheets.length === 0) {
        showToast('No paysheets found for the selected period/employees.', 'error');
      } else {
        showToast(`Loaded ${paysheets.length} paysheet(s)`, 'success');
      }
      setAuditPaysheets(paysheets);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to fetch paysheets', 'error');
    } finally {
      setAuditFetching(false);
    }
  };

  // ── Fetch paysheets for branch print ─────────────────────

  const handleFetchBranchPrint = async () => {
    if (!branchPrintMonth) return showToast('Please select a pay month', 'error');
    if (!branchPrintBranch) return showToast('Please select a branch', 'error');
    setBranchPrintLoading(true);
    try {
      const res = await paysheetService.getMonthPaysheets(branchPrintMonth, { limit: 10000 });
      const paysheets = res.paysheets.filter((ps) => {
        const user = userMap.get(ps.codeNo);
        return (
          user?.branch?.toLowerCase() === branchPrintBranch.toLowerCase() &&
          ps.achievedSalary && ps.achievedSalary > 0
        );
      });
      if (paysheets.length === 0) {
        showToast(`No paysheets found for ${branchPrintBranch} in ${branchPrintMonth}`, 'error');
      } else {
        showToast(`Loaded ${paysheets.length} paysheet(s) for ${branchPrintBranch}`, 'success');
      }
      setBranchPrintPaysheets(paysheets);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to fetch paysheets', 'error');
    } finally {
      setBranchPrintLoading(false);
    }
  };

  // ── Filter history ────────────────────────────────────────

  const filteredHistory = historyPaysheets.filter((ps) => {
    const user = userMap.get(ps.codeNo);
    const name = user ? `${user.firstName} ${user.lastName}` : ps.codeNo;
    const branch = user?.branch || '';
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      name.toLowerCase().includes(searchLower) ||
      ps.codeNo.toLowerCase().includes(searchLower) ||
      ps.role.toLowerCase().includes(searchLower);
    const matchesPeriod = !filterPeriod || ps.payMonth?.toString().trim() === filterPeriod.toString().trim();
    const matchesBranch = !filterBranch || branch.toLowerCase() === filterBranch.toLowerCase();
    return matchesSearch && matchesPeriod && matchesBranch;
  });

  const uniquePeriods = Array.from(new Set(historyPaysheets.map((p) => p.payMonth).filter(Boolean))).sort().reverse();

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Queued...';
      case 'processing': return 'Generating PDFs...';
      case 'zipping': return 'Creating ZIP archive...';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="animate-in">
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          ['generate', 'Preview & Print'],
          ['bulk-pdf', 'Bulk Print & Export'],
          ['history', 'History & Reports'],
          ['audit', 'Salary Audit'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            className={`btn ${activeTab === key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab(key);
              if (key === 'history') {
                setRefreshTrigger((prev) => prev + 1);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB 1: Preview & Print ═══════════════ */}
      {activeTab === 'generate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Employee Selection Card */}
          <EmployeeSelector
            key={refreshTrigger}
            selectedCodeNos={selectedCodeNos}
            onSelectionChange={setSelectedCodeNos}
            payMonth={period}
            onPayMonthChange={setPeriod}
            title="Select Employees"
            actionButton={
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleFetchPreview}
                  disabled={fetching}
                >
                  {fetching
                    ? 'Loading...'
                    : `Load Pay Sheets${selectedCodeNos.size > 0 ? ` (${selectedCodeNos.size})` : ''}`}
                </button>
              </div>
            }
          />

          {/* Preview & Print */}
          <div className="card" style={{ minHeight: 400 }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <h2>
                Preview ({previewPaysheets.length})
                {selectedCodeNos.size > 0 && previewPaysheets.length > 0 && previewPaysheets.length < selectedCodeNos.size && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                    of {selectedCodeNos.size} selected
                  </span>
                )}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                {/* Print mode toggle */}
                {previewPaysheets.length > 0 && (
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <button
                      className={`btn btn-sm ${printMode === 'a4' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPrintMode('a4')}
                      style={{ borderRadius: 0, fontSize: 12, padding: '6px 12px' }}
                    >
                      A4 (1/page)
                    </button>
                    <button
                      className={`btn btn-sm ${printMode === '2up' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPrintMode('2up')}
                      style={{ borderRadius: 0, fontSize: 12, padding: '6px 12px' }}
                    >
                      A4 (2/page)
                    </button>
                  </div>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleFetchPreview}
                  disabled={fetching}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <FiRefreshCw size={14} />
                  Refresh
                </button>
                {previewPaysheets.length > 0 && (
                  <>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handlePreviewPdfDownload}
                      disabled={previewPdfDownloading}
                    >
                      <FiDownload size={14} style={{ marginRight: 6 }} />
                      {previewPdfDownloading ? 'Generating...' : 'Download PDF'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handlePrint()}>
                      <FiPrinter size={14} style={{ marginRight: 6 }} />
                      Print
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Warning banner for missing paysheets */}
            {missingEmployees.length > 0 && (
              <div className="no-print" style={{
                padding: '12px 16px',
                background: 'rgba(212, 160, 23, 0.12)',
                borderBottom: '1px solid rgba(212, 160, 23, 0.3)',
                color: 'var(--gold-400, #d4a017)',
                fontSize: 13,
              }}>
                <strong>Missing paysheets ({missingEmployees.length}):</strong>{' '}
                {missingEmployees.join(', ')}.
                <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                  Create paysheets for these employees in Monthly Paysheets first.
                </span>
              </div>
            )}
            <div className="card-body">
              {previewPaysheets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <p>Select employees and click "Load Pay Sheets" to preview.</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                    Paysheets must be created first in the Monthly Paysheets section.
                  </p>
                </div>
              ) : (
                <div
                  ref={printRef}
                  className={`print-area ${printMode === '2up' ? 'print-mode-2up' : 'print-mode-a4'}`}
                  style={{
                    background: '#eaeaea',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 30,
                  }}
                >
                  {printMode === '2up' ? (
                    // 2-per-page: group paysheets into pairs, stacked top/bottom
                    // Each paysheet is A5 portrait (148×210mm) rotated 90° to fill
                    // a 210×148.5mm landscape slot. Two slots per A4 portrait page.
                    (() => {
                      const pairs: MonthlyPaysheet[][] = [];
                      for (let i = 0; i < previewPaysheets.length; i += 2) {
                        pairs.push(previewPaysheets.slice(i, i + 2));
                      }
                      return pairs.map((pair, idx) => (
                        <div
                          key={idx}
                          className="print-page-pair"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: 794,  /* 210mm at 96dpi */
                            background: '#fff',
                            borderRadius: 4,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            overflow: 'hidden',
                          }}
                        >
                          {pair.map((ps) => (
                            <div
                              key={ps.id || ps.codeNo}
                              className="paysheet-slot"
                              style={{
                                width: 794,      /* 210mm */
                                height: 561,     /* 148.5mm */
                                position: 'relative',
                                overflow: 'hidden',
                                borderBottom: '1px dashed #ccc',
                              }}
                            >
                              <div style={{
                                transformOrigin: 'top left',
                                transform: 'rotate(90deg) translateY(-100%)',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                              }}>
                                <PaySheet
                                  paysheet={ps}
                                  employee={userMap.get(ps.codeNo) || null}
                                  size="2up"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()
                  ) : (
                    // A4 single per page
                    previewPaysheets.map((ps) => (
                      <PaySheet
                        key={ps.id || ps.codeNo}
                        paysheet={ps}
                        employee={userMap.get(ps.codeNo) || null}
                        size="a4"
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: Bulk PDF Export ═══════════════ */}
      {activeTab === 'bulk-pdf' && (
        <div>
          {/* Controls */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2>Bulk PDF Payslip Generation</h2>
              <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Generate PDF payslips for all employees with paysheets in a given month.
                Uses parallel worker threads for high-performance processing.
              </p>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Pay Month</label>
                  <input
                    type="month"
                    className="form-input"
                    value={pdfMonth}
                    onChange={(e) => setPdfMonth(e.target.value)}
                    disabled={pdfGenerating}
                  />
                </div>
                <div className="form-group">
                  <label>Worker Threads (1-10)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={10}
                    value={concurrency}
                    onChange={(e) => setConcurrency(Math.min(10, Math.max(1, Number(e.target.value))))}
                    disabled={pdfGenerating}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleBulkPdfGenerate}
                    disabled={pdfGenerating}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <FiPrinter size={18} />
                    {pdfGenerating ? 'Processing...' : 'Generate PDF Payslips'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleJsonExport}
                    disabled={jsonExporting}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <FiFileText size={18} />
                    {jsonExporting ? 'Exporting...' : 'Export JSON ZIP'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {job && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h2>Generation Progress</h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {job.status === 'completed' && <FiCheckCircle color="var(--success)" size={18} />}
                    {job.status === 'failed' && <FiAlertCircle color="var(--error)" size={18} />}
                    {statusLabel(job.status)}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    {job.completed} / {job.total}
                    {job.failed > 0 && (
                      <span style={{ color: 'var(--error)', marginLeft: 8 }}>
                        ({job.failed} failed)
                      </span>
                    )}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: 28,
                    background: 'var(--bg-secondary, #1a1a3e)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${job.progress}%`,
                      height: '100%',
                      background:
                        job.status === 'failed'
                          ? 'var(--error, #B22234)'
                          : job.status === 'completed'
                            ? 'var(--success, #1A8754)'
                            : 'linear-gradient(90deg, var(--gold-600, #D4A017), var(--gold-400, #F0CC5A))',
                      transition: 'width 0.3s ease',
                      borderRadius: 6,
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    }}
                  >
                    {job.progress}%
                  </span>
                </div>

                {/* Error */}
                {job.error && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: 'rgba(178, 34, 52, 0.1)',
                      borderLeft: '4px solid var(--error)',
                      borderRadius: 4,
                      color: 'var(--error)',
                      fontSize: 14,
                    }}
                  >
                    {job.error}
                  </div>
                )}

                {/* Action buttons */}
                {job.status === 'completed' && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleDownloadZip}
                      disabled={downloading}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <FiDownload size={18} />
                      {downloading ? 'Downloading...' : 'Download ZIP'}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handlePrintPdfs}
                      disabled={pdfPrinting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--gold-700, #B8860B)',
                      }}
                    >
                      <FiPrinter size={18} />
                      {pdfPrinting ? 'Sending to Printer...' : 'Print All PDFs'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Printer Settings */}
          {job?.status === 'completed' && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h2>Printer Settings</h2>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Printer Name (optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Leave blank for default printer"
                      value={pdfPrinterName}
                      onChange={(e) => setPdfPrinterName(e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Enter your printer name as shown in Windows Settings &gt; Printers
                    </span>
                  </div>
                  <div className="form-group">
                    <label>Copies</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={50}
                      value={pdfCopies}
                      onChange={(e) => setPdfCopies(Math.min(50, Math.max(1, Number(e.target.value))))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="card">
            <div className="card-header">
              <h2>How It Works</h2>
            </div>
            <div className="card-body" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              <ol style={{ paddingLeft: 20 }}>
                <li>Create paysheets in the <strong>Monthly Paysheets</strong> section first.</li>
                <li>Select the pay month for which paysheets have been created.</li>
                <li>Adjust the number of worker threads (more = faster, but uses more resources).</li>
                <li>Click <strong>Generate PDF Payslips</strong> to start PDF generation.</li>
                <li>The system processes payslips in parallel using worker threads and Puppeteer.</li>
                <li>Once complete, <strong>Download ZIP</strong> or <strong>Print All PDFs</strong> directly.</li>
                <li>Configure your printer name and copies in <strong>Printer Settings</strong>.</li>
              </ol>
              <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                Performance: 1000 payslips typically generate in under 2 minutes with 5 workers.
              </p>
            </div>
          </div>

          {/* ── Branch Print ─────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2>Branch Print</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  Print all payslips for a specific branch directly from the browser — no PDF generation needed.
                  Works everywhere including Vercel.
                </p>
              </div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Pay Month</label>
                  <input
                    type="month"
                    className="form-input"
                    value={branchPrintMonth}
                    onChange={(e) => { setBranchPrintMonth(e.target.value); setBranchPrintPaysheets([]); }}
                  />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <select
                    className="form-input"
                    value={branchPrintBranch}
                    onChange={(e) => { setBranchPrintBranch(e.target.value); setBranchPrintPaysheets([]); }}
                  >
                    <option value="">Select branch...</option>
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleFetchBranchPrint}
                    disabled={branchPrintLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <FiRefreshCw size={16} />
                    {branchPrintLoading ? 'Loading...' : 'Load Payslips'}
                  </button>
                  {branchPrintPaysheets.length > 0 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleBranchPrint()}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <FiPrinter size={16} />
                      Print All ({branchPrintPaysheets.length})
                    </button>
                  )}
                </div>
              </div>

              {branchPrintPaysheets.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(27,135,84,0.10)',
                    border: '1px solid rgba(27,135,84,0.25)',
                    borderRadius: 6,
                    fontSize: 13,
                    color: 'var(--success, #1A8754)',
                    marginBottom: 16,
                  }}>
                    <strong>{branchPrintPaysheets.length} payslip(s)</strong> ready for {branchPrintBranch} — {branchPrintMonth}.
                    Click <strong>Print All</strong> to open the print dialog.
                  </div>

                  {/* Payslip preview + print area */}
                  <div style={{ maxHeight: 640, overflowY: 'auto', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div
                      ref={branchPrintRef}
                      className="print-area print-mode-a4"
                      style={{
                        background: '#eaeaea',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 30,
                      }}
                    >
                      {branchPrintPaysheets.map((ps) => (
                        <PaySheet
                          key={ps.id || ps.codeNo + ps.payMonth}
                          paysheet={ps}
                          employee={userMap.get(ps.codeNo) || null}
                          size="a4"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {branchPrintPaysheets.length === 0 && !branchPrintLoading && (
                <div className="empty-state" style={{ marginTop: 16 }}>
                  <div className="empty-state-icon">🖨️</div>
                  <p>Select a pay month and branch, then click Load Payslips.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 4: Salary Audit ═══════════════ */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Filter card */}
          <EmployeeSelector
            key={`audit-${auditPeriod}`}
            selectedCodeNos={auditSelectedCodeNos}
            onSelectionChange={setAuditSelectedCodeNos}
            payMonth={auditPeriod}
            onPayMonthChange={setAuditPeriod}
            title="Select Employees"
            actionButton={
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFetchAudit}
                disabled={auditFetching}
              >
                {auditFetching
                  ? 'Loading...'
                  : `Salary Audit${auditSelectedCodeNos.size > 0 ? ` (${auditSelectedCodeNos.size})` : ''}`}
              </button>
            }
          />

          {/* Results */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2>Salary Breakdown{auditPaysheets.length > 0 ? ` (${auditPaysheets.length})` : ''}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  Step-by-step calculation for each employee — for HR verification
                </p>
              </div>
              {auditPaysheets.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleFetchAudit}
                    disabled={auditFetching}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <FiRefreshCw size={14} />
                    Refresh
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAuditPrint()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <FiPrinter size={14} />
                    Print / Save PDF
                  </button>
                </div>
              )}
            </div>
            <div className="card-body">
              {auditPaysheets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <p>Select employees and click "Salary Audit" to see the step-by-step breakdown.</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                    Leave the employee selector empty to load all employees for the chosen month.
                  </p>
                </div>
              ) : (
                <div ref={auditPrintRef} style={{ padding: 4 }}>
                  {/* Print-only report header */}
                  <div className="print-only" style={{ marginBottom: 20, borderBottom: '2px solid #B8860B', paddingBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: '#111' }}>Salary Audit Report</div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      Pay Month: {auditPeriod} &nbsp;·&nbsp; Generated: {new Date().toLocaleDateString()}
                    </div>
                  </div>

                  {auditPaysheets.map((ps) => (
                    <SalaryBreakdown
                      key={ps.id || ps.codeNo + ps.payMonth}
                      paysheet={ps}
                      employee={userMap.get(ps.codeNo) || null}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3: History & Reports ═══════════════ */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="filter-bar">
            <div className="search-input">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by employee, code, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
            >
              <option value="">All Periods</option>
              {uniquePeriods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <button
              className="btn btn-secondary"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FiRefreshCw size={16} />
              Refresh
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => {
                setSearchTerm('');
                setFilterPeriod('');
                setFilterBranch('');
              }}
              title="Clear all filters"
            >
              Clear Filters
            </button>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🕒</div>
                <p>No paysheet records found</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Code No</th>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Gross Pay</th>
                    <th>Net Pay</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((ps) => {
                    const user = userMap.get(ps.codeNo);
                    const name = user ? `${user.firstName} ${user.lastName}` : ps.codeNo;
                    return (
                      <tr key={ps.id || ps.codeNo + ps.payMonth}>
                        <td>
                          <span className="badge badge-info">{ps.payMonth}</span>
                        </td>
                        <td style={{ fontSize: 13 }}>{ps.codeNo}</td>
                        <td style={{ fontWeight: 500 }}>{name}</td>
                        <td>{ps.role}</td>
                        <td>{formatCurrency(ps.grossSalary || 0)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                          {formatCurrency(ps.netSalary || 0)}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => viewPaysheet(ps)}
                          >
                            View / Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
