-- Adds rich text content for the directory back page.
ALTER TABLE directory_settings
  ADD COLUMN IF NOT EXISTS back_page_html text;

