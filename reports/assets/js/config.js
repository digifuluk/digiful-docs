/* Public client-side settings. The publishable key is designed to be public: it only lets the page call
   the two read RPCs (get_live_reports / get_report), and those still need the client's own access key. */
window.REPORTS_CONFIG = {
  supabaseUrl: "https://aqiyilexnmqhawhlayqd.supabase.co",
  /* Repo folder these pages live in. A snapshot path stored in the database ("reports/<uuid>/x.html") is a path from the
     repo root, so it is resolved relative to these pages by dropping this folder prefix. */
  siteFolder: "reports",
  supabaseKey: "sb_publishable_YQixr2dy730LWcPyJ2dGCQ_GWpUNjxj"
};
