// DOM elements
const themeCheckbox = document.getElementById('themeCheckbox');
const searchInput = document.getElementById('search');
const logsContainer = document.getElementById('logs');
const pagerContainer = document.getElementById('pager');
const loadingDiv = document.getElementById('loading');
const exportModal = document.getElementById('exportModal');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const dispenserFilterInput = document.getElementById('dispenserFilter');
const includeChartsCheckbox = document.getElementById('includeCharts');
const previewStatsDiv = document.getElementById('previewStats');
const statsTextSpan = document.getElementById('statsText');
const exportBtn = document.getElementById('exportBtn');

let db, auth;
let allLogs = [];
let pagedGroups = [];
let currentPage = 0;

// ================= THEME =================
function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('userTheme', isDark ? 'dark' : 'light');
  themeCheckbox.checked = isDark;
}
function toggleTheme(isDark) { applyTheme(isDark); }

// Initialize theme from localStorage
(function initTheme() {
  const isDark = (localStorage.getItem('userTheme') || 'light') === 'dark';
  applyTheme(isDark);
})();

// ================= FIREBASE INITIALIZATION =================
async function initializeFirebase() {
  try {
    const response = await fetch('/api/config');
    const firebaseConfig = await response.json();
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    auth = firebase.auth();
    console.log("Firebase connected successfully");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    logsContainer.innerHTML = "<p class='empty-state'>Failed to connect to database. Please refresh the page.</p>";
    loadingDiv.style.display = "none";
    throw error;
  }
}

// ================= PARSE TIMESTAMP =================
function parseTimestamp(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  try {
    const parts = timeStr.split(',');
    if (parts.length < 2) return null;
    const dateTimePart = parts[1].trim();
    const dateTimeComponents = dateTimePart.split(' ');
    if (dateTimeComponents.length < 2) return null;
    const datePart = dateTimeComponents[0];
    const timePart = dateTimeComponents[1];
    if (!datePart || !timePart) return null;
    const dateParts = datePart.split('-');
    const timeParts = timePart.split(':');
    if (dateParts.length !== 3 || timeParts.length !== 3) return null;
    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);
    const hours = Number(timeParts[0]);
    const minutes = Number(timeParts[1]);
    const seconds = Number(timeParts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    const d = new Date(year, month - 1, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? null : d;
  } catch (error) {
    console.error('Error parsing timestamp:', timeStr, error);
    return null;
  }
}

// ================= LOAD LOGS FROM FIREBASE =================
function loadLogs() {
  db.ref("logs").on("value", snap => {
    const data = snap.val() || {};
    allLogs = [];
    let skippedLogs = 0;
    Object.keys(data).forEach(dispenserId => {
      const dispenserLogs = data[dispenserId];
      Object.keys(dispenserLogs).forEach(logKey => {
        const logEntry = dispenserLogs[logKey];
        if (!logEntry) {
          skippedLogs++;
          return;
        }
        const parsedDate = parseTimestamp(logEntry.time);
        if (parsedDate) {
          allLogs.push({
            dispenserId: logEntry.id || dispenserId,
            status: logEntry.status || 'Unknown',
            time: logEntry.time || 'Unknown',
            parsedDate: parsedDate,
            timestamp: parsedDate.getTime()
          });
        } else {
          skippedLogs++;
        }
      });
    });
    allLogs = allLogs.filter(log => {
  const h = log.parsedDate.getHours();
  return h >= 7 && (h < 16 || (h === 16 && log.parsedDate.getMinutes() === 0));
});
    console.log(`Loaded ${allLogs.length} valid logs`);
    if (skippedLogs > 0) console.warn(`Skipped ${skippedLogs} logs with invalid or missing timestamps`);
    paginateLogs(allLogs);
    renderPage();
    loadingDiv.style.display = "none";
  });
}

// ================= PAGINATION =================
function paginateLogs(logs) {
  const grouped = {};
  logs.forEach(l => {
    if (!l.parsedDate) return;
    const y = l.parsedDate.getFullYear();
    const m = String(l.parsedDate.getMonth() + 1).padStart(2, '0');
    const d = String(l.parsedDate.getDate()).padStart(2, '0');
    const dayKey = `${y}-${m}-${d}`;
    grouped[dayKey] = grouped[dayKey] || [];
    grouped[dayKey].push(l);
  });
  const dayEntries = Object.entries(grouped).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  pagedGroups = [];
  for (let i = 0; i < dayEntries.length; i += 7) {
    pagedGroups.push(dayEntries.slice(i, i + 7));
  }
  currentPage = 0;
}

function renderPage() {
  logsContainer.innerHTML = "";
  if (!pagedGroups.length) {
    logsContainer.innerHTML = "<p class='empty-state'>No logs available.</p>";
    return;
  }
  pagedGroups[currentPage].forEach(([dateKey, entries]) => {
    const section = document.createElement("div");
    section.className = "day-section";
    const header = document.createElement("div");
    header.className = "day-header";
    const dateText = new Date(dateKey).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    header.innerHTML = `<span>${dateText}</span><span class="toggle-icon">&#9660;</span>`;
    header.onclick = () => section.classList.toggle("open");
    const logEntries = document.createElement("div");
    logEntries.className = "log-entries";
    entries.forEach(l => {
      const card = document.createElement("div");
      card.className = "log-card";
      const statusClass = (l.status || "").toLowerCase();
      const statusBadge = `<span class="status-badge ${statusClass}">${escapeHtml(l.status)}</span>`;
      const timeDisplay = l.parsedDate
        ? l.parsedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        : escapeHtml(l.time);
      card.innerHTML = `
        <div class="log-row"><span class="log-label">Dispenser:</span><span class="log-value">${escapeHtml(l.dispenserId)}</span></div>
        <div class="log-row"><span class="log-label">Status:</span><span class="log-value">${statusBadge}</span></div>
        <div class="log-row"><span class="log-label">Time:</span><span class="log-value">${timeDisplay}</span></div>
      `;
      logEntries.appendChild(card);
    });
    section.appendChild(header);
    section.appendChild(logEntries);
    logsContainer.appendChild(section);
  });
  renderPager();
}

function renderPager() {
  pagerContainer.innerHTML = "";
  if (pagedGroups.length <= 1) return;
  pagedGroups.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.textContent = (i + 1);
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => {
      currentPage = i;
      renderPage();
    };
    pagerContainer.appendChild(btn);
  });
}

