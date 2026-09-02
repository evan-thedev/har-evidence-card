const state = {
    harData: null,
    fileName: '',
    slowestLimit: 10
};

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const uploadSection = document.getElementById('uploadSection');
const cardSection = document.getElementById('cardSection');
const errorMessage = document.getElementById('errorMessage');
const copyMarkdownBtn = document.getElementById('copyMarkdownBtn');
const resetBtn = document.getElementById('resetBtn');
const slowestLimitSelect = document.getElementById('slowestLimit');
const toast = document.getElementById('toast');

function init() {
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    loadSampleBtn.addEventListener('click', loadSampleHAR);
    copyMarkdownBtn.addEventListener('click', copyAsMarkdown);
    resetBtn.addEventListener('click', reset);
    slowestLimitSelect.addEventListener('change', handleSlowestLimitChange);
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function processFile(file) {
    state.fileName = file.name;
    
    if (!file.name.endsWith('.har') && !file.name.endsWith('.json')) {
        showError('Please select a .har or .json file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const data = JSON.parse(content);
            validateAndProcessHAR(data);
        } catch (err) {
            showError('Invalid JSON: ' + err.message);
        }
    };
    reader.onerror = () => {
        showError('Failed to read file');
    };
    reader.readAsText(file);
}

async function loadSampleHAR() {
    try {
        state.fileName = 'sample.har';
        const response = await fetch('sample.har');
        if (!response.ok) {
            throw new Error('Failed to load sample HAR');
        }
        const data = await response.json();
        validateAndProcessHAR(data);
    } catch (err) {
        showError('Failed to load sample: ' + err.message);
    }
}

function validateAndProcessHAR(data) {
    hideError();
    
    if (!data || typeof data !== 'object') {
        showError('Invalid HAR: not an object');
        return;
    }
    
    if (!data.log) {
        showError('Invalid HAR: missing "log" property');
        return;
    }
    
    if (!data.log.entries || !Array.isArray(data.log.entries)) {
        showError('Invalid HAR: missing or invalid "log.entries" array');
        return;
    }
    
    if (data.log.entries.length === 0) {
        showError('HAR file contains no entries');
        return;
    }
    
    state.harData = data;
    renderCard();
}

function renderCard() {
    const entries = state.harData.log.entries;
    
    document.getElementById('fileName').textContent = state.fileName;
    
    const timestamp = getTimestamp();
    document.getElementById('timestamp').textContent = timestamp;
    
    document.getElementById('totalRequests').textContent = entries.length;
    
    const timeWindow = calculateTimeWindow(entries);
    document.getElementById('timeWindow').textContent = timeWindow;
    
    const totalBytes = calculateTotalBytes(entries);
    document.getElementById('totalBytes').textContent = formatBytes(totalBytes);
    
    renderHistogram(entries);
    renderFailedRequests(entries);
    renderSlowestRequests(entries);
    
    uploadSection.style.display = 'none';
    cardSection.style.display = 'block';
}

function getTimestamp() {
    const entries = state.harData.log.entries;
    if (entries.length === 0) return '—';
    
    const firstEntry = entries[0];
    if (firstEntry.startedDateTime) {
        const date = new Date(firstEntry.startedDateTime);
        return date.toISOString();
    }
    
    return new Date().toISOString();
}

function calculateTimeWindow(entries) {
    if (entries.length === 0) return '—';
    
    const timestamps = entries
        .filter(e => e.startedDateTime)
        .map(e => new Date(e.startedDateTime).getTime())
        .filter(t => !isNaN(t));
    
    if (timestamps.length < 2) return '—';
    
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    const durationMs = end - start;
    
    if (durationMs < 1000) {
        return `${durationMs}ms`;
    } else if (durationMs < 60000) {
        return `${(durationMs / 1000).toFixed(2)}s`;
    } else {
        return `${(durationMs / 60000).toFixed(2)}m`;
    }
}

function calculateTotalBytes(entries) {
    let total = 0;
    entries.forEach(entry => {
        if (entry.response && entry.response.bodySize && entry.response.bodySize > 0) {
            total += entry.response.bodySize;
        }
    });
    return total;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusClass(status) {
    if (status === 0 || status === null || status === undefined) return '0';
    if (status >= 200 && status < 300) return '2xx';
    if (status >= 300 && status < 400) return '3xx';
    if (status >= 400 && status < 500) return '4xx';
    if (status >= 500 && status < 600) return '5xx';
    return 'other';
}

function renderHistogram(entries) {
    const histogram = {
        '2xx': 0,
        '3xx': 0,
        '4xx': 0,
        '5xx': 0,
        '0': 0,
        'other': 0
    };
    
    entries.forEach(entry => {
        const status = entry.response?.status;
        const statusClass = getStatusClass(status);
        histogram[statusClass]++;
    });
    
    const histogramEl = document.getElementById('histogram');
    histogramEl.innerHTML = '';
    
    const total = entries.length;
    
    Object.keys(histogram).forEach(key => {
        const count = histogram[key];
        if (count === 0) return;
        
        const percentage = (count / total) * 100;
        
        const bar = document.createElement('div');
        bar.className = 'histogram-bar';
        
        const label = document.createElement('div');
        label.className = 'histogram-label';
        label.textContent = key === '0' ? 'Blocked/0' : key;
        
        const track = document.createElement('div');
        track.className = 'histogram-track';
        
        const fill = document.createElement('div');
        fill.className = `histogram-fill status-${key}`;
        fill.style.width = `${Math.max(percentage, 5)}%`;
        fill.textContent = count;
        
        track.appendChild(fill);
        bar.appendChild(label);
        bar.appendChild(track);
        histogramEl.appendChild(bar);
    });
}

function renderFailedRequests(entries) {
    const failed = entries.filter(entry => {
        const status = entry.response?.status;
        const hasError = entry._error || entry.response?._error;
        return status >= 400 || status === 0 || status === null || status === undefined || hasError;
    });
    
    document.getElementById('failedCount').textContent = `${failed.length} failed`;
    
    const failedList = document.getElementById('failedList');
    failedList.innerHTML = '';
    
    if (failed.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.textContent = 'No failed requests';
        failedList.appendChild(empty);
        return;
    }
    
    failed.forEach(entry => {
        const item = createRequestItem(entry, true);
        failedList.appendChild(item);
    });
}

function renderSlowestRequests(entries) {
    const sorted = [...entries]
        .filter(e => e.time !== undefined && e.time !== null && e.time >= 0)
        .sort((a, b) => b.time - a.time);
    
    const limit = state.slowestLimit;
    const slowest = sorted.slice(0, limit);
    
    const slowestList = document.getElementById('slowestList');
    slowestList.innerHTML = '';
    
    if (slowest.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.textContent = 'No timing data available';
        slowestList.appendChild(empty);
        return;
    }
    
    slowest.forEach(entry => {
        const item = createRequestItem(entry, false, true);
        slowestList.appendChild(item);
    });
}

function createRequestItem(entry, isFailed = false, showTime = false) {
    const item = document.createElement('div');
    item.className = `request-item ${isFailed ? 'failed' : ''} ${showTime ? 'slow' : ''}`;
    
    const header = document.createElement('div');
    header.className = 'request-header';
    
    const leftGroup = document.createElement('div');
    leftGroup.style.display = 'flex';
    leftGroup.style.gap = '0.5rem';
    leftGroup.style.alignItems = 'center';
    
    const method = document.createElement('span');
    method.className = 'request-method';
    method.textContent = entry.request?.method || 'UNKNOWN';
    leftGroup.appendChild(method);
    
    const status = entry.response?.status;
    const statusEl = document.createElement('span');
    statusEl.className = `request-status status-${getStatusClass(status)}`;
    if (entry._error || entry.response?._error) {
        statusEl.className = 'request-status status-error';
        statusEl.textContent = 'ERROR';
    } else if (status === 0 || status === null || status === undefined) {
        statusEl.textContent = '0';
    } else {
        statusEl.textContent = status;
    }
    leftGroup.appendChild(statusEl);
    
    header.appendChild(leftGroup);
    
    if (showTime && entry.time !== undefined && entry.time !== null) {
        const time = document.createElement('span');
        time.className = 'request-time';
        time.textContent = `${entry.time.toFixed(2)}ms`;
        header.appendChild(time);
    }
    
    item.appendChild(header);
    
    const url = document.createElement('div');
    url.className = 'request-url';
    url.textContent = entry.request?.url || 'Unknown URL';
    item.appendChild(url);
    
    const errorText = entry._error || entry.response?._error;
    if (errorText) {
        const error = document.createElement('div');
        error.className = 'request-error';
        error.textContent = `Error: ${errorText}`;
        item.appendChild(error);
    }
    
    return item;
}

function handleSlowestLimitChange(e) {
    state.slowestLimit = parseInt(e.target.value, 10);
    renderSlowestRequests(state.harData.log.entries);
}

function generateMarkdown() {
    const entries = state.harData.log.entries;
    const timestamp = getTimestamp();
    const timeWindow = calculateTimeWindow(entries);
    const totalBytes = calculateTotalBytes(entries);
    
    let md = '# UAT Evidence Card\n\n';
    md += `**File:** ${state.fileName}\n`;
    md += `**Timestamp:** ${timestamp}\n\n`;
    
    md += '## Summary\n\n';
    md += `- **Total Requests:** ${entries.length}\n`;
    md += `- **Time Window:** ${timeWindow}\n`;
    md += `- **Transferred:** ${formatBytes(totalBytes)}\n\n`;
    
    const histogram = {
        '2xx': 0,
        '3xx': 0,
        '4xx': 0,
        '5xx': 0,
        '0': 0,
        'other': 0
    };
    
    entries.forEach(entry => {
        const status = entry.response?.status;
        const statusClass = getStatusClass(status);
        histogram[statusClass]++;
    });
    
    md += '## Status Distribution\n\n';
    if (histogram['2xx'] > 0) md += `- **2xx:** ${histogram['2xx']}\n`;
    if (histogram['3xx'] > 0) md += `- **3xx:** ${histogram['3xx']}\n`;
    if (histogram['4xx'] > 0) md += `- **4xx:** ${histogram['4xx']}\n`;
    if (histogram['5xx'] > 0) md += `- **5xx:** ${histogram['5xx']}\n`;
    if (histogram['0'] > 0) md += `- **Blocked/0:** ${histogram['0']}\n`;
    if (histogram['other'] > 0) md += `- **Other:** ${histogram['other']}\n`;
    md += '\n';
    
    const failed = entries.filter(entry => {
        const status = entry.response?.status;
        const hasError = entry._error || entry.response?._error;
        return status >= 400 || status === 0 || status === null || status === undefined || hasError;
    });
    
    md += `## Failed Requests (${failed.length})\n\n`;
    if (failed.length === 0) {
        md += 'No failed requests.\n\n';
    } else {
        failed.forEach(entry => {
            const method = entry.request?.method || 'UNKNOWN';
            const status = entry.response?.status ?? 0;
            const url = entry.request?.url || 'Unknown URL';
            const errorText = entry._error || entry.response?._error;
            
            md += `- **${method}** ${status} — ${url}`;
            if (errorText) {
                md += ` (Error: ${errorText})`;
            }
            md += '\n';
        });
        md += '\n';
    }
    
    const sorted = [...entries]
        .filter(e => e.time !== undefined && e.time !== null && e.time >= 0)
        .sort((a, b) => b.time - a.time);
    
    const limit = state.slowestLimit;
    const slowest = sorted.slice(0, limit);
    
    md += `## Slowest ${limit} Requests\n\n`;
    if (slowest.length === 0) {
        md += 'No timing data available.\n';
    } else {
        slowest.forEach(entry => {
            const method = entry.request?.method || 'UNKNOWN';
            const status = entry.response?.status ?? 0;
            const url = entry.request?.url || 'Unknown URL';
            const time = entry.time.toFixed(2);
            
            md += `- **${method}** ${status} — ${time}ms — ${url}\n`;
        });
    }
    
    return md;
}

async function copyAsMarkdown() {
    const markdown = generateMarkdown();
    
    try {
        await navigator.clipboard.writeText(markdown);
        showToast('Copied to clipboard!');
    } catch (err) {
        showToast('Failed to copy');
    }
}

function reset() {
    state.harData = null;
    state.fileName = '';
    fileInput.value = '';
    uploadSection.style.display = 'block';
    cardSection.style.display = 'none';
    hideError();
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getStatusClass,
        calculateTimeWindow,
        calculateTotalBytes,
        formatBytes,
        generateMarkdown
    };
}
