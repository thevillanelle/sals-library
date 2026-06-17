-- ============================================================
-- Sal's Library — Master SQL
-- Run once in the Supabase SQL editor to set up everything from scratch.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT throughout.
-- ============================================================


-- ── 1. SCHEMA ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.books (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  author_first TEXT,
  author_last  TEXT,
  series       TEXT,
  series_num   INTEGER,
  summary      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_books (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'read',
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  date_read   DATE,
  one_thing   TEXT,
  best_moment TEXT,
  dragged     TEXT,
  give_to     TEXT,
  compare     TEXT,
  recommend   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  streak_count INTEGER DEFAULT 1,
  UNIQUE (user_id, session_date)
);

ALTER TABLE public.books
  ADD CONSTRAINT IF NOT EXISTS books_title_author_last_key UNIQUE (title, author_last);


-- ── 2. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS books_read ON public.books;
CREATE POLICY books_read ON public.books
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS user_books_select ON public.user_books;
CREATE POLICY user_books_select ON public.user_books
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_books_insert ON public.user_books;
CREATE POLICY user_books_insert ON public.user_books
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_books_update ON public.user_books;
CREATE POLICY user_books_update ON public.user_books
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_select ON public.reading_sessions;
CREATE POLICY sessions_select ON public.reading_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_insert ON public.reading_sessions;
CREATE POLICY sessions_insert ON public.reading_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_upsert ON public.reading_sessions;
CREATE POLICY sessions_upsert ON public.reading_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);


