// Fetches book summaries from Google Books API and saves to Supabase.
// Run: node fetch-summaries.mjs
// Safe to re-run — skips books that already have a summary.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(__dir, '.env'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchSummary(title, authorFirst, authorLast) {
  const author = [authorFirst, authorLast].filter(Boolean).join(' ')
  const q = encodeURIComponent(`intitle:${title}${author ? ` inauthor:${authorLast || author}` : ''}`)
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&printType=books`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.items?.length) return null

    // Find the best match — prefer items that have a description
    for (const item of data.items) {
      const desc = item.volumeInfo?.description
      if (desc && desc.length > 50) {
        // Strip HTML tags
        return desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 800)
      }
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  // Load all books without a summary
  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, author_first, author_last')
    .is('summary', null)
    .order('author_last')

  if (error) { console.error('Failed to load books:', error.message); process.exit(1) }
  console.log(`Fetching summaries for ${books.length} books…\n`)

  let found = 0, missing = 0

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const summary = await fetchSummary(book.title, book.author_first, book.author_last)

    if (summary) {
      const { error: err } = await supabase
        .from('books')
        .update({ summary })
        .eq('id', book.id)
      if (err) {
        console.error(`  ✗ ${book.title}: ${err.message}`)
      } else {
        found++
        process.stdout.write(`\r  ✓ ${found} found, ${missing} missing — ${i+1}/${books.length}`)
      }
    } else {
      missing++
      process.stdout.write(`\r  ✓ ${found} found, ${missing} missing — ${i+1}/${books.length}`)
    }

    // Stay under Google's rate limit (~10 req/s) — 120ms between requests
    await sleep(120)
  }

  console.log(`\n\nDone. ${found} summaries saved, ${missing} not found on Google Books.`)
}

main()