function filterLogs() {
  const q = searchInput.value.toLowerCase();
  const filtered = allLogs.filter(l =>
    l.dispenserId.toLowerCase().includes(q) ||
    (l.status || "").toLowerCase().includes(q) ||
    (l.time || "").toLowerCase().includes(q)
  );
  paginateLogs(filtered);
  renderPage();
}

// ================= EXPORT MODAL =================
function showExportModal() {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);
  startDateInput.value = formatDateForInput(weekAgo);
  endDateInput.value = formatDateForInput(today);
  exportModal.classList.add('active');
  updateDateRange();
}
function closeExportModal() {
  exportModal.classList.remove('active');
}
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function updateDateRange() {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const dispenserFilter = dispenserFilterInput.value.trim();
  if (!startDate || !endDate) {
    previewStatsDiv.style.display = 'none';
    return;
  }
  const filteredLogs = getLogsInRange(startDate, endDate, dispenserFilter);
  if (filteredLogs.length === 0) {
    statsTextSpan.textContent = 'No logs found in this date range.';
    exportBtn.disabled = true;
  } else {
    const dispensers = new Set(filteredLogs.map(l => l.dispenserId)).size;
    statsTextSpan.textContent = `${filteredLogs.length} log entries from ${dispensers} dispenser(s)`;
    exportBtn.disabled = false;
  }
  previewStatsDiv.style.display = 'block';
}
function getLogsInRange(startDateStr, endDateStr, dispenserFilter) {
  const start = new Date(startDateStr);
  start.setHours(7, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(16, 0, 59, 999);
  return allLogs.filter(log => {
    if (!log.parsedDate) return false;
    const logTime = log.parsedDate.getTime();
    const inRange = logTime >= start.getTime() && logTime <= end.getTime();
    if (!inRange) return false;
    if (dispenserFilter && !log.dispenserId.toLowerCase().includes(dispenserFilter.toLowerCase())) return false;
    return true;
  });
}
function exportToPDF() {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const dispenserFilter = dispenserFilterInput.value.trim();
  const includeCharts = includeChartsCheckbox.checked;
  if (!startDate || !endDate) {
    showWarning('Missing Dates', 'Please select both start and end dates to continue.');
    return;
  }
  if (new Date(endDate) < new Date(startDate)) {
    showWarning('Invalid Date Range', 'End date must be after or equal to start date.');
    return;
  }
  const filteredLogs = getLogsInRange(startDate, endDate, dispenserFilter);
  const startDateLogs = filteredLogs.filter(log => formatDateForInput(log.parsedDate) === startDate);
  const endDateLogs = filteredLogs.filter(log => formatDateForInput(log.parsedDate) === endDate);
  let warningMessage = '';
  if (startDateLogs.length === 0 && endDateLogs.length === 0) {
    warningMessage = `No logs found for both selected dates:\nStart Date (${startDate}): No data\nEnd Date (${endDate}): No data\n\nPlease select dates with available data.`;
  } else if (startDateLogs.length === 0) {
    warningMessage = `No logs found for start date (${startDate}).\n\nPlease select a start date with available data.`;
  } else if (endDateLogs.length === 0) {
    warningMessage = `No logs found for end date (${endDate}).\n\nPlease select an end date with available data.`;
  }
  if (warningMessage) {
    showWarning('Date Range Issue', warningMessage);
    return;
  }
  if (filteredLogs.length === 0) {
    showWarning('No Data Found', 'No logs found in the selected date range.');
    return;
  }
  const logsByDay = {};
  filteredLogs.forEach(log => {
    const dateKey = formatDateForInput(log.parsedDate);
    if (!logsByDay[dateKey]) logsByDay[dateKey] = [];
    logsByDay[dateKey].push(log);
  });
  const sortedDays = Object.keys(logsByDay).sort((a, b) => new Date(b) - new Date(a));
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont('helvetica');
  doc.setFontSize(24);
  doc.setTextColor(53, 59, 167);
  doc.text('Dispenser Logs Report', 105, 40, { align: 'center' });
  doc.setDrawColor(53, 59, 167);
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 65, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(53, 59, 167);
  doc.text('Report Period', 105, 80, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const formatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  const startDateFormatted = startDateObj.toLocaleDateString('en-US', formatOptions);
  const endDateFormatted = endDateObj.toLocaleDateString('en-US', formatOptions);
  doc.text('From: ' + startDateFormatted, 105, 90, { align: 'center' });
  doc.text('To: ' + endDateFormatted, 105, 98, { align: 'center' });
  if (dispenserFilter) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Filtered by Dispenser: ${dispenserFilter}`, 105, 108, { align: 'center' });
  }
  let yPos = dispenserFilter ? 120 : 115;
  if (includeCharts) {
    doc.setFontSize(16);
    doc.setTextColor(53, 59, 167);
    doc.text('Summary Statistics', 105, yPos, { align: 'center' });
    yPos += 3;
    doc.setDrawColor(53, 59, 167);
    doc.setLineWidth(0.3);
    doc.line(60, yPos, 150, yPos);
    yPos += 10;
    const statusCounts = {};
    const dispenserCounts = {};
    filteredLogs.forEach(log => {
      const status = log.status || 'Unknown';
      const dispenser = log.dispenserId;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      dispenserCounts[dispenser] = (dispenserCounts[dispenser] || 0) + 1;
    });
    doc.setFillColor(245, 246, 250);
    doc.roundedRect(40, yPos, 130, 35, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text('Total Logs: ' + filteredLogs.length, 50, yPos + 10);
    doc.text('Unique Dispensers: ' + Object.keys(dispenserCounts).length, 50, yPos + 18);
    doc.text('Days Covered: ' + sortedDays.length, 50, yPos + 26);
    yPos += 45;
    doc.setFontSize(12);
    doc.setTextColor(53, 59, 167);
    doc.text('Status Distribution', 14, yPos);
    yPos += 3;
    const statusData = Object.entries(statusCounts).map(([status, count]) => [
      status,
      count.toString(),
      `${((count / filteredLogs.length) * 100).toFixed(1)}%`
    ]);
    doc.autoTable({
      startY: yPos,
      head: [['Status', 'Count', 'Percentage']],
      body: statusData,
      theme: 'striped',
      headStyles: { fillColor: [53, 59, 167], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'center' } },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: 14, right: 14 }
    });
    yPos = doc.lastAutoTable.finalY + 15;
  }
  doc.addPage();
  yPos = 20;
  doc.setFontSize(18);
  doc.setTextColor(53, 59, 167);
  doc.text('Detailed Logs by Day', 105, yPos, { align: 'center' });
  yPos += 3;
  doc.setDrawColor(53, 59, 167);
  doc.setLineWidth(0.3);
  doc.line(50, yPos, 160, yPos);
  yPos += 15;
  sortedDays.forEach((dateKey, dayIndex) => {
    const dayLogs = logsByDay[dateKey];
    const dateObj = new Date(dateKey);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFillColor(53, 59, 167);
    doc.roundedRect(14, yPos - 5, 182, 10, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(formattedDate, 16, yPos + 2);
    doc.text(dayLogs.length + ' entries', 190, yPos + 2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    const tableData = dayLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(log => {
        const time = log.parsedDate
          ? log.parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
          : log.time;
        return [time, log.dispenserId, log.status || 'Unknown'];
      });
    doc.autoTable({
      startY: yPos,
      head: [['Time', 'Dispenser ID', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [104, 138, 232], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'center', cellWidth: 40 }, 1: { halign: 'left', cellWidth: 70 }, 2: { halign: 'center', cellWidth: 'auto' } },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 246, 250] },
      margin: { left: 14, right: 14 },
      willDrawCell: function(data) {
        if (data.section === 'body' && data.column.index === 2) {
          const status = data.cell.raw.toLowerCase();
          let color;
          switch(status) {
            case 'full': case 'online': color = [40, 167, 69]; break;
            case 'mid': color = [23, 162, 184]; break;
            case 'critical': color = [255, 193, 7]; break;
            case 'empty': color = [253, 126, 20]; break;
            case 'offline': color = [220, 53, 69]; break;
            default: color = [128, 128, 128];
          }
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    yPos = doc.lastAutoTable.finalY + 12;
    if (dayIndex < sortedDays.length - 1) {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(30, yPos - 5, 180, yPos - 5);
      }
    }
  });
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    doc.text('Dispenser Management System', 14, doc.internal.pageSize.height - 10);
  }
  const filename = `dispenser-logs-${startDate}-to-${endDate}.pdf`;
  doc.save(filename);
  closeExportModal();
  setTimeout(() => {
    alert(`PDF exported successfully!\n\nFilename: ${filename}\nTotal Logs: ${filteredLogs.length}\nDays Covered: ${sortedDays.length}`);
  }, 100);
}
function showWarning(title, message) {
  const warningDiv = document.createElement('div');
  warningDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--modal-bg, white);
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 10001;
    max-width: 400px;
    width: 90%;
  `;
  warningDiv.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 18px; font-weight: 700; color: #333; margin-bottom: 10px;">${title}</div>
      <div style="font-size: 14px; color: #666; line-height: 1.6; white-space: pre-line;">${message}</div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        margin-top: 20px;
        padding: 10px 30px;
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
      ">OK</button>
    </div>
  `;
  document.body.appendChild(warningDiv);
  setTimeout(() => {
    if (warningDiv.parentElement) warningDiv.remove();
  }, 10000);
}
exportModal.addEventListener('click', function(e) {
  if (e.target === this) closeExportModal();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeExportModal();
});

// ================= HELPER =================
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ================= START =================
(async function init() {
  try {
    await initializeFirebase();
    await auth.signInAnonymously();
    loadLogs();
  } catch (err) {
    console.error("Initialization error:", err);
    logsContainer.innerHTML = "<p class='empty-state'>Authentication failed.</p>";
    loadingDiv.style.display = "none";
  }
})();