-- ── 3. SEED TRIGGER ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION seed_user_library()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_books (user_id, book_id, status)
  SELECT NEW.id, b.id, 'read' FROM public.books b
  ON CONFLICT (user_id, book_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_user_library();

-- ── 4. BOOKS (931) ───────────────────────────────────────────

INSERT INTO books (title, author_first, author_last, series, series_num) VALUES
  ('Adrenaline', 'Jeff', 'Abbott', 'Sam Capra', '1'),
  ('The Last Minute', 'Jeff', 'Abbott', 'Sam Capra', '2'),
  ('Downfall', 'Jeff', 'Abbott', 'Sam Capra', '3'),
  ('Panic', 'Jeff', 'Abbott', NULL, NULL),
  ('Inside Man', 'Jeff', 'Abbott', 'Sam Capra', '4'),
  ('The First Order', 'Jeff', 'Abbott', 'Sam Capra', '5'),
  ('Blame', 'Jeff', 'Abbott', NULL, NULL),
  ('The Three Beths', 'Jeff', 'Abbott', NULL, NULL),
  ('Things Fall Apart', 'Chinua', 'Achebe', NULL, NULL),
  ('Watership Down', 'Richard', 'Adams', NULL, NULL),
  ('Tuesdays with Morrie', 'Mitch', 'Albom', NULL, NULL),
  ('D-Day', 'Stephen', 'Ambrose', NULL, NULL),
  ('Band of Brothers', 'Stephen', 'Ambrose', NULL, NULL),
  ('A Prisoner of Birth', 'Jeffrey', 'Archer', NULL, NULL),
  ('Kane and Abel', 'Jeffrey', 'Archer', NULL, NULL),
  ('Paths of Glory', 'Jeffrey', 'Archer', NULL, NULL),
  ('The Prodigal Daughter', 'Jeffrey', 'Archer', NULL, NULL),
  ('The Foundation Trilogy', 'Isaac', 'Assimov', NULL, NULL),
  ('Handmaid''s Tale', 'Margaret', 'Atwood', NULL, NULL),
  ('The Testaments', 'Margaret', 'Atwood', NULL, NULL),
  ('Clan of the Cave Bear', 'Jean', 'Auel', NULL, NULL),
  ('The Mammoth Hunters', 'Jean', 'Auel', NULL, NULL),
  ('The Plains of Passage', 'Jean', 'Auel', NULL, NULL),
  ('The Shelters of Stone', 'Jean', 'Auel', NULL, NULL),
  ('The Valley of Horses', 'Jean', 'Auel', NULL, NULL),
  ('Where the Truth Lies', 'Anna', 'Bauiley', NULL, NULL),
  ('Absolute Power', 'David', 'Balducci', NULL, NULL),
  ('Divine Justice', 'David', 'Balducci', 'Camel Club', '4'),
  ('Saving Faith', 'David', 'Balducci', NULL, NULL),
  ('Stone Cold', 'David', 'Balducci', 'Camel Club', '3'),
  ('The Camel Club #1', 'David', 'Balducci', NULL, NULL),
  ('The Collectors', 'David', 'Balducci', 'Camel Club', '2'),
  ('The Simple Truth', 'David', 'Balducci', NULL, NULL),
  ('The Innocent', 'David', 'Balducci', 'Will Robie', '1'),
  ('The Forgotten', 'David', 'Balducci', 'John Puller', '2'),
  ('The Target', 'David', 'Balducci', 'Will Robie', '3'),
  ('The Escape', 'David', 'Balducci', 'John Puller', '3'),
  ('The Winner', 'David', 'Balducci', NULL, NULL),
  ('Total Control', 'David', 'Balducci', NULL, NULL),
  ('Memory Man', 'David', 'Balducci', 'Amos Decker', '1'),
  ('The Last Mile', 'David', 'Balducci', 'Amos Decker', '2'),
  ('The Guilty', 'David', 'Balducci', 'Will Robie', '4'),
  ('The Fix', 'David', 'Balducci', 'Amos Decker', '3'),
  ('Zero Day', 'David', 'Balducci', 'John Puller', '1'),
  ('End Game', 'David', 'Balducci', 'Will Robie', '5'),
  ('The Fallen', 'David', 'Balducci', 'Amos Decker', '4'),
  ('The Long Road to Mercy', 'David', 'Balducci', 'Atlee Pine', '1'),
  ('The Hit', 'David', 'Balducci', 'Will Robie', '2'),
  ('Redemption', 'David', 'Balducci', 'Amos Decker', '5'),
  ('One Good Deed', 'David', 'Balducci', 'Archer', '1'),
  ('Walk The Wire', 'David', 'Balducci', 'Amos Decker', '6'),
  ('A Minute to Midnight', 'David', 'Balducci', 'Atlee Pine', '2'),
  ('Daylight', 'David', 'Balducci', 'Atlee Pine', '3'),
  ('A Gambling Man', 'David', 'Balducci', 'Archer', '2'),
  ('Mercy', 'David', 'Balducci', 'Atlee Pine', '4'),
  ('Dream Town', 'David', 'Balducci', 'Archer', '3'),
  ('Long Shadows', 'David', 'Balducci', 'Amos Decker', '7'),
  ('The 6:20 Man', 'David', 'Balducci', NULL, NULL),
  ('Simply Lies', 'David', 'Balducci', NULL, NULL),
  ('Hour Game (King and Maxwell)', 'David', 'Balducci', NULL, NULL),
  ('To Die For (6:20 Man)', 'David', 'Balducci', NULL, NULL),
  ('A Calamity of Souls', 'David', 'Balducci', NULL, NULL),
  ('The Edge (6:20 Man)', 'David', 'Balducci', NULL, NULL),
  ('Strangers in Time', 'David', 'Balducci', NULL, NULL),
  ('Nash Falls (Part 1)', 'David', 'Balducci', NULL, NULL),
  ('Nash Rises (Part 2)', 'David', 'Balducci', NULL, NULL),
  ('Snow', 'John', 'Banville', NULL, NULL),
  ('April in Spain', 'John', 'Banville', NULL, NULL),
  ('Blacklands', 'Belinda', 'Bauer', NULL, NULL),
  ('The Vanishing Half', 'Brit', 'Bennett', NULL, NULL),
  ('Cruel Justice', 'William', 'Bernhardt', NULL, NULL),
  ('The Templar Legacy', 'Steve', 'Berry', NULL, NULL),
  ('The Patriot Threat', 'Steve', 'Berry', NULL, NULL),
  ('Afterland', 'Lauren', 'Beukes', NULL, NULL),
  ('The Shining Girls', 'Lauren', 'Beukes', NULL, NULL),
  ('Double Blind', 'Chris', 'Bohjalian', NULL, NULL),
  ('Open Season', 'C.J.', 'Box', 'Joe Pickett', '1'),
  ('Savage Run', 'C.J.', 'Box', 'Joe Pickett', '2'),
  ('Winterkill', 'C.J.', 'Box', 'Joe Pickett', '3'),
  ('Trophy Hunt', 'C.J.', 'Box', 'Joe Pickett', '4'),
  ('Out of Range', 'C.J.', 'Box', 'Joe Pickett', '5'),
  ('In Plain Sight', 'C.J.', 'Box', 'Joe Pickett', '6'),
  ('Free Fire', 'C.J.', 'Box', 'Joe Pickett', '10'),
  ('Blood Trail', 'C.J.', 'Box', 'Joe Pickett', '7'),
  ('Below Zero', 'C.J.', 'Box', 'Joe Pickett', '8'),
  ('Nowhere to Run', 'C.J.', 'Box', 'Joe Pickett', '9'),
  ('Cold Wind', 'C.J.', 'Box', 'Joe Pickett', '11'),
  ('Force of Nature', 'C.J.', 'Box', 'Joe Pickett', '12'),
  ('Breaking Point', 'C.J.', 'Box', 'Joe Pickett', '13'),
  ('Stone Cold', 'C.J.', 'Box', 'Joe Pickett', '14'),
  ('Endangered', 'C.J.', 'Box', 'Joe Pickett', '15'),
  ('Blue Heaven', 'C.J.', 'Box', NULL, NULL),
  ('Off the Grid', 'C.J.', 'Box', 'Joe Pickett', '16'),
  ('Viscious Circle', 'C.J.', 'Box', 'Joe Pickett', '17'),
  ('The Disappeared', 'C.J.', 'Box', 'Joe Pickett', '18'),
  ('The Highway', 'C.J.', 'Box', 'Cassie Dewell', '1'),
  ('Paradise Valley', 'C.J.', 'Box', 'Cassie Dewell', '4'),
  ('Wolf Pack', 'C.J.', 'Box', 'Joe Pickett', '19'),
  ('Long Range', 'C.J.', 'Box', 'Joe Pickett', '20'),
  ('The Bitterroots', 'C.J.', 'Box', 'Cassie Dewell', '3'),
  ('Dark Sky', 'C.J.', 'Box', 'Joe Pickett', '21'),
  ('Shadows Reel', 'C.J.', 'Box', 'Joe Pickett', '22'),
  ('Treasure State', 'C.J.', 'Box', 'Cassie Dewell', '5'),
  ('Storm Watch', 'C.J.', 'Box', 'Joe Pickett', '23'),
  ('Three Inch Teeth', 'C.J.', 'Box', 'Joe Pickett', '24'),
  ('Battle Mountain', 'C.J.', 'Box', 'Joe Pickett', '25'),
  ('The Crossroads', 'C.J.', 'Box', 'Joe Pickett', '26'),
  ('Fahrenheit 451', 'Ray', 'Bradbury', NULL, NULL),
  ('The Martian Chronicles', 'Ray', 'Bradbury', NULL, NULL),
  ('American Moonshot', 'Douglas', 'Brinkley', NULL, NULL),
  ('The Greatest Generation', 'Tom', 'Brokaw', NULL, NULL),
  ('A Lucky Life Interrupted', 'Tom', 'Brokaw', NULL, NULL),
  ('Angels and Demons', 'Dan', 'Brown', NULL, NULL),
  ('Deception Point', 'Dan', 'Brown', NULL, NULL),
  ('Digital Fortress', 'Dan', 'Brown', NULL, NULL),
  ('The DaVinci Code', 'Dan', 'Brown', NULL, NULL),
  ('The Lost Symbol', 'Dan', 'Brown', NULL, NULL),
  ('Inferno', 'Dan', 'Brown', NULL, NULL),
  ('Origin', 'Dan', 'Brown', NULL, NULL),
  ('The Secret of Secrets', 'Dan', 'Brown', NULL, NULL),
  ('The Boys in the Boat', 'Daniel James', 'Brown', NULL, NULL),
  ('Facing the Mountain', 'Daniel James', 'Brown', NULL, NULL),
  ('Bury My Heart at Wounded Knee', 'Dee', 'Brown', NULL, NULL),
  ('Red Rising', 'Pierce', 'Brown', NULL, NULL),
  ('Golden Son', 'Pierce', 'Brown', NULL, NULL),
  ('Morning Star', 'Pierce', 'Brown', NULL, NULL),
  ('Thick as Thieves', 'Sandra', 'Brown', NULL, NULL),
  ('Overkill', 'Sandra', 'Brown', NULL, NULL),
  ('Aftermath', 'Levar', 'Burton', NULL, NULL),
  ('Kindred', 'Octavia', 'Butler', NULL, NULL),
  ('Parable of the Sower', 'Octavia', 'Butler', NULL, NULL),
  ('Parable of the Talents', 'Octavia', 'Butler', NULL, NULL),
  ('All The Water In The World', 'Eiren', 'Caffall', NULL, NULL),
  ('The Rule of Four', 'Ian', 'Caldwell', NULL, NULL),
  ('Open Carry', 'Marc', 'Cameron', 'Arliss Cutter', '1'),
  ('Stone Cross', 'Marc', 'Cameron', 'Arliss Cutter', '2'),
  ('Bone Rattle', 'Marc', 'Cameron', 'Arliss Cutter', '3'),
  ('Cold Snap', 'Marc', 'Cameron', 'Arliss Cutter', '4'),
  ('Breakneck', 'Marc', 'Cameron', 'Arliss Cutter', '5'),
  ('In Cold Blood', 'Truman', 'Capote', NULL, NULL),
  ('Blaze Me a Sun', 'Christoffer', 'Carlsson', NULL, NULL),
  ('Under The Storm', 'Christoffer', 'Carlsson', NULL, NULL),
  ('The Alienist', 'Caleb', 'Carr', NULL, NULL),
  ('The Angel of Darkness', 'Caleb', 'Carr', NULL, NULL),
  ('Surrender, New York', 'Caleb', 'Carr', NULL, NULL),
  ('61 Hours', 'Lee', 'Child', NULL, NULL),
  ('Bad Luck and Trouble', 'Lee', 'Child', NULL, NULL),
  ('Gone Tomorrow', 'Lee', 'Child', NULL, NULL),
  ('One Shot', 'Lee', 'Child', NULL, NULL),
  ('Persuader', 'Lee', 'Child', NULL, NULL),
  ('Running Blind', 'Lee', 'Child', NULL, NULL),
  ('The Enemy', 'Lee', 'Child', NULL, NULL),
  ('The Hard Way', 'Lee', 'Child', NULL, NULL),
  ('Tripwire', 'Lee', 'Child', NULL, NULL),
  ('Worth Dying For', 'Lee', 'Child', NULL, NULL),
  ('Nothing to Lose', 'Lee', 'Child', NULL, NULL),
  ('Killing Floor', 'Lee', 'Child', NULL, NULL),
  ('Die Trying', 'Lee', 'Child', NULL, NULL),
  ('Without Fail', 'Lee', 'Child', NULL, NULL),
  ('Echo Burning', 'Lee', 'Child', NULL, NULL),
  ('Second Son', 'Lee', 'Child', NULL, NULL),
  ('Deep Down', 'Lee', 'Child', NULL, NULL),
  ('The Affair', 'Lee', 'Child', NULL, NULL),
  ('Personal', 'Lee', 'Child', NULL, NULL),
  ('A Wanted Man', 'Lee', 'Child', NULL, NULL),
  ('Never Go Back', 'Lee', 'Child', NULL, NULL),
  ('Make Me', 'Lee', 'Child', NULL, NULL),
  ('Night School', 'Lee', 'Child', NULL, NULL),
  ('The Midnight Line', 'Lee', 'Child', NULL, NULL),
  ('The Christmas Scorpion (Short Story)', 'Lee', 'Child', NULL, NULL),
  ('Past Tense', 'Lee', 'Child', NULL, NULL),
  ('Blue Moon', 'Lee', 'Child', NULL, NULL),
  ('The Sentinel (with Andrew Child)', 'Lee', 'Child', NULL, NULL),
  ('Better off Dead (with Andrew Child)', 'Lee', 'Child', NULL, NULL),
  ('No Plan B (with Andrew Child)', 'Lee', 'Child', NULL, NULL),
  ('Exit Strategy (with Andrew Child)', 'Lee', 'Child', NULL, NULL),
  ('In Too Deep (with Andrew Child)', 'Lee', 'Child', NULL, NULL),
  ('Flux', 'Jinwoo', 'Chong', NULL, NULL),
  ('A Thousand Yesteryears', 'Mae', 'Claire', NULL, NULL),
  ('Dead or Alive', 'Tom', 'Clancy', NULL, NULL),
  ('Debt of Honor', 'Tom', 'Clancy', NULL, NULL),
  ('Executive Orders', 'Tom', 'Clancy', NULL, NULL),
  ('Locked On', 'Tom', 'Clancy', NULL, NULL),
  ('Patriot Games', 'Tom', 'Clancy', NULL, NULL),
  ('Rainbow Six', 'Tom', 'Clancy', NULL, NULL),
  ('Red Rabbit', 'Tom', 'Clancy', NULL, NULL),
  ('Red Storm Rising', 'Tom', 'Clancy', NULL, NULL),
  ('The Bear and the Dragon', 'Tom', 'Clancy', NULL, NULL),
  ('The Cardinal of the Kremlin', 'Tom', 'Clancy', NULL, NULL),
  ('The Hunt for Red October', 'Tom', 'Clancy', NULL, NULL),
  ('The Sum of All Fears', 'Tom', 'Clancy', NULL, NULL),
  ('The Teeth of the Tiger', 'Tom', 'Clancy', NULL, NULL),
  ('Without Remores', 'Tom', 'Clancy', NULL, NULL),
  ('Locked On (Mark Greaney)', 'Tom', 'Clancy', NULL, NULL),
  ('Threat Vector (Mark Greaney)', 'Tom', 'Clancy', NULL, NULL),
  ('Command Authority (Mark Greaney)', 'Tom', 'Clancy', NULL, NULL),
  ('Under Fire (Grant Blackwood)', 'Tom', 'Clancy', NULL, NULL),
  ('Comander in Chief (Mark Greaney)', 'Tom', 'Clancy', NULL, NULL),
  ('Full Force and Effect (Mark Greaney)', 'Tom', 'Clancy', NULL, NULL),
  ('True Faith and Allegiance (Mark Greaney)', 'Tom', 'Clancy', NULL, NULL),
  ('Power Empire (Marc Cameron)', 'Tom', 'Clancy', NULL, NULL),
  ('Line of Sight (Mike Maden)', 'Tom', 'Clancy', NULL, NULL),
  ('Oath of Office (Marc Cameron)', 'Tom', 'Clancy', NULL, NULL),
  ('Enemy Contact (Mark Maden)', 'Tom', 'Clancy', NULL, NULL),
  ('Code of Honor (Marc Cameron)', 'Tom', 'Clancy', NULL, NULL),
  ('Shadow of the Dragon (Marc Cameron)', 'Tom', 'Clancy', NULL, NULL),
  ('Firing Point (Mike Maden)', 'Tom', 'Clancy', NULL, NULL),
  ('Zero Hour (Don Bentley)', 'Tom', 'Clancy', NULL, NULL),
  ('Red Winter (Marc Cameron)', 'Tom', 'Clancy', NULL, NULL),
  ('Chain of Command (Marc Cameron)', 'Tom', 'Clancy', NULL, NULL),
  ('Noble House', 'James', 'Clavell', NULL, NULL),
  ('Shogun', 'James', 'Clavell', NULL, NULL),
  ('TaiPan', 'James', 'Clavell', NULL, NULL),
  ('King Rat', 'James', 'Clavell', NULL, NULL),
  ('Deal Breaker', 'Harlan', 'Coben', NULL, NULL),
  ('Drop Shot', 'Harlan', 'Coben', NULL, NULL),
  ('Long Lost', 'Harlan', 'Coben', NULL, NULL),
  ('Play Dead', 'Harlan', 'Coben', NULL, NULL),
  ('Tell No One', 'Harlan', 'Coben', NULL, NULL),
  ('One False Move', 'Harlan', 'Coben', NULL, NULL),
  ('Fade Away', 'Harlan', 'Coben', NULL, NULL),
  ('Promise Me', 'Harlan', 'Coben', NULL, NULL),
  ('The Innocent', 'Harlan', 'Coben', NULL, NULL),
  ('Just One Look', 'Harlan', 'Coben', NULL, NULL),
  ('Caught', 'Harlan', 'Coben', NULL, NULL),
  ('Gone for Good', 'Harlan', 'Coben', NULL, NULL),
  ('No Second Chance', 'Harlan', 'Coben', NULL, NULL),
  ('Miracle Cure', 'Harlan', 'Coben', NULL, NULL),
  ('Stay Close', 'Harlan', 'Coben', NULL, NULL),
  ('Hold Tight', 'Harlan', 'Coben', NULL, NULL),
  ('Six Years', 'Harlan', 'Coben', NULL, NULL),
  ('Missing You', 'Harlan', 'Coben', NULL, NULL),
  ('The Woods', 'Harlan', 'Coben', NULL, NULL),
  ('The Stranger', 'Harlan', 'Coben', NULL, NULL),
  ('Darkest Fear', 'Harlan', 'Coben', NULL, NULL),
  ('Fool Me Once', 'Harlan', 'Coben', NULL, NULL),
  ('Home', 'Harlan', 'Coben', NULL, NULL),
  ('Don''t Let Go', 'Harlan', 'Coben', NULL, NULL),
  ('Run Away', 'Harlan', 'Coben', NULL, NULL),
  ('The Boy From the Woods', 'Harlan', 'Coben', NULL, NULL),
  ('Win', 'Harlan', 'Coben', NULL, NULL),
  ('The Match', 'Harlan', 'Coben', NULL, NULL),
  ('I Will Find You', 'Harlan', 'Coben', NULL, NULL),
  ('Think Twice', 'Harlan', 'Coben', NULL, NULL),
  ('The Hunger Games', 'Suzanne', 'Collins', NULL, NULL),
  ('Catching Fire', 'Suzanne', 'Collins', NULL, NULL),
  ('Mockingjay', 'Suzanne', 'Collins', NULL, NULL),
  ('Sunrise on the Reaping', 'Suzanne', 'Collins', NULL, NULL),
  ('Angels Flight', 'Michael', 'Connelly', NULL, NULL),
  ('Blood Work', 'Michael', 'Connelly', NULL, NULL),
  ('City of Bones', 'Michael', 'Connelly', NULL, NULL),
  ('Echo Park', 'Michael', 'Connelly', NULL, NULL),
  ('Lost Light', 'Michael', 'Connelly', NULL, NULL),
  ('The Black Echo', 'Michael', 'Connelly', NULL, NULL),
  ('The Black Ice', 'Michael', 'Connelly', NULL, NULL),
  ('The Brass Verdict', 'Michael', 'Connelly', NULL, NULL),
  ('The Last Coyote', 'Michael', 'Connelly', NULL, NULL),
  ('The Lincoln Lawyer', 'Michael', 'Connelly', NULL, NULL),
  ('The Narrows', 'Michael', 'Connelly', NULL, NULL),
  ('The Overlook', 'Michael', 'Connelly', NULL, NULL),
  ('The Poet', 'Michael', 'Connelly', NULL, NULL),
  ('The Scarecrow', 'Michael', 'Connelly', NULL, NULL),
  ('Trunk Music', 'Michael', 'Connelly', NULL, NULL),
  ('The Reversal', 'Michael', 'Connelly', NULL, NULL),
  ('The Drop (Harry Bosch)', 'Michael', 'Connelly', NULL, NULL),
  ('The Fifth Witness', 'Michael', 'Connelly', NULL, NULL),
  ('The Black Box (Harry Bosch)', 'Michael', 'Connelly', NULL, NULL),
  ('The Gods of Guilt', 'Michael', 'Connelly', NULL, NULL),
  ('The Burning Room (Harry Bosch)', 'Michael', 'Connelly', NULL, NULL),
  ('The Crossing (Harry Bosch)', 'Michael', 'Connelly', NULL, NULL),
  ('The Wrong Side of of Goodbye (Harry Bosch)', 'Michael', 'Connelly', NULL, NULL),
  ('A Darkness More Than Night (Harry Bosch)', 'Michael', 'Connelly', NULL, NULL),
  ('The Late Show', 'Michael', 'Connelly', 'Renee Ballard', '1'),
  ('Two Kinds of Truth', 'Michael', 'Connelly', 'Harry Bosch', '20'),
  ('Dark Sacred Night', 'Michael', 'Connelly', 'Harry Bosch #21;

-- ── 5. SEED EXISTING USERS ───────────────────────────────────

INSERT INTO public.user_books (user_id, book_id, status)
SELECT u.id, b.id, 'read' FROM auth.users u CROSS JOIN public.books b
ON CONFLICT (user_id, book_id) DO NOTHING;

-- ── 6. STAR RATINGS (55 books) ───────────────────────────────

UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Things Fall Apart' AND author_last ILIKE 'Achebe' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Watership Down' AND author_last ILIKE 'Adams' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 2 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Clan of the Cave Bear' AND author_last ILIKE 'Auel' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Fahrenheit 451' AND author_last ILIKE 'Bradbury' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Boys in the Boat' AND author_last ILIKE 'Brown' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Bury My Heart at Wounded Knee' AND author_last ILIKE 'Brown' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 2 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Parable of the Sower' AND author_last ILIKE 'Butler' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 2 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Parable of the Talents' AND author_last ILIKE 'Butler' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Alienist' AND author_last ILIKE 'Carr' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 2 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Power of One' AND author_last ILIKE 'Courtenoy' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Passage' AND author_last ILIKE 'Cronin' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Twelve' AND author_last ILIKE 'Cronin' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The City of Mirrors' AND author_last ILIKE 'Cronin' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Complete Sherlock Holmes' AND author_last ILIKE 'Doyle' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 2 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Joys of Motherhood' AND author_last ILIKE 'Emecheta' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'James' AND author_last ILIKE 'Everett' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Time After Time' AND author_last ILIKE 'Finney' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Likeness' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Faithful Place' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Broken Harbor' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Searcher' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Secret Place' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Trespasser' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Witch Elm' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Hunter' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Keeper' AND author_last ILIKE 'French' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'From Beirut to Jerusalem' AND author_last ILIKE 'Friedman' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Forever' AND author_last ILIKE 'Hamill' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Snow in August' AND author_last ILIKE 'Hamill' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Great Alone' AND author_last ILIKE 'Hannah' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 2 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'A Thousand Splendid Suns' AND author_last ILIKE 'Hosseini' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Kite Runner' AND author_last ILIKE 'Hosseini' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Never Let Me Go' AND author_last ILIKE 'Ishiguro' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Say Nothing' AND author_last ILIKE 'Keefe' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Stand' AND author_last ILIKE 'King' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Poisonwood Bible' AND author_last ILIKE 'Kingsolver' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Devil in the White City' AND author_last ILIKE 'Larson' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Girl Who Played with Fire' AND author_last ILIKE 'Larsson' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Girl with the Dragon Tatoo' AND author_last ILIKE 'Larsson' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Girl Who Kicked the Hornet''s Nest' AND author_last ILIKE 'Larsson' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'To Kill A Mockingbird' AND author_last ILIKE 'Lee' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Glory and the Dream' AND author_last ILIKE 'Manchester' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Matterhorn' AND author_last ILIKE 'Marlantes' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Truman' AND author_last ILIKE 'McCullough' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Source' AND author_last ILIKE 'Michener' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Last Days of Ptolemy Grey' AND author_last ILIKE 'Mosely' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Eight' AND author_last ILIKE 'Neville' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE '"Cry' AND author_last ILIKE 'Paton' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Chosen' AND author_last ILIKE 'Potok' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Promise' AND author_last ILIKE 'Potok' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Black and Blue' AND author_last ILIKE 'Quindlin' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Rise and Fall of the Third Reich' AND author_last ILIKE 'Shier' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'One Day in the Life of Ivan Denisovich' AND author_last ILIKE 'Solzhenitsyn' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 3 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'Grapes of Wrath' AND author_last ILIKE 'Steinbeck' LIMIT 1) AND rating IS NULL;
UPDATE public.user_books SET rating = 1 WHERE book_id = (SELECT id FROM public.books WHERE title ILIKE 'The Hobbit' AND author_last ILIKE 'Tolkien' LIMIT 1) AND rating IS NULL;

-- ── 7. VERIFY ────────────────────────────────────────────────

SELECT COUNT(*) AS books        FROM public.books;
SELECT COUNT(*) AS user_books   FROM public.user_books;
SELECT COUNT(*) AS rated        FROM public.user_books WHERE rating IS NOT NULL;