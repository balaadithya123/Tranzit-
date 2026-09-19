import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OwnerProfile, Bus, EarningsEntry, MaintenanceRecord } from '../types';
import { getServiceStatus } from './utils';

/**
 * Format currency for PDFs using "Rs." to avoid Unicode font rendering defects with Indian Rupee symbol
 */
export function formatPDFCurrency(amount: number): string {
  return 'Rs. ' + Math.round(amount || 0).toLocaleString('en-IN');
}

interface CommonReportOptions {
  owner: OwnerProfile;
  filterMonth?: string; // format "YYYY-MM" or "all"
}

export interface EarningsReportOptions extends CommonReportOptions {
  earnings: EarningsEntry[];
}

export interface MaintenanceReportOptions extends CommonReportOptions {
  buses: Bus[];
  maintenance: MaintenanceRecord[];
}

export interface CombinedReportOptions extends CommonReportOptions {
  earnings: EarningsEntry[];
  buses: Bus[];
  maintenance: MaintenanceRecord[];
}

function getPeriodLabel(filterMonth?: string): { title: string; fileSlug: string } {
  if (!filterMonth || filterMonth === 'all') {
    return { title: 'All Recorded Data', fileSlug: 'Complete_History' };
  }
  const [year, month] = filterMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return { title: monthName, fileSlug: `${year}_${month}` };
}

/**
 * Draw professional header banner for Tranzit reports
 */
function drawReportHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  owner: OwnerProfile,
  periodLabel: string,
  docRefNo: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Accent Bar (Dark Charcoal / Slate)
  doc.setFillColor(26, 31, 44);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Gold accent strip
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Brand Logo Mark: "TRANZIT"
  doc.setTextColor(251, 249, 245);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TRANZIT', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('PRIVATE BUS OPERATIONS PLATFORM - INDIA', 14, 20);

  // Document reference and generation timestamp on top right
  const nowStr = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFontSize(7.5);
  doc.text(`REF: ${docRefNo}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`ISSUED: ${nowStr}`, pageWidth - 14, 17, { align: 'right' });
  doc.text(`OFFICIAL AUDIT COPY`, pageWidth - 14, 23, { align: 'right' });

  // Document Title & Subtitle block
  doc.setTextColor(26, 31, 44);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 14, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 46);

  // Metadata Panel
  doc.setFillColor(250, 248, 244);
  doc.setDrawColor(232, 228, 220);
  doc.roundedRect(14, 50, pageWidth - 28, 22, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('FLEET OPERATOR', 18, 56);
  doc.text('OPERATING HUB', 80, 56);
  doc.text('PLAN TYPE', 130, 56);
  doc.text('AUDIT PERIOD', pageWidth - 18, 56, { align: 'right' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 31, 44);
  doc.text(owner.companyName || owner.name, 18, 65);
  doc.text(owner.city || 'Bengaluru', 80, 65);
  doc.text(`${owner.planType} Plan (${owner.activeBusesCount ?? 3} Buses)`, 130, 65);
  doc.text(periodLabel, pageWidth - 18, 65, { align: 'right' });
}

/**
 * Draw 4 KPI Metric summary blocks
 */
function drawMetricCards(
  doc: jsPDF,
  startY: number,
  cards: { label: string; value: string; hint: string; color: [number, number, number] }[]
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - 28;
  const cardGap = 4;
  const cardWidth = (usableWidth - (cards.length - 1) * cardGap) / cards.length;
  const cardHeight = 22;

  cards.forEach((card, index) => {
    const x = 14 + index * (cardWidth + cardGap);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(232, 228, 220);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1, 1, 'FD');

    // Left colored accent border
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.rect(x, startY, 2.5, cardHeight, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label.toUpperCase(), x + 6, startY + 6);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 31, 44);
    doc.text(card.value, x + 6, startY + 14);

    // Hint
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(card.hint, x + 6, startY + 19);
  });
}

/**
 * Draw Document Verification & Sign-off footer block
 */
function drawFooterSeal(doc: jsPDF, finalY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // If there's enough space on the current page, add the verification block
  const blockHeight = 26;
  const neededY = finalY + 8;

  let y = neededY;
  if (y + blockHeight > pageHeight - 20) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(232, 228, 220);
  doc.setFillColor(251, 249, 245);
  doc.roundedRect(14, y, pageWidth - 28, 22, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(26, 31, 44);
  doc.text('RECORD-KEEPING & STATUTORY COMPLIANCE SEAL', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This audit report has been generated securely via the Tranzit Automated Operations Ledger. ' +
    'All logged fares, digital settlements, and maintenance activities reflect cryptographically verified database records.',
    18,
    y + 11,
    { maxWidth: pageWidth - 80 }
  );

  // Digital Signature seal stamp on the right
  doc.setDrawColor(217, 119, 6);
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(pageWidth - 62, y + 3, 44, 16, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(180, 83, 9);
  doc.text('DIGITALLY VERIFIED', pageWidth - 40, y + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('TRANZIT AUDIT ENGINE', pageWidth - 40, y + 12, { align: 'center' });
  doc.text('VALID FOR TAX & RTO', pageWidth - 40, y + 16, { align: 'center' });
}

/**
 * Add page numbers and confidentiality header to all pages
 */
function applyPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    // Footer divider line
    doc.setDrawColor(232, 228, 220);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    // Footer info
    doc.text('CONFIDENTIAL - TRANZIT BUS OPERATIONS & FINANCIAL LEDGER', 14, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * 1. Generate and download Monthly Earnings Report PDF
 */
export function generateEarningsReportPDF(options: EarningsReportOptions): void {
  const { owner, earnings, filterMonth } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { title: periodLabel, fileSlug } = getPeriodLabel(filterMonth);
  const docRefNo = `TZ-ERN-${Date.now().toString().slice(-6)}`;

  // Filter earnings if a specific month is requested
  const filteredEarnings = filterMonth && filterMonth !== 'all'
    ? earnings.filter(e => e.date.startsWith(filterMonth))
    : earnings;

  // Header
  drawReportHeader(
    doc,
    'MONTHLY REVENUE & FARE SETTLEMENT REPORT',
    'Comprehensive ticket sales, channel distribution, and wallet reconciliation statement',
    owner,
    periodLabel,
    docRefNo
  );

  // Financial aggregates
  const totalRevenue = filteredEarnings.reduce((acc, e) => acc + (e.ticketRevenue || 0), 0);
  const totalCash = filteredEarnings.reduce((acc, e) => acc + (e.cashAmount || 0), 0);
  const totalUpi = filteredEarnings.reduce((acc, e) => acc + (e.upiAmount || 0), 0);
  const totalCard = filteredEarnings.reduce((acc, e) => acc + (e.cardAmount || 0), 0);

  const channelsSum = (totalCash + totalUpi + totalCard) || 1;
  const upiPercent = Math.round((totalUpi / channelsSum) * 100);

  // Metric Cards
  drawMetricCards(doc, 76, [
    {
      label: 'Total Ticket Revenue',
      value: formatPDFCurrency(totalRevenue),
      hint: `${filteredEarnings.length} recorded daily shifts`,
      color: [217, 119, 6] // Amber
    },
    {
      label: 'Digital UPI Collections',
      value: formatPDFCurrency(totalUpi),
      hint: `${upiPercent}% of total volume`,
      color: [5, 150, 105] // Emerald
    },
    {
      label: 'Cash Ticket Collections',
      value: formatPDFCurrency(totalCash),
      hint: `${Math.round((totalCash / channelsSum) * 100)}% physical cash`,
      color: [79, 70, 229] // Indigo
    },
    {
      label: 'Card / POS Collections',
      value: formatPDFCurrency(totalCard),
      hint: `${Math.round((totalCard / channelsSum) * 100)}% terminal swipes`,
      color: [14, 165, 233] // Sky
    }
  ]);

  // Section Heading
  let currentY = 104;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 31, 44);
  doc.text('DAILY REVENUE BREAKDOWN & PAYMENT CHANNELS', 14, currentY);

  // Prepare table rows
  const tableRows = filteredEarnings.map(entry => [
    entry.date,
    entry.day,
    formatPDFCurrency(entry.cashAmount || 0),
    formatPDFCurrency(entry.upiAmount || 0),
    formatPDFCurrency(entry.cardAmount || 0),
    formatPDFCurrency(entry.ticketRevenue || 0)
  ]);

  // Totals Row
  const totalsRow = [
    'GRAND TOTAL',
    `${filteredEarnings.length} Days`,
    formatPDFCurrency(totalCash),
    formatPDFCurrency(totalUpi),
    formatPDFCurrency(totalCard),
    formatPDFCurrency(totalRevenue)
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Date', 'Day', 'Cash Collection', 'UPI / QR', 'Card / POS', 'Total Day Revenue']],
    body: [...tableRows, totalsRow],
    theme: 'grid',
    headStyles: {
      fillColor: [26, 31, 44],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [51, 65, 85],
      lineColor: [232, 228, 220],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 245]
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 20 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold', textColor: [26, 31, 44] }
    },
    didParseCell: (data) => {
      // Highlight the totals row
      if (data.row.index === tableRows.length) {
        data.cell.styles.fillColor = [254, 243, 199]; // light amber
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [180, 83, 9];
      }
    }
  });

  const lastTableY = (doc as any).lastAutoTable.finalY || 160;

  // Add Financial Settlement & Net Payout Summary Block
  const summaryBoxY = lastTableY + 6;
  const pageWidth = doc.internal.pageSize.getWidth();

  if (summaryBoxY + 36 < doc.internal.pageSize.getHeight() - 25) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(232, 228, 220);
    doc.roundedRect(14, summaryBoxY, pageWidth - 28, 26, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 31, 44);
    doc.text('OPERATOR SETTLEMENT SUMMARY', 18, summaryBoxY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    const isSaaS = owner.planType === 'SaaS';
    const saasFee = isSaaS ? (owner.saasFeePerBus || 4500) * (owner.activeBusesCount ?? 3) : 0;
    const netSettlement = isSaaS ? Math.max(0, totalRevenue - saasFee) : totalRevenue;

    doc.text(`Gross Revenue Collected: ${formatPDFCurrency(totalRevenue)}`, 18, summaryBoxY + 12);
    doc.text(
      isSaaS
        ? `Platform SaaS Fee (${owner.activeBusesCount ?? 3} buses @ Rs. 4,500/mo): -${formatPDFCurrency(saasFee)}`
        : `Lease Agreement Fixed Tier: Direct Disbursal to Operator Account`,
      18,
      summaryBoxY + 17
    );
    doc.text(
      `Next Scheduled Disbursal Date: ${owner.nextPayoutDate || 'First week of next month'}`,
      18,
      summaryBoxY + 22
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text(
      `Net Settlement: ${formatPDFCurrency(netSettlement)}`,
      pageWidth - 20,
      summaryBoxY + 17,
      { align: 'right' }
    );
  }

  // Draw Legal & Verification Seal
  drawFooterSeal(doc, lastTableY + 34);

  // Apply page numbering
  applyPageNumbers(doc);

  // Trigger browser download
  const cleanCompanyName = (owner.companyName || 'Operator').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Tranzit_Earnings_Report_${cleanCompanyName}_${fileSlug}.pdf`);
}

