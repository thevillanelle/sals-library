// Fetches book summaries from Google Books API and writes a SQL file.
// Run: node fetch-summaries.mjs
// Then paste the generated summaries.sql into the Supabase SQL editor.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
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
  const q = encodeURIComponent(`intitle:${title}${authorLast ? ` inauthor:${authorLast}` : ''}`)
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&printType=books`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    for (const item of (data.items || [])) {
      const desc = item.volumeInfo?.description
      if (desc && desc.length > 50)
        return desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 600)
    }
    return null
  } catch { return null }
}

function esc(str) {
  return str.replace(/'/g, "''")
}

async function main() {
  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, author_first, author_last')
    .is('summary', null)
    .order('author_last')

  if (error) { console.error('Failed to load books:', error.message); process.exit(1) }
  console.log(`Fetching summaries for ${books.length} books…\n`)

  const lines = []
  let found = 0, missing = 0

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const summary = await fetchSummary(book.title, book.author_first, book.author_last)

    if (summary) {
      lines.push(`UPDATE public.books SET summary = '${esc(summary)}' WHERE id = '${book.id}';`)
      found++
    } else {
      missing++
    }

    process.stdout.write(`\r  ${found} found, ${missing} missing — ${i+1}/${books.length}`)
    await sleep(120)
  }

  const outPath = join(__dir, 'summaries.sql')
  writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(`\n\nDone. ${found} summaries written to summaries.sql`)
  console.log('Paste summaries.sql into the Supabase SQL editor to apply.')
}

main()
