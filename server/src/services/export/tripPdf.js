import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { BUDGET_BUCKETS, ITINERARY_SOURCES, formatClock, formatDate, formatDateLong, formatDuration, formatINR, formatKm, mapStops, parseTimeSlot } from '@tripplanner/shared';

/**
 * Part 14 — the whole trip as a real PDF (A4): cover with the facts and "days at a glance",
 * one page per day (times, places, costs, tips, drive to the next stop), then stays, food and the cost estimate.
 *
 * buildPdfContent() decides WHAT goes in (pure, unit-tested); renderTripPdf() draws it with PDFKit.
 * Font: Noto Sans (SIL Open Font License, server/assets/fonts) — the PDF standard fonts have no ₹ sign.
 */

const FONTS = {
  regular: fileURLToPath(new URL('../../../assets/fonts/NotoSans-Regular.ttf', import.meta.url)),
  bold: fileURLToPath(new URL('../../../assets/fonts/NotoSans-Bold.ttf', import.meta.url)),
};
const COLOR = { ink: '#0f172a', text: '#334155', muted: '#64748b', accent: '#2563eb', line: '#e2e8f0', soft: '#f1f5f9', warn: '#b45309', ok: '#047857' };

/** Drive to the next stop, keyed by activity id — only when the day's route still matches its stops (Part 8). */
const legsOf = (day) => {
  const stops = mapStops(day);
  const route = day.route && day.route.provider !== 'none' && day.route.stopIds?.join() === stops.map((s) => s.id).join() ? day.route : null;
  const legs = new Map();
  if (route) route.stopIds.forEach((id, i) => route.legs[i] && legs.set(String(id), route.legs[i]));
  return { route, legs };
};

const isoDay = (date) => date.toISOString().slice(0, 10);

/** "09:00 AM - 11:00 AM" → ['09:00 AM', 'to 11:00 AM'] (fits the time column); other text stays one line. */
const timeLines = (slotText) => {
  const slot = parseTimeSlot(slotText);
  if (slot && slot.end !== null && /-|–|to/i.test(slotText)) return [formatClock(slot.start), `to ${formatClock(slot.end)}`];
  return [slotText || 'Flexible'];
};

/**
 * @param {object} it  normalized itinerary
 * @param {{ shareUrl?: string | null, sharedBy?: string | null, now?: Date }} options
 */
