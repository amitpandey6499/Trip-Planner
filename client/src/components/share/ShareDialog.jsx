import { useEffect, useId, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  BookmarkCheck,
  CalendarPlus,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Link2,
  Loader2,
  MessageCircle,
  Printer,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react';
import { buildTripCalendar } from '@tripplanner/shared';
import { shareApi, tripApi } from '../../services/api';
import { exportFileName, saveBlob, saveText } from '../../utils/download';
import { itineraryAsText } from '../../utils/tripText';

export const shareLink = (slug) => `${window.location.origin}/share/${slug}`;

const Switch = ({ checked, disabled, onChange, labelledBy }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-labelledby={labelledBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 ${
      checked ? 'bg-blue-600' : 'bg-slate-300'
    }`}
  >
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);

const Action = ({ icon: Icon, children, busy = false, ...props }) => (
  <button
    type="button"
    {...props}
    className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-60 transition-colors"
  >
    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    </span>
    <span className="min-w-0">{children}</span>
  </button>
);

/**
 * Part 14 — "Share": a public read-only link (on / off, copy, WhatsApp, the phone's share sheet, QR code, new link)
 * and downloads of the plan on screen (PDF, calendar .ics, text, print). An unsaved plan can be downloaded but needs
 * saving before it gets a link.
 */
export const ShareDialog = ({ itinerary, tripId, isDirty, saving, onSave, onClose }) => {
  const id = useId();
  const [info, setInfo] = useState(null); // { enabled, slug, views }
  const [loading, setLoading] = useState(Boolean(tripId));
  const [busy, setBusy] = useState(null); // 'toggle' | 'newLink' | 'pdf'
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null); // 'link' | 'text'
  const [qr, setQr] = useState(null);
  const [confirmNewLink, setConfirmNewLink] = useState(false);
  const url = info?.enabled && info.slug ? shareLink(info.slug) : null;

  useEffect(() => {
    if (!tripId) return undefined;
    let active = true;
    setLoading(true);
    shareApi
      .info(tripId)
      .then((res) => active && setInfo(res.data))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tripId]);

  useEffect(() => {
    if (!url) return undefined;
    let active = true;
    QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then((dataUrl) => active && setQr(dataUrl))
      .catch(() => active && setQr(null));
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Event ids: from the saved trip, else from the plan's dates + destination (two different plans never share ids).
  const calendar = useMemo(
    () => buildTripCalendar(itinerary, { uidBase: tripId ?? `plan-${itinerary.startDate ?? ''}-${itinerary.destination}`, url: url ?? undefined }),
    [itinerary, tripId, url],
  );

  const setSharing = async (enabled, newLink = false) => {
    setBusy(newLink ? 'newLink' : 'toggle');
    setError(null);
    try {
      const res = await shareApi.set(tripId, { enabled, newLink });
      setInfo(res.data);
      setConfirmNewLink(false);
      if (!res.data.enabled) setQr(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const copy = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError('This browser blocked copying. Select the text and copy it yourself.');
    }
  };

  const downloadPdf = async () => {
    setBusy('pdf');
    setError(null);
    try {
      const blob = await tripApi.pdf({ itinerary, tripId });
      saveBlob(blob, exportFileName(itinerary.title, 'pdf'));
    } catch (err) {
      setError(`The PDF could not be made: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: itinerary.title, text: `${itinerary.title} — my trip plan`, url });
    } catch {
      // closed by the user
    }
  };
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const whatsAppUrl = url ? `https://wa.me/?text=${encodeURIComponent(`${itinerary.title} — my trip plan on TripPlanner: ${url}`)}` : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="bg-white w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5"
        data-testid="share-dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" /> Share & download
            </h3>
            <p className="text-xs text-slate-500">{itinerary.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Share link */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> Share link
          </h4>

          {!tripId ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-slate-700">Save the trip first to get a link you can send.</p>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60 flex-shrink-0"
              >
                <BookmarkCheck className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Trip'}
              </button>
            </div>
          ) : loading ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Switch checked={Boolean(info?.enabled)} disabled={Boolean(busy)} onChange={(on) => setSharing(on)} labelledBy={`${id}-switch`} />
                <div>
                  <p id={`${id}-switch`} className="text-sm font-semibold text-slate-800">
                    {info?.enabled ? 'Anyone with the link can view this trip' : 'Link is off — nobody can open it'}
                  </p>
                  <p className="text-[11px] text-slate-500">Read-only. Your notes, home city, packing ticks and expenses stay private.</p>
                </div>
              </div>

              {url && (
                <div className="space-y-3" data-testid="share-link-panel">
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={url}
                      aria-label="Share link"
                      onFocus={(e) => e.target.select()}
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => copy('link', url)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex-shrink-0"
                    >
                      {copied === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === 'link' ? 'Copied' : 'Copy link'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    {canNativeShare && (
                      <button type="button" onClick={nativeShare} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700">
                        <Share2 className="w-3.5 h-3.5" /> Share...
                      </button>
                    )}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </a>
                  </div>

                  <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    {qr ? (
                      <img src={qr} alt={`QR code for ${url}`} className="w-28 h-28 rounded-lg bg-white p-1 border border-slate-200" data-testid="share-qr" />
                    ) : (
                      <div className="w-28 h-28 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                      </div>
                    )}
                    <div className="space-y-2 min-w-0">
                      <p className="text-xs text-slate-600">Scan with a phone camera to open the trip.</p>
                      {qr && (
                        <a href={qr} download={exportFileName(`${itinerary.title} QR`, 'png')} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                          <Download className="w-3.5 h-3.5" /> Download QR code
                        </a>
                      )}
                      <p className="text-[11px] text-slate-500 flex items-center gap-1" data-testid="share-views">
                        <Eye className="w-3.5 h-3.5" /> Opened {info.views} {info.views === 1 ? 'time' : 'times'}
                      </p>
                    </div>
                  </div>

                  {isDirty && (
                    <p className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> The link shows the saved version. Save your changes to share them.
                    </p>
                  )}

                  {confirmNewLink ? (
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50 space-y-2">
                      <p className="text-xs text-red-800">The old link (and its QR code) will stop working. Make a new one?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSharing(true, true)}
                          disabled={Boolean(busy)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          {busy === 'newLink' ? 'Making...' : 'Yes, new link'}
                        </button>
                        <button type="button" onClick={() => setConfirmNewLink(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmNewLink(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-700">
                      <RefreshCw className="w-3.5 h-3.5" /> Make a new link (stops the old one)
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* 2. Downloads */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Download
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Action icon={FileText} onClick={downloadPdf} disabled={busy === 'pdf'} busy={busy === 'pdf'} data-testid="download-pdf">
              <span className="block text-sm font-semibold text-slate-800">{busy === 'pdf' ? 'Making the PDF...' : 'PDF'}</span>
              <span className="block text-[11px] text-slate-500">Every day, times, costs and tips — to print or send.</span>
            </Action>
            <Action
              icon={CalendarPlus}
              onClick={() => saveText(calendar.ics, exportFileName(itinerary.title, 'ics'), 'text/calendar;charset=utf-8')}
              disabled={!calendar.eventCount}
              data-testid="download-calendar"
            >
              <span className="block text-sm font-semibold text-slate-800">Calendar (.ics)</span>
              <span className="block text-[11px] text-slate-500">
                {calendar.eventCount ? `${calendar.eventCount} events. Google Calendar: Settings → Import & export → Import.` : 'This plan has no dates yet.'}
              </span>
            </Action>
            <Action icon={copied === 'text' ? Check : Copy} onClick={() => copy('text', itineraryAsText(itinerary, url))}>
              <span className="block text-sm font-semibold text-slate-800">{copied === 'text' ? 'Copied!' : 'Copy as text'}</span>
              <span className="block text-[11px] text-slate-500">Day by day, to paste in a chat.</span>
            </Action>
            <Action
              icon={Printer}
              onClick={() => {
                onClose();
                setTimeout(() => window.print(), 100);
              }}
            >
              <span className="block text-sm font-semibold text-slate-800">Print this page</span>
              <span className="block text-[11px] text-slate-500">What you see on screen.</span>
            </Action>
          </div>
        </section>

        {error && (
          <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default ShareDialog;