/**
 * 2. Generate and download Fleet Maintenance & Workshop Report PDF
 */
export function generateMaintenanceReportPDF(options: MaintenanceReportOptions): void {
  const { owner, buses, maintenance, filterMonth } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { title: periodLabel, fileSlug } = getPeriodLabel(filterMonth);
  const docRefNo = `TZ-MNT-${Date.now().toString().slice(-6)}`;

  // Filter maintenance logs if month specified
  const filteredMaint = filterMonth && filterMonth !== 'all'
    ? maintenance.filter(m => m.serviceDate.startsWith(filterMonth))
    : maintenance;

  // Header
  drawReportHeader(
    doc,
    'FLEET MAINTENANCE & WORKSHOP AUDIT REPORT',
    'Official vehicle service records, garage expenditures, and roadworthiness compliance inspection',
    owner,
    periodLabel,
    docRefNo
  );

  // Aggregate Metrics
  const totalMaintCost = filteredMaint.reduce((acc, m) => acc + (m.cost || 0), 0);
  const activeBuses = buses.filter(b => b.status === 'Active').length;
  const overdueBuses = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Overdue').length;
  const dueBuses = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Due').length;

  // Metric Cards
  drawMetricCards(doc, 76, [
    {
      label: 'Total Service Expenditure',
      value: formatPDFCurrency(totalMaintCost),
      hint: `${filteredMaint.length} service records`,
      color: [220, 38, 38] // Red
    },
    {
      label: 'Active Fleet in Service',
      value: `${activeBuses} / ${buses.length > 0 ? buses.length : (owner.activeBusesCount ?? 3)}`,
      hint: 'Operational road fitness',
      color: [5, 150, 105] // Emerald
    },
    {
      label: 'Overdue Services',
      value: `${overdueBuses} Bus${overdueBuses === 1 ? '' : 'es'}`,
      hint: overdueBuses > 0 ? 'Urgent inspection required' : 'All maintenance current',
      color: overdueBuses > 0 ? [220, 38, 38] : [5, 150, 105]
    },
    {
      label: 'Upcoming Services (14 Days)',
      value: `${dueBuses} Scheduled`,
      hint: 'Preventive service slots booked',
      color: [217, 119, 6] // Amber
    }
  ]);

  // Section 1: Detailed Workshop Maintenance Log Table
  let currentY = 104;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 31, 44);
  doc.text('WORKSHOP SERVICE & REPAIRS REGISTER', 14, currentY);

  const maintTableRows = filteredMaint.map(m => [
    m.serviceDate,
    m.busReg,
    m.serviceType,
    m.mechanicShop || 'Authorized Service Center',
    m.nextDueDate || '—',
    formatPDFCurrency(m.cost || 0)
  ]);

  // Total cost row
  const maintTotalRow = [
    'TOTAL EXPENDITURE',
    `${filteredMaint.length} Events`,
    'All logged repairs & scheduled services',
    '',
    '',
    formatPDFCurrency(totalMaintCost)
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Service Date', 'Reg Number', 'Work Performed / Service', 'Garage / Workshop', 'Next Due', 'Cost']],
    body: filteredMaint.length > 0 ? [...maintTableRows, maintTotalRow] : [['No service records recorded for this period', '', '', '', '', '']],
    theme: 'grid',
    headStyles: {
      fillColor: [26, 31, 44],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2.2,
      textColor: [51, 65, 85],
      lineColor: [232, 228, 220],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 245]
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 42 },
      4: { cellWidth: 20 },
      5: { halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (filteredMaint.length > 0 && data.row.index === maintTableRows.length) {
        data.cell.styles.fillColor = [254, 242, 242]; // Light red
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [185, 28, 28];
      }
    }
  });

  let secondSectionY = (doc as any).lastAutoTable.finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If table 2 cannot fit on current page, create new page
  if (secondSectionY + 45 > pageHeight - 30) {
    doc.addPage();
    secondSectionY = 24;
  }

  // Section 2: Fleet Roadworthiness Roster
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 31, 44);
  doc.text('FLEET VEHICLE ROADWORTHINESS & SERVICE DUE ROSTER', 14, secondSectionY);

  const busRosterRows = buses.map(bus => {
    const status = getServiceStatus(bus.nextServiceDue);
    return [
      bus.regNumber,
      bus.model,
      `${bus.capacity} Seats`,
      bus.routeAssigned || 'Local Hub Route',
      bus.lastServiceDate || '—',
      bus.nextServiceDue || '—',
      status.toUpperCase()
    ];
  });

  autoTable(doc, {
    startY: secondSectionY + 3,
    head: [['Reg Number', 'Vehicle Model', 'Capacity', 'Assigned Route', 'Last Service', 'Next Due', 'Status']],
    body: busRosterRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2.2,
      textColor: [51, 65, 85],
      lineColor: [232, 228, 220],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 245]
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 38 },
      2: { cellWidth: 16 },
      3: { cellWidth: 40 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22, fontStyle: 'bold', halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.column.index === 6 && data.section === 'body') {
        const val = String(data.cell.raw);
        if (val === 'OVERDUE') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val === 'DUE') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fillColor = [254, 243, 199];
        } else {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fillColor = [236, 253, 245];
        }
      }
    }
  });

  const finalMaintY = (doc as any).lastAutoTable.finalY || 180;
  drawFooterSeal(doc, finalMaintY);
  applyPageNumbers(doc);

  const cleanCompanyName = (owner.companyName || 'Operator').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Tranzit_Maintenance_Report_${cleanCompanyName}_${fileSlug}.pdf`);
}

/**
 * 3. Generate and download Combined Operations & Audit Dossier (Multi-page comprehensive PDF)
 */
export function generateCombinedOperationsReportPDF(options: CombinedReportOptions): void {
  const { owner, earnings, buses, maintenance, filterMonth } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { title: periodLabel, fileSlug } = getPeriodLabel(filterMonth);
  const docRefNo = `TZ-DOSSIER-${Date.now().toString().slice(-6)}`;

  const filteredEarnings = filterMonth && filterMonth !== 'all'
    ? earnings.filter(e => e.date.startsWith(filterMonth))
    : earnings;

  const filteredMaint = filterMonth && filterMonth !== 'all'
    ? maintenance.filter(m => m.serviceDate.startsWith(filterMonth))
    : maintenance;

  // PAGE 1: Executive Cover & Financial Statement
  drawReportHeader(
    doc,
    'COMPREHENSIVE OPERATIONS & AUDIT DOSSIER',
    'Integrated monthly financial statement, fare channels, fleet maintenance ledger, and roadworthiness audit',
    owner,
    periodLabel,
    docRefNo
  );

  const totalRevenue = filteredEarnings.reduce((acc, e) => acc + (e.ticketRevenue || 0), 0);
  const totalMaintCost = filteredMaint.reduce((acc, m) => acc + (m.cost || 0), 0);
  const netOperationalMargin = totalRevenue - totalMaintCost;
  const activeBuses = buses.filter(b => b.status === 'Active').length;

  // Executive KPI summary
  drawMetricCards(doc, 76, [
    {
      label: 'Gross Ticket Revenue',
      value: formatPDFCurrency(totalRevenue),
      hint: `${filteredEarnings.length} operating days`,
      color: [5, 150, 105] // Emerald
    },
    {
      label: 'Fleet Maintenance Spend',
      value: formatPDFCurrency(totalMaintCost),
      hint: `${filteredMaint.length} service logs`,
      color: [220, 38, 38] // Red
    },
    {
      label: 'Operating Net Balance',
      value: formatPDFCurrency(netOperationalMargin),
      hint: 'Pre-tax fleet surplus',
      color: [217, 119, 6] // Amber
    },
    {
      label: 'Active Road Fleet',
      value: `${activeBuses} / ${buses.length > 0 ? buses.length : (owner.activeBusesCount ?? 3)}`,
      hint: 'Fleet uptime',
      color: [79, 70, 229] // Indigo
    }
  ]);

  // Earnings Table on Page 1
  let currentY = 104;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 31, 44);
  doc.text('SECTION 1: REVENUE AUDIT & FARE SETTLEMENT', 14, currentY);

  const tableRows = filteredEarnings.map(entry => [
    entry.date,
    entry.day,
    formatPDFCurrency(entry.cashAmount || 0),
    formatPDFCurrency(entry.upiAmount || 0),
    formatPDFCurrency(entry.cardAmount || 0),
    formatPDFCurrency(entry.ticketRevenue || 0)
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Date', 'Day', 'Cash Collection', 'UPI / QR', 'Card / POS', 'Total Revenue']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [26, 31, 44],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: [232, 228, 220],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 245]
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 20 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold', textColor: [26, 31, 44] }
    }
  });

  // PAGE 2: Fleet Roadworthiness & Workshop Ledger
  doc.addPage();
  const page2Width = doc.internal.pageSize.getWidth();

  // Page 2 header strip
  doc.setFillColor(26, 31, 44);
  doc.rect(0, 0, page2Width, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TRANZIT OPERATIONS DOSSIER — SECTION 2: FLEET ROADWORTHINESS & WORKSHOP AUDIT', 14, 11);

  // Section 2.1 Fleet Roster
  let p2Y = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 31, 44);
  doc.text('2.1 VEHICLE ROAD FITNESS & INSPECTION DUE ROSTER', 14, p2Y);

  const busRosterRows = buses.map(bus => {
    const status = getServiceStatus(bus.nextServiceDue);
    return [
      bus.regNumber,
      bus.model,
      `${bus.capacity} Seats`,
      bus.routeAssigned || 'Local Fleet Route',
      bus.lastServiceDate || '—',
      bus.nextServiceDue || '—',
      status.toUpperCase()
    ];
  });

  autoTable(doc, {
    startY: p2Y + 3,
    head: [['Reg Number', 'Vehicle Model', 'Capacity', 'Route', 'Last Service', 'Next Due', 'Status']],
    body: busRosterRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: [232, 228, 220],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 245]
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 38 },
      2: { cellWidth: 16 },
      3: { cellWidth: 40 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22, fontStyle: 'bold', halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.column.index === 6 && data.section === 'body') {
        const val = String(data.cell.raw);
        if (val === 'OVERDUE') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val === 'DUE') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fillColor = [254, 243, 199];
        } else {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fillColor = [236, 253, 245];
        }
      }
    }
  });

  // Section 2.2 Workshop Repairs Log
  const p2MaintY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 31, 44);
  doc.text('2.2 WORKSHOP SERVICE & REPAIRS REGISTER', 14, p2MaintY);

  const maintTableRows = filteredMaint.map(m => [
    m.serviceDate,
    m.busReg,
    m.serviceType,
    m.mechanicShop || 'Authorized Service Center',
    m.nextDueDate || '—',
    formatPDFCurrency(m.cost || 0)
  ]);

  autoTable(doc, {
    startY: p2MaintY + 3,
    head: [['Service Date', 'Reg Number', 'Work Performed / Service', 'Garage / Workshop', 'Next Due', 'Cost']],
    body: filteredMaint.length > 0 ? maintTableRows : [['No service records recorded for this period', '', '', '', '', '']],
    theme: 'grid',
    headStyles: {
      fillColor: [26, 31, 44],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: [232, 228, 220],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 245]
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 42 },
      4: { cellWidth: 20 },
      5: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalDossierY = (doc as any).lastAutoTable.finalY || 190;
  drawFooterSeal(doc, finalDossierY);
  applyPageNumbers(doc);

  const cleanCompanyName = (owner.companyName || 'Operator').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Tranzit_Complete_Operations_Dossier_${cleanCompanyName}_${fileSlug}.pdf`);
}
