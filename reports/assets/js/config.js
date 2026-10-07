/* Public client-side settings. The publishable key is designed to be public: it only lets the page call
   the two read RPCs (get_live_reports / get_report), and those still need the client's own access key. */
window.REPORTS_CONFIG = {
  supabaseUrl: "https://aqiyilexnmqhawhlayqd.supabase.co",
  supabaseKey: "sb_publishable_YQixr2dy730LWcPyJ2dGCQ_GWpUNjxj"
};
