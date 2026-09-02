const tests = [];
let testResults = [];

function test(name, fn) {
    tests.push({ name, fn });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(
            message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(
            message || `Expected ${expectedStr}, got ${actualStr}`
        );
    }
}

test('getStatusClass: 2xx codes', () => {
    assertEqual(getStatusClass(200), '2xx');
    assertEqual(getStatusClass(201), '2xx');
    assertEqual(getStatusClass(204), '2xx');
    assertEqual(getStatusClass(299), '2xx');
});

test('getStatusClass: 3xx codes', () => {
    assertEqual(getStatusClass(301), '3xx');
    assertEqual(getStatusClass(302), '3xx');
    assertEqual(getStatusClass(304), '3xx');
    assertEqual(getStatusClass(399), '3xx');
});

test('getStatusClass: 4xx codes', () => {
    assertEqual(getStatusClass(400), '4xx');
    assertEqual(getStatusClass(404), '4xx');
    assertEqual(getStatusClass(403), '4xx');
    assertEqual(getStatusClass(499), '4xx');
});

test('getStatusClass: 5xx codes', () => {
    assertEqual(getStatusClass(500), '5xx');
    assertEqual(getStatusClass(502), '5xx');
    assertEqual(getStatusClass(503), '5xx');
    assertEqual(getStatusClass(599), '5xx');
});

test('getStatusClass: 0, null, undefined', () => {
    assertEqual(getStatusClass(0), '0');
    assertEqual(getStatusClass(null), '0');
    assertEqual(getStatusClass(undefined), '0');
});

test('getStatusClass: other codes', () => {
    assertEqual(getStatusClass(100), 'other');
    assertEqual(getStatusClass(600), 'other');
    assertEqual(getStatusClass(999), 'other');
});

test('formatBytes: zero bytes', () => {
    assertEqual(formatBytes(0), '0 B');
});

test('formatBytes: bytes', () => {
    assertEqual(formatBytes(500), '500 B');
    assertEqual(formatBytes(1023), '1023 B');
});

test('formatBytes: kilobytes', () => {
    assertEqual(formatBytes(1024), '1 KB');
    assertEqual(formatBytes(2048), '2 KB');
    assertEqual(formatBytes(1536), '1.5 KB');
});

test('formatBytes: megabytes', () => {
    assertEqual(formatBytes(1048576), '1 MB');
    assertEqual(formatBytes(2097152), '2 MB');
    assertEqual(formatBytes(1572864), '1.5 MB');
});

test('formatBytes: gigabytes', () => {
    assertEqual(formatBytes(1073741824), '1 GB');
    assertEqual(formatBytes(2147483648), '2 GB');
});

test('calculateTotalBytes: empty entries', () => {
    const result = calculateTotalBytes([]);
    assertEqual(result, 0);
});

test('calculateTotalBytes: entries without bodySize', () => {
    const entries = [
        { response: {} },
        { response: { bodySize: 0 } },
        { response: { bodySize: -1 } }
    ];
    const result = calculateTotalBytes(entries);
    assertEqual(result, 0);
});

test('calculateTotalBytes: valid entries', () => {
    const entries = [
        { response: { bodySize: 1000 } },
        { response: { bodySize: 2000 } },
        { response: { bodySize: 500 } }
    ];
    const result = calculateTotalBytes(entries);
    assertEqual(result, 3500);
});

test('calculateTimeWindow: empty entries', () => {
    const result = calculateTimeWindow([]);
    assertEqual(result, '—');
});

test('calculateTimeWindow: single entry', () => {
    const entries = [
        { startedDateTime: '2026-09-02T04:00:00.000Z' }
    ];
    const result = calculateTimeWindow(entries);
    assertEqual(result, '—');
});

test('calculateTimeWindow: milliseconds', () => {
    const entries = [
        { startedDateTime: '2026-09-02T04:00:00.000Z' },
        { startedDateTime: '2026-09-02T04:00:00.500Z' }
    ];
    const result = calculateTimeWindow(entries);
    assertEqual(result, '500ms');
});

test('calculateTimeWindow: seconds', () => {
    const entries = [
        { startedDateTime: '2026-09-02T04:00:00.000Z' },
        { startedDateTime: '2026-09-02T04:00:05.000Z' }
    ];
    const result = calculateTimeWindow(entries);
    assertEqual(result, '5.00s');
});

