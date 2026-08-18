# Privacy Policy

**Last Updated:** August 19, 2026

## Overview

AIMS Schedule Builder is a Chrome extension developed by a City University of Hong Kong student to help students convert their AIMS timetables into calendar files. This privacy policy explains how we handle user data.

## Data Collection

**We do not collect, store, or transmit any user data.**

The extension operates entirely locally on your device. When you click the extension icon on your AIMS Student Detail Schedule page, the extension:

1. Reads the timetable information displayed on the page you are viewing
2. Parses this information to generate a calendar file (`.ics`)
3. Downloads the generated file to your device

## Data Storage

No data is stored persistently by the extension. All processing happens in real-time when you activate the extension. No cookies, local storage, or browser storage is used to retain any information.

## Data Transmission

**No data is transmitted to any external server.** All operations occur locally within your browser. The extension does not communicate with any backend services, APIs, or third-party servers.

## Permissions Justification

The extension requests the following permissions solely for the purpose of its core functionality:

| Permission | Purpose |
|------------|---------|
| `activeTab` | Temporarily access the active AIMS page when you click the extension icon |
| `downloads` | Download the generated `.ics` calendar file to your device |
| Host permission (`https://banweb.cityu.edu.hk/*`) | Access the specific AIMS webpage to read timetable data |

## Third-Party Sharing

We do not sell, trade, or transfer any user data to third parties. Since no data is collected, there is nothing to share.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date at the top of this document. We encourage users to periodically review this page for any changes.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository:
[https://github.com/prinsasina/aims2ics/issues](https://github.com/prinsasina/aims2ics/issues)

---

**Disclaimer:** This is a third-party extension created by a CityU student for convenience. It is not affiliated with or endorsed by City University of Hong Kong.