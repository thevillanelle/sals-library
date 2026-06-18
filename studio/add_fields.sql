-- Add new fields to books table
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS genre        TEXT,
  ADD COLUMN IF NOT EXISTS fiction      BOOLEAN,
  ADD COLUMN IF NOT EXISTS year_published INTEGER,
  ADD COLUMN IF NOT EXISTS page_count   INTEGER,
  ADD COLUMN IF NOT EXISTS dewey        TEXT,
  ADD COLUMN IF NOT EXISTS format       TEXT,
  ADD COLUMN IF NOT EXISTS language     TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS awards       TEXT,
  ADD COLUMN IF NOT EXISTS notes        TEXT;

-- Add new fields to user_books table
ALTER TABLE public.user_books
  ADD COLUMN IF NOT EXISTS date_started DATE,
  ADD COLUMN IF NOT EXISTS reread       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gifted_to    TEXT;

-- Allow authenticated users to update book metadata
-- (needed for auto-fetch summary + Sal editing fields)
DROP POLICY IF EXISTS books_update ON public.books;
CREATE POLICY books_update ON public.books
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