export const buildPdfContent = (it, { shareUrl = null, sharedBy = null, now = new Date() } = {}) => {
  const days = it.days ?? [];
  const hasBudget = it.totalBudget > 0;
  const over = hasBudget && !it.withinBudget;
  const dates = it.startDate && it.endDate ? `${formatDate(it.startDate)} – ${formatDate(it.endDate)}` : null;

  return {
    title: it.title,
    subtitle: [it.destination, dates, `${days.length} ${days.length === 1 ? 'day' : 'days'}`, `${it.travelersCount} ${it.travelersCount === 1 ? 'traveller' : 'travellers'}`]
      .filter(Boolean)
      .join(' · '),
    summary: it.summary || '',
    facts: [
      ['Destination', it.destination],
      ['Dates', it.startDate && it.endDate ? `${formatDateLong(it.startDate)} – ${formatDateLong(it.endDate)}` : `${it.durationDays} days`],
      ['Travellers', String(it.travelersCount)],
      ['Budget style', it.budgetCategory],
      ['Your budget', hasBudget ? formatINR(it.totalBudget) : 'Not set'],
      ['Estimated cost', formatINR(it.estimatedTotal)],
      ['Planned by', ITINERARY_SOURCES[it.source] ?? 'TripPlanner'],
    ],
    verdict: hasBudget
      ? {
          over,
          text: over ? `Over budget by ${formatINR(it.estimatedTotal - it.totalBudget)}` : `Within budget (${formatINR(it.totalBudget - it.estimatedTotal)} to spare)`,
          label: over ? 'Over budget by' : 'Left in the budget',
          amount: formatINR(Math.abs(it.totalBudget - it.estimatedTotal)),
        }
      : null,
    glance: days.map((d) => ({ day: `Day ${d.dayNumber}`, date: d.date ? formatDate(d.date) : '', title: d.title, cost: formatINR(d.estimatedDailyExpense) })),
    days: days.map((d) => {
      const { route, legs } = legsOf(d);
      const about = route?.provider === 'estimate' ? 'about ' : '';
      return {
        heading: `Day ${d.dayNumber}${d.date ? ` · ${formatDateLong(d.date)}` : ''}`,
        title: d.title,
        description: d.description || '',
        facts: [
          d.estimatedDailyExpense > 0 && `Estimated cost today: ${formatINR(d.estimatedDailyExpense)}`,
          route && `Driving today: ${about}${formatKm(route.distanceKm)} · ${formatDuration(route.durationMin)}`,
        ].filter(Boolean),
        items: d.activities.map((a) => {
          const leg = legs.get(String(a.id));
          return {
            time: timeLines(a.timeSlot),
            name: a.placeName,
            cost: a.cost > 0 ? formatINR(a.cost) : '',
            meta: [a.category, a.estimatedDuration].filter(Boolean).join(' · '),
            description: a.description || '',
            tip: a.tips ? `Tip: ${a.tips}` : '',
            leg: leg ? `To the next stop: ${about}${formatKm(leg.distanceKm)} · ${formatDuration(leg.durationMin)} by road` : '',
          };
        }),
      };
    }),
    stays: (it.hotels ?? []).map((h) => ({
      name: h.name,
      detail: [h.budgetTier, h.pricePerNight > 0 && `${formatINR(h.pricePerNight)} per room per night (estimate)`].filter(Boolean).join(' · '),
      address: h.address || '',
    })),
    food: (it.restaurants ?? []).map((r) => ({
      name: r.name,
      detail: [r.cuisine, r.costForTwo > 0 && `${formatINR(r.costForTwo)} for two (estimate)`, r.dietaryTags?.length && r.dietaryTags.join(', ')].filter(Boolean).join(' · '),
      address: r.address || '',
    })),
    costs: BUDGET_BUCKETS.map((b) => ({ label: b.label, amount: formatINR(it.budgetBreakdown?.[b.key] ?? 0) })),
    total: formatINR(it.estimatedTotal),
    budget: hasBudget ? formatINR(it.totalBudget) : null,
    notes: [
      'All prices are estimates for the whole group. Check them before you book.',
      'Times are local (Indian Standard Time). Opening hours and road conditions can change.',
      'Travel to and from the destination is not included in the estimate.',
    ],
    share: shareUrl ? { url: shareUrl, sharedBy } : null,
    footer: `TripPlanner · ${it.title}`,
    made: `Made with TripPlanner on ${formatDate(isoDay(now))}`,
  };
};

// ── drawing ─────────────────────────────────────────────────────────────────────────

const PAGE = { size: 'A4', margins: { top: 56, bottom: 64, left: 50, right: 50 } };

const makeDoc = (content) => {
  const doc = new PDFDocument({
    ...PAGE,
    bufferPages: true,
    info: { Title: content.title, Author: 'TripPlanner', Subject: content.subtitle, Creator: 'TripPlanner' },
  });
  doc.registerFont('regular', FONTS.regular);
  doc.registerFont('bold', FONTS.bold);
  return doc;
};

/** Helpers bound to one document. */
const drawing = (doc) => {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const font = (name, size, color = COLOR.text) => doc.font(name).fontSize(size).fillColor(color);
  const heightOf = (text, name, size, w, options = {}) => {
    if (!text) return 0;
    font(name, size);
    return doc.heightOfString(text, { width: w, ...options });
  };
  const ensureSpace = (h) => {
    if (doc.y + h > bottom()) doc.addPage();
  };
  const rule = (color = COLOR.line, gap = 8) => {
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.7).strokeColor(color).stroke();
    doc.y += gap;
  };
  const label = (text, color = COLOR.accent) => {
    font('bold', 8.5, color).text(text.toUpperCase(), left, doc.y, { width, characterSpacing: 0.8 });
  };
  const sectionTitle = (text) => {
    ensureSpace(60);
    doc.y += 6;
    font('bold', 14, COLOR.ink).text(text, left, doc.y, { width });
    doc.y += 4;
    rule();
  };
  return { left, width, bottom, font, heightOf, ensureSpace, rule, label, sectionTitle };
};

