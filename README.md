# HAR Evidence Card

A client-side HAR drop tool that generates a concise UAT evidence card from HTTP Archive (HAR) files. Perfect for QA documentation, bug reports, and performance reviews.

**Live Demo:** [https://evan-thedev.github.io/har-evidence-card/](https://evan-thedev.github.io/har-evidence-card/)

## What It Is

HAR Evidence Card parses `.har` files in your browser and generates a summary card showing:

- **Request Totals:** Total count, time window, transferred bytes
- **Status Histogram:** Visual breakdown of status codes (2xx, 3xx, 4xx, 5xx, blocked)
- **Failed Requests:** Detailed list of 4xx, 5xx, status 0, and error responses
- **Slowest N Requests:** Configurable list of the slowest requests (5/10/20/50)
- **Copy as Markdown:** One-click copy of the entire evidence card in markdown format

## What It Is Not

This is **NOT** a full HAR waterfall viewer or network inspector like [HAR Viewer](https://github.com/omega0verride/HAR-Viewer). It's designed specifically for generating concise UAT evidence summaries, not for detailed network analysis.

## How to Use

### GitHub Pages (Live)

Visit [https://evan-thedev.github.io/har-evidence-card/](https://evan-thedev.github.io/har-evidence-card/) and:

1. Drop a `.har` file onto the page or click to browse
2. Review the evidence card
3. Click "Copy as Markdown" to copy the summary
4. Or click "Load Sample HAR" to see it in action with example data

### Local Usage

1. Clone this repository:
   ```bash
   git clone https://github.com/evan-thedev/har-evidence-card.git
   cd har-evidence-card
   ```

2. Open `index.html` in your browser:
   ```bash
   open index.html  # macOS
   xdg-open index.html  # Linux
   start index.html  # Windows
   ```

3. Or serve with any static file server:
   ```bash
   python3 -m http.server 8000
   # Visit http://localhost:8000
   ```

## Stack

- **Vanilla HTML/CSS/JS** (no build step, no dependencies)
- **Client-side only** (nothing uploads or leaves your browser)
- **Static hosting ready** (GitHub Pages, Netlify, etc.)

## Features

### Privacy First

All HAR processing happens entirely in your browser. No data is uploaded, tracked, or stored anywhere. No analytics, no phone-home.

### Keyboard Accessible

- File input is keyboard navigable
- All buttons and controls support keyboard interaction
- Proper ARIA labels and roles

### Mobile Friendly

Responsive design works on phones, tablets, and desktops.

### Markdown Export

The "Copy as Markdown" button generates a formatted report you can paste directly into:
- GitHub issues/PRs
- Jira tickets
- Slack messages
- Documentation
- Email

## Testing

Open `test.html` in your browser to run the test suite. Tests cover:
- Status classification (2xx, 3xx, 4xx, 5xx, 0, other)
- Time window calculation
- Byte formatting
- Markdown generation
- Edge cases (empty entries, missing fields, invalid status codes)

## Browser Support

Works in all modern browsers that support:
- ES6+ JavaScript
- `fetch` API
- `FileReader` API
- `navigator.clipboard` API

## Author

Built by [Evan Parrott](https://github.com/evan-thedev)

Contact: coppercoffin@gmail.com

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
