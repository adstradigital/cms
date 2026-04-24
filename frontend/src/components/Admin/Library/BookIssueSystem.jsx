'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ScanLine,
  Undo2,
  UserRound,
  X
} from 'lucide-react';
import axios from '@/api/instance';

const createEmptyScanState = () => ({
  borrowerCode: '',
  bookCode: '',
  borrower: null,
  book: null,
  matchedBorrowerToken: '',
  matchedBookToken: '',
  loadingBorrower: false,
  loadingBook: false,
  actionLoading: false,
  error: '',
  success: null
});

const SCAN_TARGETS = {
  ISSUE_BORROWER: 'issue_borrower',
  ISSUE_BOOK: 'issue_book',
  RETURN_BORROWER: 'return_borrower',
  RETURN_BOOK: 'return_book'
};

const SCAN_TARGET_LABELS = {
  [SCAN_TARGETS.ISSUE_BORROWER]: 'Issue - Student/Staff ID',
  [SCAN_TARGETS.ISSUE_BOOK]: 'Issue - Book Barcode/QR',
  [SCAN_TARGETS.RETURN_BORROWER]: 'Return - Student/Staff ID',
  [SCAN_TARGETS.RETURN_BOOK]: 'Return - Book Barcode/QR'
};

const BookIssueSystem = () => {
  const [activeRecords, setActiveRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const [issueScan, setIssueScan] = useState(createEmptyScanState);
  const [returnScan, setReturnScan] = useState(createEmptyScanState);
  const [cameraScanner, setCameraScanner] = useState({
    open: false,
    target: '',
    error: '',
    isStarting: false
  });

  const issueBorrowerInputRef = useRef(null);
  const issueBookInputRef = useRef(null);
  const returnBorrowerInputRef = useRef(null);
  const returnBookInputRef = useRef(null);
  const cameraVideoRef = useRef(null);

  const issueScanRef = useRef(issueScan);
  const returnScanRef = useRef(returnScan);
  const issueInFlightRef = useRef(false);
  const returnInFlightRef = useRef(false);
  const cameraStreamRef = useRef(null);
  const cameraFrameRef = useRef(null);
  const cameraDetectorRef = useRef(null);
  const cameraZxingReaderRef = useRef(null);
  const cameraZxingControlsRef = useRef(null);
  const cameraActiveRef = useRef(false);
  const cameraSessionRef = useRef(0);

  useEffect(() => {
    issueScanRef.current = issueScan;
  }, [issueScan]);

  useEffect(() => {
    returnScanRef.current = returnScan;
  }, [returnScan]);

  const getListData = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const getErrorMessage = (error, fallback) => {
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.response?.data?.detail) return error.response.data.detail;
    return fallback;
  };

  const normalizeCode = (value) => String(value ?? '').trim();

  const fetchActiveIssues = useCallback(async () => {
    try {
      setLoadingRecords(true);
      const response = await axios.get('/library/issues/', { params: { status: 'issued' } });
      setActiveRecords(getListData(response.data));
    } catch (error) {
      console.error('Failed to load active issue records:', error);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveIssues();
    issueBorrowerInputRef.current?.focus();
  }, [fetchActiveIssues]);

  const stopCameraScanner = useCallback(() => {
    cameraActiveRef.current = false;

    if (cameraZxingControlsRef.current && typeof cameraZxingControlsRef.current.stop === 'function') {
      try {
        cameraZxingControlsRef.current.stop();
      } catch (error) {
        console.error('ZXing stop failed:', error);
      } finally {
        cameraZxingControlsRef.current = null;
      }
    }

    if (cameraZxingReaderRef.current && typeof cameraZxingReaderRef.current.reset === 'function') {
      try {
        cameraZxingReaderRef.current.reset();
      } catch (error) {
        console.error('ZXing reset failed:', error);
      } finally {
        cameraZxingReaderRef.current = null;
      }
    }

    if (cameraFrameRef.current) {
      cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current?.srcObject && typeof cameraVideoRef.current.srcObject.getTracks === 'function') {
      cameraVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.pause?.();
      cameraVideoRef.current.srcObject = null;
    }

    cameraDetectorRef.current = null;
  }, []);

  const closeCameraScanner = useCallback(() => {
    cameraSessionRef.current += 1;
    stopCameraScanner();
    setCameraScanner({
      open: false,
      target: '',
      error: '',
      isStarting: false
    });
  }, [stopCameraScanner]);

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [stopCameraScanner]);

  const executeIssue = async (overrides = {}) => {
    if (issueInFlightRef.current) return;

    const snapshot = issueScanRef.current;
    const borrower = overrides.borrower ?? snapshot.borrower;
    const book = overrides.book ?? snapshot.book;
    const borrowerCode = normalizeCode(overrides.borrowerCode ?? snapshot.borrowerCode);
    const bookCode = normalizeCode(overrides.bookCode ?? snapshot.bookCode);

    if (!borrower || !book || !borrowerCode || !bookCode) {
      setIssueScan((prev) => ({ ...prev, error: 'Scan borrower ID and book barcode first.' }));
      return;
    }

    issueInFlightRef.current = true;
    setIssueScan((prev) => ({ ...prev, actionLoading: true, error: '', success: null }));

    try {
      const response = await axios.post('/library/scan/issue/', {
        borrower_code: borrowerCode,
        book_code: bookCode
      });
      const payload = response.data || {};

      setIssueScan({
        ...createEmptyScanState(),
        success: {
          message: payload.message || 'Book issued successfully.',
          borrower: payload.borrower,
          book: payload.book,
          issueDate: payload.issue?.issue_date || payload.issue_date,
          dueDate: payload.issue?.due_date || payload.due_date
        }
      });

      issueBorrowerInputRef.current?.focus();
      await fetchActiveIssues();
    } catch (error) {
      setIssueScan((prev) => ({
        ...prev,
        actionLoading: false,
        error: getErrorMessage(error, 'Failed to issue book.')
      }));
    } finally {
      issueInFlightRef.current = false;
    }
  };

  const executeReturn = async (overrides = {}) => {
    if (returnInFlightRef.current) return;

    const snapshot = returnScanRef.current;
    const borrower = overrides.borrower ?? snapshot.borrower;
    const book = overrides.book ?? snapshot.book;
    const borrowerCode = normalizeCode(overrides.borrowerCode ?? snapshot.borrowerCode);
    const bookCode = normalizeCode(overrides.bookCode ?? snapshot.bookCode);

    if (!borrower || !book || !borrowerCode || !bookCode) {
      setReturnScan((prev) => ({ ...prev, error: 'Scan borrower ID and book barcode first.' }));
      return;
    }

    returnInFlightRef.current = true;
    setReturnScan((prev) => ({ ...prev, actionLoading: true, error: '', success: null }));

    try {
      const response = await axios.post('/library/scan/return/', {
        borrower_code: borrowerCode,
        book_code: bookCode
      });
      const payload = response.data || {};

      setReturnScan({
        ...createEmptyScanState(),
        success: {
          message: payload.message || 'Book returned successfully.',
          borrower: payload.borrower,
          book: payload.book,
          returnDate: payload.issue?.return_date,
          fineAmount: payload.fine_amount,
          daysLate: payload.days_late
        }
      });

      returnBorrowerInputRef.current?.focus();
      await fetchActiveIssues();
    } catch (error) {
      setReturnScan((prev) => ({
        ...prev,
        actionLoading: false,
        error: getErrorMessage(error, 'Failed to return book.')
      }));
    } finally {
      returnInFlightRef.current = false;
    }
  };

  const resolveIssueBorrower = async (codeOverride) => {
    const isEventObject = Boolean(codeOverride && typeof codeOverride === 'object' && 'preventDefault' in codeOverride);
    const code = normalizeCode((isEventObject ? undefined : codeOverride) ?? issueScanRef.current.borrowerCode);
    if (!code) {
      setIssueScan((prev) => ({ ...prev, error: 'Scan borrower ID first.' }));
      return;
    }

    setIssueScan((prev) => ({
      ...prev,
      borrowerCode: code,
      borrower: null,
      loadingBorrower: true,
      error: '',
      success: null
    }));

    try {
      const response = await axios.post('/library/scan/borrower/', { code });
      const borrower = response.data?.borrower || null;
      setIssueScan((prev) => ({
        ...prev,
        borrowerCode: code,
        borrower,
        matchedBorrowerToken: response.data?.matched_token || code,
        loadingBorrower: false,
        error: ''
      }));
      issueBookInputRef.current?.focus();

      const current = issueScanRef.current;
      if (current.book) {
        await executeIssue({
          borrower,
          borrowerCode: code,
          book: current.book,
          bookCode: current.bookCode
        });
      }
    } catch (error) {
      setIssueScan((prev) => ({
        ...prev,
        borrower: null,
        loadingBorrower: false,
        error: getErrorMessage(error, 'Borrower scan failed.')
      }));
    }
  };

  const resolveIssueBook = async (codeOverride) => {
    const isEventObject = Boolean(codeOverride && typeof codeOverride === 'object' && 'preventDefault' in codeOverride);
    const code = normalizeCode((isEventObject ? undefined : codeOverride) ?? issueScanRef.current.bookCode);
    if (!code) {
      setIssueScan((prev) => ({ ...prev, error: 'Scan book barcode first.' }));
      return;
    }

    setIssueScan((prev) => ({
      ...prev,
      bookCode: code,
      book: null,
      loadingBook: true,
      error: '',
      success: null
    }));

    try {
      const response = await axios.post('/library/scan/book/', { code });
      const book = response.data?.book || null;
      const availableCopies = Number(book?.available_copies ?? 0);
      const availabilityError = book && availableCopies < 1 ? 'No copies available for this book.' : '';
      setIssueScan((prev) => ({
        ...prev,
        bookCode: code,
        book,
        matchedBookToken: response.data?.matched_token || code,
        loadingBook: false,
        error: availabilityError
      }));

      const current = issueScanRef.current;
      if (current.borrower && !availabilityError) {
        await executeIssue({
          borrower: current.borrower,
          borrowerCode: current.borrowerCode,
          book,
          bookCode: code
        });
      }
    } catch (error) {
      setIssueScan((prev) => ({
        ...prev,
        book: null,
        loadingBook: false,
        error: getErrorMessage(error, 'Book scan failed.')
      }));
    }
  };

  const resolveReturnBorrower = async (codeOverride) => {
    const isEventObject = Boolean(codeOverride && typeof codeOverride === 'object' && 'preventDefault' in codeOverride);
    const code = normalizeCode((isEventObject ? undefined : codeOverride) ?? returnScanRef.current.borrowerCode);
    if (!code) {
      setReturnScan((prev) => ({ ...prev, error: 'Scan borrower ID first.' }));
      return;
    }

    setReturnScan((prev) => ({
      ...prev,
      borrowerCode: code,
      borrower: null,
      loadingBorrower: true,
      error: '',
      success: null
    }));

    try {
      const response = await axios.post('/library/scan/borrower/', { code });
      const borrower = response.data?.borrower || null;
      setReturnScan((prev) => ({
        ...prev,
        borrowerCode: code,
        borrower,
        matchedBorrowerToken: response.data?.matched_token || code,
        loadingBorrower: false,
        error: ''
      }));
      returnBookInputRef.current?.focus();

      const current = returnScanRef.current;
      if (current.book) {
        await executeReturn({
          borrower,
          borrowerCode: code,
          book: current.book,
          bookCode: current.bookCode
        });
      }
    } catch (error) {
      setReturnScan((prev) => ({
        ...prev,
        borrower: null,
        loadingBorrower: false,
        error: getErrorMessage(error, 'Borrower scan failed.')
      }));
    }
  };

  const resolveReturnBook = async (codeOverride) => {
    const isEventObject = Boolean(codeOverride && typeof codeOverride === 'object' && 'preventDefault' in codeOverride);
    const code = normalizeCode((isEventObject ? undefined : codeOverride) ?? returnScanRef.current.bookCode);
    if (!code) {
      setReturnScan((prev) => ({ ...prev, error: 'Scan book barcode first.' }));
      return;
    }

    setReturnScan((prev) => ({
      ...prev,
      bookCode: code,
      book: null,
      loadingBook: true,
      error: '',
      success: null
    }));

    try {
      const response = await axios.post('/library/scan/book/', { code });
      const book = response.data?.book || null;
      setReturnScan((prev) => ({
        ...prev,
        bookCode: code,
        book,
        matchedBookToken: response.data?.matched_token || code,
        loadingBook: false,
        error: ''
      }));

      const current = returnScanRef.current;
      if (current.borrower) {
        await executeReturn({
          borrower: current.borrower,
          borrowerCode: current.borrowerCode,
          book,
          bookCode: code
        });
      }
    } catch (error) {
      setReturnScan((prev) => ({
        ...prev,
        book: null,
        loadingBook: false,
        error: getErrorMessage(error, 'Book scan failed.')
      }));
    }
  };

  const applyScannedCode = async (target, detectedCode) => {
    const code = normalizeCode(detectedCode);
    if (!code) return;

    if (target === SCAN_TARGETS.ISSUE_BORROWER) {
      setIssueScan((prev) => ({
        ...prev,
        borrowerCode: code,
        borrower: null,
        matchedBorrowerToken: '',
        error: '',
        success: null
      }));
      await resolveIssueBorrower(code);
      return;
    }

    if (target === SCAN_TARGETS.ISSUE_BOOK) {
      setIssueScan((prev) => ({
        ...prev,
        bookCode: code,
        book: null,
        matchedBookToken: '',
        error: '',
        success: null
      }));
      await resolveIssueBook(code);
      return;
    }

    if (target === SCAN_TARGETS.RETURN_BORROWER) {
      setReturnScan((prev) => ({
        ...prev,
        borrowerCode: code,
        borrower: null,
        matchedBorrowerToken: '',
        error: '',
        success: null
      }));
      await resolveReturnBorrower(code);
      return;
    }

    if (target === SCAN_TARGETS.RETURN_BOOK) {
      setReturnScan((prev) => ({
        ...prev,
        bookCode: code,
        book: null,
        matchedBookToken: '',
        error: '',
        success: null
      }));
      await resolveReturnBook(code);
    }
  };

  const openCameraScanner = async (target) => {
    cameraSessionRef.current += 1;
    const sessionId = cameraSessionRef.current;
    stopCameraScanner();
    setCameraScanner({
      open: true,
      target,
      error: '',
      isStarting: true
    });

    const hasNavigator = typeof navigator !== 'undefined';
    const hasWindow = typeof window !== 'undefined';
    const hasCameraApi = hasNavigator && Boolean(navigator.mediaDevices?.getUserMedia);
    const hasBarcodeDetector = hasWindow && 'BarcodeDetector' in window;

    if (!hasCameraApi) {
      setCameraScanner({
        open: true,
        target,
        error: 'Camera access is not available in this browser.',
        isStarting: false
      });
      return;
    }

    try {
      const waitForVideoElement = async () => {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          if (cameraVideoRef.current) return true;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return false;
      };

      const ensureVideoReady = await waitForVideoElement();
      if (!ensureVideoReady || cameraSessionRef.current !== sessionId) {
        return;
      }

      if (hasBarcodeDetector) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (cameraSessionRef.current !== sessionId) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play();
        }

        const preferredFormats = [
          'qr_code',
          'code_128',
          'code_39',
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'itf',
          'codabar'
        ];

        const supportedFormats = await window.BarcodeDetector.getSupportedFormats?.();
        const usableFormats = Array.isArray(supportedFormats)
          ? preferredFormats.filter((format) => supportedFormats.includes(format))
          : preferredFormats;

        cameraDetectorRef.current = usableFormats.length
          ? new window.BarcodeDetector({ formats: usableFormats })
          : new window.BarcodeDetector();

        if (cameraSessionRef.current !== sessionId) {
          return;
        }

        cameraActiveRef.current = true;
        setCameraScanner((prev) => ({ ...prev, isStarting: false, error: '' }));

        const detectLoop = async () => {
          if (!cameraActiveRef.current || cameraSessionRef.current !== sessionId) {
            return;
          }

          try {
            if (cameraVideoRef.current && cameraDetectorRef.current) {
              const detectedCodes = await cameraDetectorRef.current.detect(cameraVideoRef.current);
              const firstCode = detectedCodes?.[0]?.rawValue;

              if (firstCode) {
                closeCameraScanner();
                await applyScannedCode(target, firstCode);
                return;
              }
            }
          } catch (scanError) {
            console.error('Camera scan detect error:', scanError);
          }

          cameraFrameRef.current = requestAnimationFrame(detectLoop);
        };

        cameraFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // Fallback: ZXing (works in Firefox/Safari via JS decoding)
      let zxing;
      try {
        zxing = await import('@zxing/browser');
      } catch (importError) {
        console.error('ZXing import failed:', importError);
        setCameraScanner({
          open: true,
          target,
          error: 'Camera barcode scanning is not supported in this browser. Use Chrome/Edge or scan using a USB scanner into the textbox.',
          isStarting: false
        });
        return;
      }

      const ReaderClass = zxing?.BrowserMultiFormatReader;
      if (!ReaderClass) {
        setCameraScanner({
          open: true,
          target,
          error: 'Scanner library failed to load. Use Chrome/Edge or scan using a USB scanner into the textbox.',
          isStarting: false
        });
        return;
      }

      cameraActiveRef.current = true;
      setCameraScanner((prev) => ({ ...prev, isStarting: false, error: '' }));

      const codeReader = new ReaderClass();
      cameraZxingReaderRef.current = codeReader;

      const onZxingResult = async (result, error) => {
        if (!cameraActiveRef.current || cameraSessionRef.current !== sessionId) {
          return;
        }

        if (result) {
          const text =
            typeof result.getText === 'function'
              ? result.getText()
              : result.text || result.rawValue || String(result);
          closeCameraScanner();
          await applyScannedCode(target, text);
          return;
        }

        if (error) {
          // Ignore not-found style errors; log the rest for debugging.
          const message = String(error?.name || error?.message || '');
          if (message && !message.toLowerCase().includes('notfound')) {
            console.error('ZXing scan error:', error);
          }
        }
      };

      const constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
      if (typeof codeReader.decodeFromConstraints === 'function') {
        const controls = await codeReader.decodeFromConstraints(constraints, cameraVideoRef.current, onZxingResult);
        cameraZxingControlsRef.current = controls || null;
      } else {
        const controls = await codeReader.decodeFromVideoDevice(undefined, cameraVideoRef.current, onZxingResult);
        cameraZxingControlsRef.current = controls || null;
      }

      if (cameraSessionRef.current !== sessionId) {
        stopCameraScanner();
      }
    } catch (error) {
      console.error('Unable to start camera scanner:', error);
      stopCameraScanner();
      setCameraScanner({
        open: true,
        target,
        error: 'Unable to access camera. Please allow camera permission and try again.',
        isStarting: false
      });
    }
  };

  const handleEnterToRun = (event, callback) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      callback();
    }
  };

  const renderBorrowerPreview = (borrower) => {
    if (!borrower) return null;
    return (
      <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '10px 12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1D4ED8' }}>{borrower.name}</p>
        <p style={{ fontSize: '12px', color: '#2563EB', marginTop: '2px' }}>
          {borrower.type === 'student' ? 'Student' : 'Staff'} • {borrower.reference}
        </p>
      </div>
    );
  };

  const renderBookPreview = (book) => {
    if (!book) return null;
    const shelfInfo = [book.rack_name, book.shelf_name].filter(Boolean).join(' / ');
    return (
      <div style={{ backgroundColor: '#F0FDF4', borderRadius: '10px', padding: '10px 12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>{book.title}</p>
        <p style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
          {book.author} • Avl {book.available_copies}{shelfInfo ? ` • ${shelfInfo}` : ''}
        </p>
      </div>
    );
  };

  const renderError = (errorText) => {
    if (!errorText) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', backgroundColor: '#FEF2F2', borderRadius: '10px', padding: '10px 12px' }}>
        <AlertCircle size={16} />
        <span style={{ fontSize: '13px', fontWeight: '600' }}>{errorText}</span>
      </div>
    );
  };

  const renderSuccess = (result, mode) => {
    if (!result) return null;
    return (
      <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px' }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#166534' }}>
          <CheckCircle2 size={16} /> {result.message}
        </p>
        <p style={{ fontSize: '12px', color: '#15803D', marginTop: '6px' }}>
          {result.borrower?.name} • {result.book?.title}
        </p>
        {mode === 'issue' ? (
          <p style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
            Issue: {result.issueDate || '-'} • Due: {result.dueDate || '-'}
          </p>
        ) : (
          <p style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
            Return: {result.returnDate || '-'} • Fine: ₹{Number(result.fineAmount || 0).toFixed(2)} • Late: {result.daysLate || 0} days
          </p>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <div style={{ backgroundColor: 'var(--theme-bg-white)', border: '1px solid var(--theme-border-subtle)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} /> Issue Book (Scan)
            </h3>
            <button
              type="button"
              onClick={() => {
                setIssueScan(createEmptyScanState());
                issueBorrowerInputRef.current?.focus();
              }}
              style={{ border: 'none', backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCcw size={14} /> Reset
            </button>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>
            Step 1: Scan borrower ID • Step 2: Scan book barcode • Issue triggers automatically.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Borrower ID Scan</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={issueBorrowerInputRef}
                value={issueScan.borrowerCode}
                onChange={(event) => setIssueScan((prev) => ({ ...prev, borrowerCode: event.target.value, borrower: null, matchedBorrowerToken: '', error: '', success: null }))}
                onKeyDown={(event) => handleEnterToRun(event, resolveIssueBorrower)}
                placeholder="Scan student/staff card"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
              />
              <button
                type="button"
                onClick={() => openCameraScanner(SCAN_TARGETS.ISSUE_BORROWER)}
                style={{ border: '1px solid #93C5FD', borderRadius: '8px', padding: '0 10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: '600', cursor: 'pointer', minWidth: '104px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Camera size={14} /> Scan ID
              </button>
              <button
                type="button"
                onClick={() => resolveIssueBorrower()}
                disabled={issueScan.loadingBorrower}
                style={{ border: 'none', borderRadius: '8px', padding: '0 12px', backgroundColor: '#2563EB', color: 'white', fontWeight: '600', cursor: 'pointer', minWidth: '92px' }}
              >
                {issueScan.loadingBorrower ? <Loader2 className="animate-spin" size={15} /> : 'Identify'}
              </button>
            </div>
          </div>

          {renderBorrowerPreview(issueScan.borrower)}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Book Barcode Scan</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={issueBookInputRef}
                value={issueScan.bookCode}
                onChange={(event) => setIssueScan((prev) => ({ ...prev, bookCode: event.target.value, book: null, matchedBookToken: '', error: '', success: null }))}
                onKeyDown={(event) => handleEnterToRun(event, resolveIssueBook)}
                placeholder="Scan book barcode / QR"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
              />
              <button
                type="button"
                onClick={() => openCameraScanner(SCAN_TARGETS.ISSUE_BOOK)}
                style={{ border: '1px solid #6EE7B7', borderRadius: '8px', padding: '0 10px', backgroundColor: '#ECFDF5', color: '#047857', fontWeight: '600', cursor: 'pointer', minWidth: '124px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Camera size={14} /> Scan Book
              </button>
              <button
                type="button"
                onClick={() => resolveIssueBook()}
                disabled={issueScan.loadingBook}
                style={{ border: 'none', borderRadius: '8px', padding: '0 12px', backgroundColor: '#059669', color: 'white', fontWeight: '600', cursor: 'pointer', minWidth: '92px' }}
              >
                {issueScan.loadingBook ? <Loader2 className="animate-spin" size={15} /> : 'Fetch'}
              </button>
            </div>
          </div>

          {renderBookPreview(issueScan.book)}
          {renderError(issueScan.error)}
          {renderSuccess(issueScan.success, 'issue')}

          <button
            type="button"
            onClick={() => executeIssue()}
            disabled={issueScan.actionLoading || !issueScan.borrower || !issueScan.book || Number(issueScan.book?.available_copies || 0) < 1}
            style={{ border: 'none', borderRadius: '10px', padding: '11px 12px', backgroundColor: '#1E293B', color: 'white', fontWeight: '700', cursor: issueScan.actionLoading || !issueScan.borrower || !issueScan.book || Number(issueScan.book?.available_copies || 0) < 1 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: issueScan.actionLoading || !issueScan.borrower || !issueScan.book || Number(issueScan.book?.available_copies || 0) < 1 ? 0.7 : 1 }}
          >
            {issueScan.actionLoading ? <Loader2 className="animate-spin" size={16} /> : <ScanLine size={16} />}
            {issueScan.actionLoading ? 'Issuing...' : 'Issue Now'}
          </button>
        </div>

        <div style={{ backgroundColor: 'var(--theme-bg-white)', border: '1px solid var(--theme-border-subtle)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Undo2 size={18} /> Return Book (Scan)
            </h3>
            <button
              type="button"
              onClick={() => {
                setReturnScan(createEmptyScanState());
                returnBorrowerInputRef.current?.focus();
              }}
              style={{ border: 'none', backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCcw size={14} /> Reset
            </button>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>
            Step 1: Scan borrower ID • Step 2: Scan book barcode • Return triggers automatically with fine calculation.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Borrower ID Scan</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={returnBorrowerInputRef}
                value={returnScan.borrowerCode}
                onChange={(event) => setReturnScan((prev) => ({ ...prev, borrowerCode: event.target.value, borrower: null, matchedBorrowerToken: '', error: '', success: null }))}
                onKeyDown={(event) => handleEnterToRun(event, resolveReturnBorrower)}
                placeholder="Scan student/staff card"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
              />
              <button
                type="button"
                onClick={() => openCameraScanner(SCAN_TARGETS.RETURN_BORROWER)}
                style={{ border: '1px solid #93C5FD', borderRadius: '8px', padding: '0 10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: '600', cursor: 'pointer', minWidth: '104px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Camera size={14} /> Scan ID
              </button>
              <button
                type="button"
                onClick={() => resolveReturnBorrower()}
                disabled={returnScan.loadingBorrower}
                style={{ border: 'none', borderRadius: '8px', padding: '0 12px', backgroundColor: '#2563EB', color: 'white', fontWeight: '600', cursor: 'pointer', minWidth: '92px' }}
              >
                {returnScan.loadingBorrower ? <Loader2 className="animate-spin" size={15} /> : 'Identify'}
              </button>
            </div>
          </div>

          {renderBorrowerPreview(returnScan.borrower)}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Book Barcode Scan</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={returnBookInputRef}
                value={returnScan.bookCode}
                onChange={(event) => setReturnScan((prev) => ({ ...prev, bookCode: event.target.value, book: null, matchedBookToken: '', error: '', success: null }))}
                onKeyDown={(event) => handleEnterToRun(event, resolveReturnBook)}
                placeholder="Scan book barcode / QR"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
              />
              <button
                type="button"
                onClick={() => openCameraScanner(SCAN_TARGETS.RETURN_BOOK)}
                style={{ border: '1px solid #6EE7B7', borderRadius: '8px', padding: '0 10px', backgroundColor: '#ECFDF5', color: '#047857', fontWeight: '600', cursor: 'pointer', minWidth: '124px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Camera size={14} /> Scan Book
              </button>
              <button
                type="button"
                onClick={() => resolveReturnBook()}
                disabled={returnScan.loadingBook}
                style={{ border: 'none', borderRadius: '8px', padding: '0 12px', backgroundColor: '#059669', color: 'white', fontWeight: '600', cursor: 'pointer', minWidth: '92px' }}
              >
                {returnScan.loadingBook ? <Loader2 className="animate-spin" size={15} /> : 'Fetch'}
              </button>
            </div>
          </div>

          {renderBookPreview(returnScan.book)}
          {renderError(returnScan.error)}
          {renderSuccess(returnScan.success, 'return')}

          <button
            type="button"
            onClick={() => executeReturn()}
            disabled={returnScan.actionLoading || !returnScan.borrower || !returnScan.book}
            style={{ border: 'none', borderRadius: '10px', padding: '11px 12px', backgroundColor: '#0F766E', color: 'white', fontWeight: '700', cursor: returnScan.actionLoading || !returnScan.borrower || !returnScan.book ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: returnScan.actionLoading || !returnScan.borrower || !returnScan.book ? 0.7 : 1 }}
          >
            {returnScan.actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Undo2 size={16} />}
            {returnScan.actionLoading ? 'Returning...' : 'Return Now'}
          </button>
        </div>
      </div>

      {cameraScanner.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'var(--theme-bg-white)',
              borderRadius: '16px',
              border: '1px solid var(--theme-border-subtle)',
              boxShadow: 'var(--theme-shadow-lg)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--theme-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--theme-text)' }}>
                {SCAN_TARGET_LABELS[cameraScanner.target] || 'Camera Scanner'}
              </p>
              <button
                type="button"
                onClick={closeCameraScanner}
                style={{
                  border: 'none',
                  backgroundColor: 'var(--theme-bg-subtle)',
                  color: 'var(--theme-text)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cameraScanner.error ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#B91C1C', backgroundColor: '#FEF2F2', borderRadius: '10px', padding: '12px' }}>
                  <AlertCircle size={16} style={{ marginTop: '1px' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{cameraScanner.error}</span>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: '#0F172A',
                      position: 'relative'
                    }}
                  >
                    <video
                      ref={cameraVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    {cameraScanner.isStarting && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(15, 23, 42, 0.55)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '700',
                          gap: '8px'
                        }}
                      >
                        <Loader2 size={16} className="animate-spin" /> Starting camera...
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>
                    Align the ID QR/barcode or book barcode inside the camera frame. It will auto-detect instantly.
                  </p>
                </>
              )}
            </div>

            <div style={{ padding: '0 16px 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeCameraScanner}
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  backgroundColor: 'var(--theme-bg-subtle)',
                  color: 'var(--theme-text)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: 'var(--theme-bg-white)', borderRadius: '12px', border: '1px solid var(--theme-border-subtle)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--theme-border-subtle)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserRound size={16} /> Active Issue Records
          </h3>
          <button
            type="button"
            onClick={fetchActiveIssues}
            style={{ border: 'none', backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--theme-bg-subtle)', borderBottom: '1px solid var(--theme-border-subtle)' }}>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700' }}>Borrower</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700' }}>Book</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700' }}>Issue Date</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700' }}>Due Date</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loadingRecords ? (
              <tr>
                <td colSpan="5" style={{ padding: '28px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>
                  Loading active issues...
                </td>
              </tr>
            ) : activeRecords.length > 0 ? (
              activeRecords.map((record) => {
                const isOverdue = new Date(record.due_date) < new Date();
                return (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--theme-border-subtle)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--theme-text)' }}>{record.student_name || record.staff_name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>{record.student ? 'Student' : 'Staff'}</p>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--theme-text)', fontWeight: '600' }}>{record.book_title}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>{record.issue_date}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: isOverdue ? '#B91C1C' : 'var(--theme-text)' }}>{record.due_date}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ borderRadius: '999px', padding: '4px 10px', backgroundColor: isOverdue ? '#FEF2F2' : '#ECFDF5', color: isOverdue ? '#B91C1C' : '#15803D', fontSize: '11px', fontWeight: '700' }}>
                        {isOverdue ? 'Overdue' : 'On Time'}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '28px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>
                  No active issues found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookIssueSystem;