const drawCover = (doc, d, c, qr) => {
  const qrSize = 92;
  const titleWidth = qr ? d.width - qrSize - 16 : d.width;
  const top = doc.y;
  d.label('Trip plan');
  doc.y += 2;
  d.font('bold', 24, COLOR.ink).text(c.title, d.left, doc.y, { width: titleWidth });
  doc.y += 2;
  d.font('regular', 10.5, COLOR.muted).text(c.subtitle, d.left, doc.y, { width: titleWidth });
  if (qr) {
    const x = d.left + d.width - qrSize;
    doc.image(qr, x, top, { width: qrSize });
    d.font('regular', 7.5, COLOR.muted).text('Scan to open this trip', x - 10, top + qrSize + 2, { width: qrSize + 20, align: 'center' });
    doc.y = Math.max(doc.y, top + qrSize + 16);
  }
  doc.y += 14;

  // facts: two columns of label / value
  const colWidth = (d.width - 20) / 2;
  const rows = [];
  for (let i = 0; i < c.facts.length; i += 2) rows.push(c.facts.slice(i, i + 2));
  for (const row of rows) {
    const y = doc.y;
    let h = 0;
    row.forEach(([name, value], k) => {
      const x = d.left + k * (colWidth + 20);
      d.font('regular', 8, COLOR.muted).text(name, x, y, { width: colWidth });
      d.font('bold', 10.5, COLOR.ink).text(value, x, y + 11, { width: colWidth });
      h = Math.max(h, 11 + d.heightOf(value, 'bold', 10.5, colWidth));
    });
    doc.y = y + h + 8;
  }
  if (c.verdict) {
    d.font('bold', 10, c.verdict.over ? COLOR.warn : COLOR.ok).text(c.verdict.text, d.left, doc.y, { width: d.width });
    doc.y += 6;
  }
  if (c.summary) {
    doc.y += 4;
    d.font('regular', 10, COLOR.text).text(c.summary, d.left, doc.y, { width: d.width, lineGap: 2 });
  }

  d.sectionTitle('Days at a glance');
  for (const g of c.glance) {
    const h = Math.max(14, d.heightOf(g.title, 'regular', 10, d.width - 230)) + 6;
    d.ensureSpace(h);
    const y = doc.y;
    d.font('bold', 10, COLOR.ink).text(g.day, d.left, y, { width: 50 });
    d.font('regular', 9.5, COLOR.muted).text(g.date, d.left + 52, y, { width: 90 });
    d.font('regular', 10, COLOR.text).text(g.title, d.left + 146, y, { width: d.width - 230 });
    d.font('bold', 10, COLOR.ink).text(g.cost, d.left + d.width - 80, y, { width: 80, align: 'right' });
    doc.y = y + h;
  }
};

const drawDay = (doc, d, day) => {
  doc.addPage();
  d.label(day.heading);
  doc.y += 2;
  d.font('bold', 18, COLOR.ink).text(day.title, d.left, doc.y, { width: d.width });
  if (day.description) {
    doc.y += 2;
    d.font('regular', 10, COLOR.muted).text(day.description, d.left, doc.y, { width: d.width });
  }
  if (day.facts.length) {
    doc.y += 4;
    d.font('bold', 9, COLOR.accent).text(day.facts.join('    '), d.left, doc.y, { width: d.width });
  }
  doc.y += 8;
  d.rule(COLOR.line, 12);

  const timeWidth = 96;
  const costWidth = 70;
  const x = d.left + timeWidth;
  const w = d.width - timeWidth;
  for (const item of day.items) {
    const nameWidth = w - (item.cost ? costWidth + 8 : 0);
    const height =
      Math.max(d.heightOf(item.name, 'bold', 11.5, nameWidth), item.time.length * 13) +
      d.heightOf(item.meta, 'regular', 8.5, w) +
      d.heightOf(item.description, 'regular', 9.5, w, { lineGap: 1.5 }) +
      d.heightOf(item.tip, 'regular', 9, w) +
      d.heightOf(item.leg, 'regular', 8.5, w) +
      22;
    d.ensureSpace(Math.min(height, 260));
    const y = doc.y;
    d.font('bold', 9, COLOR.accent).text(item.time[0], d.left, y + 2, { width: timeWidth - 10 });
    if (item.time[1]) d.font('regular', 8.5, COLOR.muted).text(item.time[1], d.left, doc.y, { width: timeWidth - 10 });
    const timeBottom = doc.y;
    d.font('bold', 11.5, COLOR.ink).text(item.name, x, y, { width: nameWidth });
    const nameBottom = doc.y;
    if (item.cost) d.font('bold', 10, COLOR.ink).text(item.cost, d.left + d.width - costWidth, y + 1, { width: costWidth, align: 'right' });
    doc.y = Math.max(nameBottom, y + 14);
    if (item.meta) d.font('regular', 8.5, COLOR.muted).text(item.meta, x, doc.y, { width: w });
    if (item.description) {
      doc.y += 2;
      d.font('regular', 9.5, COLOR.text).text(item.description, x, doc.y, { width: w, lineGap: 1.5 });
    }
    if (item.tip) {
      doc.y += 2;
      d.font('regular', 9, COLOR.warn).text(item.tip, x, doc.y, { width: w });
    }
    if (item.leg) {
      doc.y += 3;
      d.font('regular', 8.5, COLOR.muted).text(item.leg, x, doc.y, { width: w });
    }
    doc.y = Math.max(doc.y, timeBottom) + 8;
    d.rule(COLOR.soft, 10);
  }
};

