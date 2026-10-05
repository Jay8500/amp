# Accounts Manager

PWA for OTT subscription resellers. Each seller's own Google Sheet is the only data store, reached through a small Apps Script web app. There is no server.

## Run

```bash
npm start            # dev server at http://localhost:4200 (service worker off)
npm run build        # production build in dist/accounts-manager-app/browser (service worker on)
npm test             # unit tests (vitest)
```

## How data flows

```
App (Angular) ──POST text/plain JSON──▶ Apps Script /exec (apps-script/Code.gs) ──▶ seller's Google Sheet
```

- **`apps-script/Code.gs`**: the bridge. Each seller pastes it into their own Sheet and deploys it as a Web app (Execute as *Me*, access *Anyone*). It's also served at `/bridge/Code.gs`, so the Setup screen can copy it to the clipboard.
- **Sheet tabs**:
  - `Sales` and `Credentials` (the names are configurable): row 1 is the column headers. The app adds missing columns itself. `_id`, `_createdAt` and `_notifiedAt` are system columns.
  - `_Config`: key/JSON rows for the form layouts, plans, message templates, settings and `brand:<id>` (custom brands, with logos as about 128px base64).
- **IndexedDB** (`idb`) holds only seller profiles (a PBKDF2 hash of the PIN and the script URL), the session and a cached copy of the config. Sales and credentials are kept in memory only.

## Structure

```
src/app/
  core/       models, config defaults, services (sheets-api, session, config, records, expiry, whatsapp), guards, utils
  shared/     shell + bottom nav, page header, brand avatar, dynamic form renderer, dialogs
  features/   login (+ forgot PIN), setup, home, ott-select, sale, data, recent-sales, expiry, settings/*
```

## Notes

- **Field roles:** fields carry a `role` (for example `expiryDate`), so expiry tracking and WhatsApp messages keep working after a seller renames labels or remaps columns. Fields with locked roles can't be deleted.
- **WhatsApp messages:** templates use `{Column Name}` placeholders. A line is dropped when all of its placeholders are empty.
- **Forgot PIN:** re-entering the same Apps Script URL resets the PIN.
