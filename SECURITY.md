# Security policy

## Supported versions

Only the latest release of safari-mcp gets security fixes.

| Version | Supported |
|---|---|
| 1.2.x (latest) | Yes |
| Older | No |

## Reporting a vulnerability

Please report security problems privately, not in a public issue.

Use GitHub private vulnerability reporting: open the **Security** tab of this repository and choose **Report a vulnerability**. If that is not available to you, email tyler@szakacsmedia.com.

Please include what you found, what an attacker could do with it, steps to reproduce, and your macOS, Safari and safari-mcp versions.

You can expect a first reply within a few days. This project is maintained by a small team, so a fix may take longer, but you will get updates.

## Sensitive surface

safari-mcp gives an MCP client control of your Safari. Through its tools a client can read the URL, title, text and HTML of every open tab (including private windows), read form values, click, type, submit forms and run JavaScript in logged-in pages. There is no read-only mode. Only connect clients you trust.

These areas matter most:

- Any way for a web page, or text inside a page, to make the server do something the connected client did not ask for.
- Any way to reach the server other than through the MCP client that started it.
- Command or script injection through tool arguments (the server builds `osascript` input from them).
- Screenshot temp files readable by other users.

The server makes no network requests of its own, apart from a localhost connection to `safaridriver` for screenshots.
