-- Function: seed a new user's library with all books on signup
CREATE OR REPLACE FUNCTION seed_user_library()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_books (user_id, book_id)
  SELECT NEW.id, b.id FROM public.books b
  ON CONFLICT (user_id, book_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after every new row in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_user_library();

-- Backfill: seed any users who already exist (you and Sal on first login)
INSERT INTO public.user_books (user_id, book_id)
SELECT u.id, b.id FROM auth.users u CROSS JOIN public.books b
ON CONFLICT (user_id, book_id) DO NOTHING;

SELECT COUNT(*) as user_books_total FROM public.user_books;
