import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../components/Shell'
import { BookOpen, BookCheck, Library, HelpCircle, Compass, BarChart2, Layers, Users, Swords, BookMarked, Plus, Star, Pencil } from 'lucide-react'

const sections = [
  {
    icon: Library,
    color: '#8a7eb8',
    title: 'The Library',
    path: '/library',
    summary: 'Your entire collection — all 932 books — in one place.',
    body: `This is the heart of everything. Every book you've ever read, wanted to read, or is sitting on your shelf waiting for you lives here.\n\nYou can browse in grid view (good for browsing by feel) or list view (better when you know what you're looking for). Sort by author, title, your rating, or by series. Use the search bar to find anything in seconds — it searches titles and authors simultaneously.\n\nThe filters let you narrow down by status (Read, Reading, Want to read), by genre, and by fiction vs. nonfiction. Click any book card to open its full profile where you can see everything you've recorded about it.\n\nThe download button exports your entire library to a spreadsheet — useful if you ever want to back it up or share it.`,
  },
  {
    icon: BookCheck,
    color: '#c9963c',
    title: 'A Book I Finished',
    path: '/debrief',
    summary: 'A short ritual to mark a finished book and capture what it left behind.',
    body: `When you finish a book, this is where you come. It walks you through eight questions — not a review, not homework, just a quiet conversation with yourself about what you just read.\n\nYou'll rate the book, name the one thing you'll remember, describe the best moment, note where it dragged (every book drags somewhere), say who you'd hand it to, what it reminds you of, and whether you'd recommend it.\n\nNone of it is required. Skip anything you don't feel like answering. The point is to capture the feeling while it's still fresh — not to write an essay.\n\nWhen you're done, you'll see a summary of everything you said. Then the book is officially debriefed.`,
  },
  {
    icon: HelpCircle,
    color: '#b87a5a',
    title: 'Fill in the Blanks',
    path: '/fill',
    summary: 'Go back and add missing details to books you finished long ago.',
    body: `Some books in your library were added before you had a chance to record your thoughts. This section surfaces those books — sorted by how much is missing — and lets you fill in the blanks one field at a time.\n\nYou'll see what you've already said (if anything), and the current missing field is presented as the active question. Answer it, skip it, or move on.\n\nEvery session here counts toward your reading streak. It's a good thing to do on a slow afternoon when you don't feel like starting something new — a quiet way to tend to the library.`,
  },
  {
    icon: Compass,
    color: '#6a9ab0',
    title: 'What Should I Read Next?',
    path: '/next-read',
    summary: 'Browse your want-to-read shelf, or let the library decide for you.',
    body: `Your want-to-read shelf, presented as a reading list. Every book you've added with "I want to read this" lives here, organized by series so you can see where you left off.\n\nThe "Pick one for me" button uses a weighted random selection — books by authors you've rated highly are more likely to come up, but any book can win. It's not purely random; it's biased toward authors you already love.\n\nWhen you find one you're ready to start, hit "Start reading" and it moves to your in-progress shelf immediately. Or click into the book profile to read your notes first.`,
  },
  {
    icon: Swords,
    color: '#9a6a8a',
    title: 'Head to Head',
    path: '/versus',
    summary: 'Can\'t decide between two books? Let them fight it out.',
    body: `Two books from your want-to-read shelf go head to head. You pick the one you'd rather read right now. The winner stays in the ring, a new challenger appears, and after five rounds the survivor is your pick for tonight.\n\nIt sounds like a game — and it is — but it's also a genuinely useful way to make a decision. When you see two books next to each other, your gut usually knows immediately which one you want. The bracket just makes you commit.\n\nThe final winner gets a "Let's read it" button that moves it straight to your in-progress shelf.`,
  },
  {
    icon: Layers,
    color: '#6a9070',
    title: 'Series Tracker',
    path: '/series',
    summary: 'See every series in your library — what you\'ve read, what\'s next, what\'s missing.',
    body: `Your library has a lot of series — from C.J. Box's 26-book Joe Pickett run to David Baldacci's multiple parallel series. This page organizes all of them in one place.\n\nEach series shows its books in order, color-coded by status: green for read, gold for want-to-read, blue for currently reading. If there's a gap — you have books 1, 2, and 4 but not 3 — it's flagged in red as "Missing from library."\n\nFilter by Complete (you've read every book), In Progress (you've started but there's more), or Has Gaps (the library is missing a book in the middle of the series). Useful for figuring out exactly where you left off in a long series.`,
  },
  {
    icon: Users,
    color: '#7a8ab0',
    title: 'Authors',
    path: '/library',
    summary: 'Tap any author\'s name in the library to see their full page.',
    body: `Every author in your library has their own page. Get there by clicking an author's name anywhere it appears — on a book card, in a book profile, or in search results.\n\nThe author page shows every book of theirs in your library, organized by series and standalone works. You'll see your ratings, your "one thing I'll remember" notes for each book, and how many you've read vs. still have waiting.\n\nIf you've read enough of their books, it'll surface a random quote from your notes — something you wrote about one of their books that you might have forgotten.`,
  },
  {
    icon: BarChart2,
    color: '#9a7a60',
    title: 'My Reading Life',
    path: '/stats',
    summary: 'Analytics about your reading habits and your library.',
    body: `Two tabs. The first is about you as a reader: how many books you've read, your debrief percentage, average rating, reading streak, genre breakdown, and the authors you've returned to most.\n\nThe second tab is about the library itself as an object: how many books it contains, how many are part of a series vs. standalone, the fiction/nonfiction split, genre coverage, and data completeness (what percentage of books have summaries, genres, Dewey decimal numbers).\n\nYour reading streak counts any day you log a debrief or fill in the blanks. It's not about how many pages you read — it's about engaging with what you've already read.`,
  },
  {
    icon: BookMarked,
    color: '#7a9e8a',
    title: 'Add a Book',
    path: '/add-want',
    summary: 'Add any book to your want-to-read shelf.',
    body: `Search by title or author and the library checks two places at once: your existing collection (in case it's already there) and Open Library, a free public database of millions of books.\n\nIf it's in Open Library, selecting it automatically pulls in the genre, fiction/nonfiction classification, Dewey decimal number, and a summary — no typing required.\n\nIf you can't find it, there's a manual entry form. Fill in what you know; everything else can be added later from the book's profile page.\n\nThe book goes straight to your want-to-read shelf and shows up in Head to Head and What Should I Read Next.`,
  },
  {
    icon: Pencil,
    color: '#a08060',
    title: 'Book Profiles',
    path: '/library',
    summary: 'Everything recorded about a single book — click any title to open it.',
    body: `Each book in the library has its own profile page. From here you can:\n\n• Change the reading status (Read, Reading, Want to read, DNF)\n• Set or update your star rating\n• Edit the genre, format, and other metadata\n• Read the book's summary (fetched automatically from Open Library when available)\n• See everything you said in your debrief: the one thing you'll remember, the best moment, who you'd give it to\n• Save a memorable passage — a sentence or paragraph from the book itself that you want to keep\n\nAll changes save instantly. Nothing requires a submit button.`,
  },
]