test('calculateTimeWindow: minutes', () => {
    const entries = [
        { startedDateTime: '2026-09-02T04:00:00.000Z' },
        { startedDateTime: '2026-09-02T04:02:30.000Z' }
    ];
    const result = calculateTimeWindow(entries);
    assertEqual(result, '2.50m');
});

test('calculateTimeWindow: no timestamps', () => {
    const entries = [
        { request: { url: 'https://example.com' } },
        { request: { url: 'https://example.com/2' } }
    ];
    const result = calculateTimeWindow(entries);
    assertEqual(result, '—');
});

test('generateMarkdown: basic structure', () => {
    const testState = {
        harData: {
            log: {
                entries: [
                    {
                        startedDateTime: '2026-09-02T04:00:00.000Z',
                        time: 100,
                        request: { method: 'GET', url: 'https://example.com' },
                        response: { status: 200, bodySize: 1000 }
                    }
                ]
            }
        },
        fileName: 'test.har',
        slowestLimit: 10
    };
    
    const originalState = window.state;
    window.state = testState;
    
    const markdown = generateMarkdown();
    
    window.state = originalState;
    
    assert(markdown.includes('# UAT Evidence Card'), 'Should have title');
    assert(markdown.includes('**File:** test.har'), 'Should have file name');
    assert(markdown.includes('## Summary'), 'Should have summary section');
    assert(markdown.includes('## Status Distribution'), 'Should have status distribution');
    assert(markdown.includes('## Failed Requests'), 'Should have failed requests section');
    assert(markdown.includes('## Slowest'), 'Should have slowest requests section');
});

test('generateMarkdown: failed requests', () => {
    const testState = {
        harData: {
            log: {
                entries: [
                    {
                        startedDateTime: '2026-09-02T04:00:00.000Z',
                        time: 50,
                        request: { method: 'GET', url: 'https://example.com/error' },
                        response: { status: 404, bodySize: 100 }
                    },
                    {
                        startedDateTime: '2026-09-02T04:00:00.100Z',
                        time: 75,
                        request: { method: 'POST', url: 'https://example.com/fail' },
                        response: { status: 500, bodySize: 200 }
                    }
                ]
            }
        },
        fileName: 'test.har',
        slowestLimit: 10
    };
    
    const originalState = window.state;
    window.state = testState;
    
    const markdown = generateMarkdown();
    
    window.state = originalState;
    
    assert(markdown.includes('## Failed Requests (2)'), 'Should show 2 failed requests');
    assert(markdown.includes('GET') && markdown.includes('404'), 'Should show GET 404');
    assert(markdown.includes('POST') && markdown.includes('500'), 'Should show POST 500');
});

test('generateMarkdown: slowest requests', () => {
    const testState = {
        harData: {
            log: {
                entries: [
                    {
                        startedDateTime: '2026-09-02T04:00:00.000Z',
                        time: 1000,
                        request: { method: 'GET', url: 'https://example.com/slow' },
                        response: { status: 200, bodySize: 1000 }
                    },
                    {
                        startedDateTime: '2026-09-02T04:00:00.100Z',
                        time: 50,
                        request: { method: 'GET', url: 'https://example.com/fast' },
                        response: { status: 200, bodySize: 500 }
                    }
                ]
            }
        },
        fileName: 'test.har',
        slowestLimit: 10
    };
    
    const originalState = window.state;
    window.state = testState;
    
    const markdown = generateMarkdown();
    
    window.state = originalState;
    
    assert(markdown.includes('1000.00ms'), 'Should show slowest request first');
    const slowIndex = markdown.indexOf('1000.00ms');
    const fastIndex = markdown.indexOf('50.00ms');
    assert(slowIndex < fastIndex, 'Slowest should appear before fastest');
});

