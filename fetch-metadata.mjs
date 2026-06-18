// Fetches genre, fiction/nonfiction, and Dewey decimal from Open Library.
// Run: node fetch-metadata.mjs
// Then paste metadata.sql into the Supabase SQL editor.

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const sleep = ms => new Promise(r => setTimeout(r, ms))

function esc(str) { return str.replace(/'/g, "''") }

function parseCSV(path) {
  const lines = readFileSync(path, 'utf8').split('\n').slice(1)
  const books = []
  for (const line of lines) {
    if (!line.trim()) continue
    const parts = line.split(',')
    const first = parts[0]?.trim()
    const last  = parts[1]?.trim()
    const titleRaw = parts[2]?.trim()
    if (!titleRaw || !last) continue
    const title = titleRaw.replace(/\s*\(.*?\)\s*/g, '').trim()
    books.push({ first, last, title })
  }
  return books
}

// Map Open Library subjects → a single genre string
const GENRE_KEYWORDS = [
  ['Science Fiction',   ['science fiction', 'sci-fi', 'space opera', 'cyberpunk', 'dystopian']],
  ['Fantasy',           ['fantasy', 'magic', 'dragons', 'wizards', 'sword and sorcery']],
  ['Horror',            ['horror', 'supernatural fiction', 'ghost stories']],
  ['Mystery',           ['mystery', 'detective', 'whodunit', 'noir']],
  ['Thriller',          ['thriller', 'suspense', 'espionage', 'spy', 'assassination']],
  ['Crime',             ['crime', 'murder', 'heist', 'true crime']],
  ['Historical Fiction',['historical fiction', 'historical novel']],
  ['Literary Fiction',  ['literary fiction', 'psychological fiction']],
  ['Biography',         ['biography', 'autobiography', 'memoir', 'personal memoirs']],
  ['History',           ['history', 'world war', 'civil war', 'military history', 'ancient history']],
  ['Science',           ['science', 'natural history', 'evolution', 'physics', 'biology']],
  ['Adventure',         ['adventure', 'survival', 'exploration']],
  ['Western',           ['western stories', 'frontier']],
  ['Romance',           ['romance', 'love stories']],
  ['Classic',           ['classics', '19th century fiction', 'victorian']],
]

function deriveGenre(subjects) {
  const lower = subjects.map(s => s.toLowerCase())
  for (const [genre, keywords] of GENRE_KEYWORDS) {
    if (keywords.some(k => lower.some(s => s.includes(k)))) return genre
  }
  return null
}

function deriveFiction(subjects) {
  const lower = subjects.map(s => s.toLowerCase()).join(' ')
  if (/\bnonfiction\b|non-fiction|biography|autobiography|memoir|history|true crime|science|essays/.test(lower)) return false
  if (/\bfiction\b|novel|stories/.test(lower)) return true
  return null
}

async function fetchMetadata(title, authorLast) {
  try {
    const q = encodeURIComponent(`${title} ${authorLast}`)
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=3&fields=key,author_name,subject`)
    if (!res.ok) return null
    const data = await res.json()
    const doc = (data.docs || []).find(d =>
      d.author_name?.some(a => a.toLowerCase().includes(authorLast.toLowerCase()))
    ) || data.docs?.[0]
    if (!doc?.key) return null

    const subjects = doc.subject || []
    const genre    = deriveGenre(subjects)
    const fiction  = deriveFiction(subjects)

    // Fetch editions to find Dewey decimal (it lives on editions, not the work)
    let dewey = null
    const workId = doc.key.replace('/works/', '')
    const edRes = await fetch(`https://openlibrary.org/works/${workId}/editions.json?limit=10`)
    if (edRes.ok) {
      const edData = await edRes.json()
      const withDewey = (edData.entries || []).find(e => e.dewey_decimal_class?.length)
      const raw = withDewey?.dewey_decimal_class?.find(d => /^\d/.test(d)) || withDewey?.dewey_decimal_class?.[0]
      if (raw) dewey = raw.trim()
    }

    if (!dewey && !genre && fiction === null) return null
    return { dewey, genre, fiction }
  } catch { return null }
}

async function main() {
  const csvPath = '/tmp/sals_books_export/Sheet1-Table 1.csv'
  const books = parseCSV(csvPath)
  console.log(`Fetching metadata for ${books.length} books...\n`)

  const lines = []
  let found = 0, missing = 0

  for (let i = 0; i < books.length; i++) {
    const { title, last } = books[i]
    const meta = await fetchMetadata(title, last)

    if (meta) {
      const parts = []
      if (meta.dewey)          parts.push(`dewey = '${esc(meta.dewey)}'`)
      if (meta.genre)          parts.push(`genre = '${esc(meta.genre)}'`)
      if (meta.fiction !== null) parts.push(`fiction = ${meta.fiction}`)
      if (parts.length) {
        lines.push(`UPDATE public.books SET ${parts.join(', ')} WHERE title ILIKE '${esc(title)}' AND author_last ILIKE '${esc(last)}';`)
        found++
      } else { missing++ }
    } else { missing++ }

    process.stdout.write(`\r  ${found} found, ${missing} not found -- ${i + 1}/${books.length}`)
    await sleep(200)
  }

  const outPath = join(__dir, 'metadata.sql')
  writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(`\n\nDone. ${found} books written to metadata.sql`)
  console.log('Paste metadata.sql into the Supabase SQL editor to apply.')
}

main()
