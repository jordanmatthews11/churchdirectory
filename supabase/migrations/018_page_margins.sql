alter table directory_settings
  add column if not exists opening_page_margin_top numeric,
  add column if not exists opening_page_margin_bottom numeric,
  add column if not exists back_page_margin_top numeric,
  add column if not exists back_page_margin_bottom numeric;