test('generateMarkdown: status distribution', () => {
    const testState = {
        harData: {
            log: {
                entries: [
                    {
                        startedDateTime: '2026-09-02T04:00:00.000Z',
                        time: 50,
                        request: { method: 'GET', url: 'https://example.com/1' },
                        response: { status: 200, bodySize: 100 }
                    },
                    {
                        startedDateTime: '2026-09-02T04:00:00.100Z',
                        time: 50,
                        request: { method: 'GET', url: 'https://example.com/2' },
                        response: { status: 302, bodySize: 0 }
                    },
                    {
                        startedDateTime: '2026-09-02T04:00:00.200Z',
                        time: 50,
                        request: { method: 'GET', url: 'https://example.com/3' },
                        response: { status: 404, bodySize: 50 }
                    }
                ]
            }
        },
        fileName: 'test.har',
        slowestLimit: 10
    };
    
    const originalState = window.state;
    window.state = testState;
    
    const markdown = generateMarkdown();
    
    window.state = originalState;
    
    assert(markdown.includes('**2xx:** 1'), 'Should show 2xx count');
    assert(markdown.includes('**3xx:** 1'), 'Should show 3xx count');
    assert(markdown.includes('**4xx:** 1'), 'Should show 4xx count');
});

test('generateMarkdown: blocked requests', () => {
    const testState = {
        harData: {
            log: {
                entries: [
                    {
                        startedDateTime: '2026-09-02T04:00:00.000Z',
                        time: 0,
                        request: { method: 'GET', url: 'https://tracker.example/track' },
                        response: { status: 0 },
                        _error: 'net::ERR_BLOCKED_BY_CLIENT'
                    }
                ]
            }
        },
        fileName: 'test.har',
        slowestLimit: 10
    };
    
    const originalState = window.state;
    window.state = testState;
    
    const markdown = generateMarkdown();
    
    window.state = originalState;
    
    assert(markdown.includes('## Failed Requests (1)'), 'Should count blocked as failed');
    assert(markdown.includes('0 —'), 'Should show status 0');
    assert(markdown.includes('net::ERR_BLOCKED_BY_CLIENT'), 'Should show error message');
});

test('generateMarkdown: no failed requests', () => {
    const testState = {
        harData: {
            log: {
                entries: [
                    {
                        startedDateTime: '2026-09-02T04:00:00.000Z',
                        time: 50,
                        request: { method: 'GET', url: 'https://example.com' },
                        response: { status: 200, bodySize: 1000 }
                    }
                ]
            }
        },
        fileName: 'test.har',
        slowestLimit: 10
    };
    
    const originalState = window.state;
    window.state = testState;
    
    const markdown = generateMarkdown();
    
    window.state = originalState;
    
    assert(markdown.includes('## Failed Requests (0)'), 'Should show 0 failed');
    assert(markdown.includes('No failed requests'), 'Should say no failed requests');
});

async function runTests() {
    const runButton = document.getElementById('runButton');
    runButton.disabled = true;
    runButton.textContent = 'Running...';
    
    testResults = [];
    const startTime = performance.now();
    
    for (const test of tests) {
        const result = {
            name: test.name,
            passed: false,
            error: null
        };
        
        try {
            await test.fn();
            result.passed = true;
        } catch (error) {
            result.passed = false;
            result.error = error.message;
        }
        
        testResults.push(result);
    }
    
    const duration = performance.now() - startTime;
    displayResults(duration);
    
    runButton.disabled = false;
    runButton.textContent = 'Run Tests';
}

function displayResults(duration) {
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const total = testResults.length;
    
    document.getElementById('totalTests').textContent = total;
    document.getElementById('passedTests').textContent = passed;
    document.getElementById('failedTests').textContent = failed;
    document.getElementById('duration').textContent = Math.round(duration) + 'ms';
    
    const summary = document.getElementById('summary');
    summary.className = 'summary';
    if (failed > 0) {
        summary.classList.add('error');
    } else {
        summary.classList.add('success');
    }
    
    const resultsContainer = document.getElementById('testResults');
    resultsContainer.innerHTML = '';
    
    testResults.forEach(result => {
        const item = document.createElement('div');
        item.className = `test-item ${result.passed ? 'pass' : 'fail'}`;
        
        const header = document.createElement('div');
        header.className = 'test-header';
        
        const name = document.createElement('div');
        name.className = 'test-name';
        name.textContent = result.name;
        
        const status = document.createElement('div');
        status.className = `test-status ${result.passed ? 'pass' : 'fail'}`;
        status.textContent = result.passed ? 'Pass' : 'Fail';
        
        header.appendChild(name);
        header.appendChild(status);
        item.appendChild(header);
        
        if (result.error) {
            const error = document.createElement('div');
            error.className = 'test-error';
            error.textContent = result.error;
            item.appendChild(error);
        }
        
        resultsContainer.appendChild(item);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('runButton').addEventListener('click', runTests);
    runTests();
});