const drawPlaces = (doc, d, title, places) => {
  if (!places.length) return;
  d.sectionTitle(title);
  for (const p of places) {
    const h = d.heightOf(p.name, 'bold', 10.5, d.width) + d.heightOf(p.detail, 'regular', 9, d.width) + d.heightOf(p.address, 'regular', 8.5, d.width) + 8;
    d.ensureSpace(h);
    d.font('bold', 10.5, COLOR.ink).text(p.name, d.left, doc.y, { width: d.width });
    if (p.detail) d.font('regular', 9, COLOR.text).text(p.detail, d.left, doc.y, { width: d.width });
    if (p.address) d.font('regular', 8.5, COLOR.muted).text(p.address, d.left, doc.y, { width: d.width });
    doc.y += 7;
  }
};

const drawCosts = (doc, d, c) => {
  d.sectionTitle('Cost estimate (whole group)');
  const row = (name, value, bold = false, color = COLOR.ink) => {
    d.ensureSpace(18);
    const y = doc.y;
    d.font(bold ? 'bold' : 'regular', 10, bold ? COLOR.ink : COLOR.text).text(name, d.left, y, { width: d.width - 110 });
    d.font('bold', 10, color).text(value, d.left + d.width - 110, y, { width: 110, align: 'right' });
    doc.y = y + 17;
  };
  for (const cost of c.costs) row(cost.label, cost.amount);
  d.rule(COLOR.line, 6);
  row('Estimated total', c.total, true);
  if (c.budget) row('Your budget', c.budget, true);
  if (c.verdict) row(c.verdict.label, c.verdict.amount, true, c.verdict.over ? COLOR.warn : COLOR.ok);
};

const drawEnd = (doc, d, c) => {
  doc.y += 10;
  d.ensureSpace(80);
  d.label('Good to know', COLOR.muted);
  doc.y += 2;
  for (const note of c.notes) d.font('regular', 8.5, COLOR.muted).text(`•  ${note}`, d.left, doc.y, { width: d.width });
  if (c.share) {
    doc.y += 10;
    d.font('regular', 9, COLOR.text).text('Open this trip online: ', d.left, doc.y, { width: d.width, continued: true });
    d.font('bold', 9, COLOR.accent).text(c.share.url, { link: c.share.url, underline: false });
  }
  doc.y += 4;
  d.font('regular', 8, COLOR.muted).text(c.made, d.left, doc.y, { width: d.width });
};

const drawFooters = (doc, c) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const { left, right, bottom } = doc.page.margins;
    const width = doc.page.width - left - right;
    const y = doc.page.height - bottom + 24;
    doc.page.margins.bottom = 0; // writing inside the bottom margin must not start a new page
    doc.moveTo(left, y - 8).lineTo(left + width, y - 8).lineWidth(0.5).strokeColor(COLOR.line).stroke();
    doc.font('regular').fontSize(8).fillColor(COLOR.muted);
    doc.text(c.footer, left, y, { width: width - 80, lineBreak: false, ellipsis: true });
    doc.text(`Page ${i + 1} of ${range.count}`, left + width - 80, y, { width: 80, align: 'right', lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
};

/**
 * @param {object} itinerary  normalized itinerary
 * @param {{ shareUrl?: string | null, sharedBy?: string | null, now?: Date }} options
 * @returns {Promise<Buffer>}
 */
export const renderTripPdf = async (itinerary, options = {}) => {
  const content = buildPdfContent(itinerary, options);
  const qr = content.share ? await QRCode.toBuffer(content.share.url, { margin: 1, width: 300, errorCorrectionLevel: 'M' }) : null;
  const doc = makeDoc(content);
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const d = drawing(doc);

  drawCover(doc, d, content, qr);
  for (const day of content.days) drawDay(doc, d, day);
  doc.addPage();
  drawPlaces(doc, d, 'Where to stay', content.stays);
  drawPlaces(doc, d, 'Where to eat', content.food);
  drawCosts(doc, d, content);
  drawEnd(doc, d, content);
  drawFooters(doc, content);
  doc.end();
  return done;
};

/** "TripPlanner - 4-Day Manali Adventure.pdf" (safe for every operating system). */
export const pdfFileName = (title) => `TripPlanner - ${String(title ?? 'Trip').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}.pdf`;
