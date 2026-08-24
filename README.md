# ServiceFlow — Frontend

Static HTML frontend for the Digiful ServiceFlow client retainer system.

## Structure

```
serviceflow/
├── css/
│   ├── base.css          # Design tokens (:root variables), reset, typography
│   ├── components.css    # All reusable UI components (pills, cards, nav, etc.)
│   ├── layout.css        # Page shell, header, page-wrap, section boxes
│   └── themes/           # Reserved for future brand/client theme overrides
├── js/
│   ├── config.js         # ← THE ONLY FILE TO CHANGE when swapping GAS → Supabase
│   ├── api.js            # Data connector (QOF fetch + Report fetch)
│   ├── ui.js             # Shared DOM helpers, month names, pill renderers
│   ├── qof.js            # QOF form controller
│   └── report.js         # Monthly/Quarterly report controller
└── pages/
    ├── qof.html          # Quarterly Order Form
    └── report.html       # Work Report (monthly detail + quarter summary)
```

## Modes

**Dummy mode** (default): set `MODE: 'dummy'` in `js/config.js`.
Dummy data is injected as `window.SF_DUMMY_QOF` / `window.SF_DUMMY_REPORT`
in the `<head>` of each page. No network calls made.

**Live mode**: set `MODE: 'live'`. `api.js` fetches from `BASE_URL`
(currently GAS; will be Supabase REST endpoint after migration).

## Migration to Supabase

1. Update `BASE_URL` in `js/config.js` to your Supabase REST endpoint
2. Update `MODE` to `'live'`
3. Adjust `SF.fetchQOF()` / `SF.fetchReport()` in `api.js` if response
   shape differs (add auth header, transform rows, etc.)
4. Everything else (CSS, HTML, qof.js, report.js) stays unchanged

## URL Parameters

| Page   | Param           | Required | Notes                        |
|--------|-----------------|----------|------------------------------|
| QOF    | `q_opt_id`      | Yes      | Quarter options set ID       |
| QOF    | `month_range`   | Yes      | e.g. `4,5,6`                 |
| QOF    | `auth_key`      | Yes      | Client auth token            |
| Report | `client_plan_id`| Yes      | Active client plan ID        |
| Report | `auth_key`      | Yes      | Client auth token            |

## Test URL (QOF, dummy mode)
Open `pages/qof.html` directly in browser — no URL params needed in dummy mode.

## Test URL (QOF, live mode)
`pages/qof.html?q_opt_id=1&month_range=4,5,6&auth_key=5674422967504087`
