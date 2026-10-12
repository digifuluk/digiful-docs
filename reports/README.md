# Digiful client reports site (GitHub Pages)

Static site. No build step, no CDN. Everything is relative, so it works at the repo root or in a sub-folder.

## Folder structure
```
index.html                 report list (year + quarter dropdowns, month cards)
report.html                one report (?id=<report_instance_id>), prev/next inside the quarter, Download PDF
assets/css/report.css      all styles (dark on screen, light for print/PDF)
assets/js/config.js        Supabase URL + publishable key (public by design)
assets/js/common.js        helpers + the two RPC calls
assets/js/md-render.js     Markdown -> safe HTML (directives, tables, ledger tokens)
assets/js/demo-data.js     sample data for ?demo=1  (delete in production if you like)
sample/                    sample report in Markdown (source of the demo)
reports/<uuid>/<name>.html frozen snapshots (path format enforced by the database)
images/                    report images (reference as images/<client>/<file>.png)
```

## Client link
`https://<your-pages-domain>/index.html?c=<client_id>&k=<access key uuid>`

## Try it without Supabase
Open `index.html?demo=1` or `report.html?demo=1&id=1051` in a browser (works from a local file).

## Go live
1. Run 018a (dry run) then 018b in the Supabase SQL editor.
2. Optional: run `seed_sample_report.sql` (set v_tx first) to publish the sample report on a real order.
3. Push this folder to GitHub, enable Pages. Open `index.html?c=..&k=..`.
4. If the page says "couldn't load": Supabase > Settings > API > make sure the **public** schema is exposed
   and the functions have `anon` EXECUTE (018b grants it).

## Publish a report (any time)
`select reports.fn_publish_report(<report_instance_id>, '<front matter json>'::jsonb, $body$ ...markdown... $body$);`
Creates the next version and flips `is_current`. A second report on the same order = insert a report_instances row with a `report_label`.
