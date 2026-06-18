// Second-pass metadata fetch for books that got nothing in the first pass.
// Queries Supabase directly for books with NULL genre/fiction/dewey, then
// tries multiple OL search strategies (title-only, shorter title, etc.)
// Run: node fetch-metadata-pass2.mjs
// Then paste metadata-pass2.sql into the Supabase SQL editor.

import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const esc = str => str.replace(/'/g, "''")

const SUPABASE_URL = 'https://zklptrasxhbnkgjtehah.supabase.co'
const SUPABASE_KEY = 'sb_publishable_z-JuWFUIu0JVigIsY0uRuw_CCjFZPug'

const GENRE_KEYWORDS = [
  ['Science Fiction',    ['science fiction', 'sci-fi', 'space opera', 'cyberpunk', 'dystopian']],
  ['Fantasy',            ['fantasy', 'magic', 'dragons', 'wizards', 'sword and sorcery']],
  ['Horror',             ['horror', 'supernatural fiction', 'ghost stories']],
  ['Mystery',            ['mystery', 'detective', 'whodunit', 'noir']],
  ['Thriller',           ['thriller', 'suspense', 'espionage', 'spy']],
  ['Crime',              ['crime', 'murder', 'heist', 'true crime']],
  ['Historical Fiction', ['historical fiction', 'historical novel']],
  ['Literary Fiction',   ['literary fiction', 'psychological fiction']],
  ['Biography',          ['biography', 'autobiography', 'memoir', 'personal memoirs']],
  ['History',            ['history', 'world war', 'civil war', 'military history']],
  ['Science',            ['science', 'natural history', 'evolution', 'physics', 'biology']],
  ['Adventure',          ['adventure', 'survival', 'exploration']],
  ['Western',            ['western stories', 'frontier']],
  ['Romance',            ['romance', 'love stories']],
  ['Classic',            ['classics', '19th century fiction', 'victorian']],
]

function deriveGenre(subjects) {
  const lower = subjects.map(s => s.toLowerCase())
  for (const [genre, keywords] of GENRE_KEYWORDS) {
    if (keywords.some(k => lower.some(s => s.includes(k)))) return genre
  }
  return null
}

function deriveFiction(subjects) {
  const lower = subjects.join(' ').toLowerCase()
  if (/\bnonfiction\b|non-fiction|biography|autobiography|memoir|history|true crime|science|essays/.test(lower)) return false
  if (/\bfiction\b|novel|stories/.test(lower)) return true
  return null
}

async function fetchFromOL(query, authorLast) {
  const q = encodeURIComponent(query)
  const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=5&fields=key,author_name,subject`)
  if (!res.ok) return null
  const data = await res.json()
  if (!data.docs?.length) return null

  // Try to match author, fall back to first result
  const doc = data.docs.find(d =>
    d.author_name?.some(a => a.toLowerCase().includes(authorLast.toLowerCase()))
  ) || data.docs[0]
  if (!doc?.key) return null

  const subjects = doc.subject || []
  const genre   = deriveGenre(subjects)
  const fiction = deriveFiction(subjects)

  let dewey = null
  const workId = doc.key.replace('/works/', '')
  try {
    const edRes = await fetch(`https://openlibrary.org/works/${workId}/editions.json?limit=20`)
    if (edRes.ok) {
      const edData = await edRes.json()
      const withDewey = (edData.entries || []).find(e => e.dewey_decimal_class?.length)
      const raw = withDewey?.dewey_decimal_class?.find(d => /^\d/.test(d)) || withDewey?.dewey_decimal_class?.[0]
      if (raw) dewey = raw.trim()
    }
  } catch { /* best effort */ }

  if (!dewey && !genre && fiction === null) return null
  return { dewey, genre, fiction }
}

// Progressively looser search strategies
async function tryStrategies(title, authorLast, authorFirst) {
  const fullAuthor = [authorFirst, authorLast].filter(Boolean).join(' ')

  const strategies = [
    `${title} ${fullAuthor}`,                          // full title + full author
    `${title} ${authorLast}`,                          // full title + last name (same as pass 1)
    title,                                              // title only
    title.split(':')[0].trim(),                        // title before subtitle
    title.split('(')[0].trim(),                        // title before parenthetical
    title.replace(/[,.'":!?]/g, '').trim(),            // title with punctuation stripped
    // If multi-word title, try just the first 4 words
    title.split(' ').slice(0, 4).join(' '),
  ].filter((s, i, arr) => s.length > 2 && arr.indexOf(s) === i) // dedupe + filter blanks

  for (const query of strategies) {
    try {
      const result = await fetchFromOL(query, authorLast)
      if (result) return result
      await sleep(150)
    } catch { await sleep(150) }
  }
  return null
}

async function main() {
  // Fetch books with missing metadata directly from Supabase
  console.log('Fetching books with missing metadata from Supabase…')
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/books?select=id,title,author_first,author_last&genre=is.null&fiction=is.null&dewey=is.null&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  if (!res.ok) { console.error('Failed to fetch from Supabase:', res.status); process.exit(1) }
  const books = await res.json()
  console.log(`Found ${books.length} books with no metadata.\n`)

  const lines = []
  let found = 0, missing = 0

  for (let i = 0; i < books.length; i++) {
    const { id, title, author_first, author_last } = books[i]
    const meta = await tryStrategies(title, author_last || '', author_first || '')

    if (meta) {
      const parts = []
      if (meta.dewey)           parts.push(`dewey = '${esc(meta.dewey)}'`)
      if (meta.genre)           parts.push(`genre = '${esc(meta.genre)}'`)
      if (meta.fiction !== null) parts.push(`fiction = ${meta.fiction}`)
      if (parts.length) {
        lines.push(`UPDATE public.books SET ${parts.join(', ')} WHERE id = '${id}';`)
        found++
      } else { missing++ }
    } else { missing++ }

    process.stdout.write(`\r  ${found} found, ${missing} still missing -- ${i + 1}/${books.length}`)
    await sleep(150)
  }

  const outPath = join(__dir, 'metadata-pass2.sql')
  writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(`\n\nDone. ${found} more books written to metadata-pass2.sql`)
  console.log('Paste metadata-pass2.sql into the Supabase SQL editor to apply.')
}

main()
