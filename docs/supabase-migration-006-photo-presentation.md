# Supabase migration 006 — photo fit / crop columns

The app stores how each family or member photo should display (`cover` vs `contain`) and crop position. Those fields live in the database on `families` and `members`.

## When you need this

Run this migration on **production** (and any shared dev DB) if:

- Saving a family or member after uploading a photo returns **500** / “Failed to save changes”, or
- Supabase / API errors mention unknown columns such as `photo_fit`, `photo_position_x`, or `photo_position_y`.

The SQL file in the repo is:

- `supabase/migrations/006_photo_fit_and_position.sql`

## How to apply (Supabase dashboard)

1. Open your project in [Supabase](https://supabase.com).
2. Go to **SQL Editor**.
3. Open `supabase/migrations/006_photo_fit_and_position.sql` from this repo, copy **all** of its contents.
4. Paste into a new query in the SQL Editor and click **Run**.

## After running

- Hard-refresh the app and try **Save** again on a family with a photo.
- Fit/crop choices will persist in the database once the columns exist.

## Note on deployed code

The server may **retry** saves without the new columns if they are missing (so `photo_url` can still save), but **fit/crop will not persist** until this migration is applied.