export default function GuidePage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(null)

  return (
    <Shell showBack>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 48, paddingBottom: 40, borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Welcome to</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 400, lineHeight: 1.1, marginBottom: 20 }}>Sal's Library</h1>
          <p style={{ color: 'var(--text2)', fontSize: 17, lineHeight: 1.7, maxWidth: 580 }}>
            This is a private catalogue built for a life spent reading. It holds your entire collection — every book you've read, every series you've followed, every thought you had when you finished something that moved you.
          </p>
          <p style={{ color: 'var(--text2)', fontSize: 17, lineHeight: 1.7, maxWidth: 580, marginTop: 12 }}>
            Below is a guide to everything it can do. Tap any section to read more.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map((s, i) => {
            const Icon = s.icon
            const isOpen = open === i
            return (
              <div key={i} style={{ background: isOpen ? 'var(--bg2)' : 'transparent', border: `1px solid ${isOpen ? 'var(--border2)' : 'transparent'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'all 0.2s' }}>
                <button onClick={() => setOpen(isOpen ? null : i)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={s.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontFamily: 'var(--font-serif)', fontWeight: 500, marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.4 }}>{s.summary}</div>
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--text3)', flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</div>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 24px 76px' }}>
                    {s.body.split('\n\n').map((para, pi) => (
                      <p key={pi} style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.75, marginBottom: pi < s.body.split('\n\n').length - 1 ? 16 : 0 }}>{para}</p>
                    ))}
                    {s.path && (
                      <button onClick={() => navigate(s.path)}
                        style={{ marginTop: 20, background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '9px 18px', color: '#1a1300', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>
                        Go to {s.title} →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 8px' }}>
            "A reader lives a thousand lives before he dies. The man who never reads lives only one."
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: '0.06em' }}>— George R.R. Martin</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 24 }}>932 books. A life well-read.</p>
        </div>
      </div>
    </Shell>
  )
}
