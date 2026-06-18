// Run: node import-books.mjs
// Imports all books from Sal's PDF into Supabase.
// Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env manually
const envPath = join(__dir, '.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
)

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
)

const books = JSON.parse(readFileSync('/tmp/sals_books_parsed.json', 'utf8'))

console.log(`Importing ${books.length} books…`)

const BATCH = 50
let inserted = 0, skipped = 0, errors = 0

for (let i = 0; i < books.length; i += BATCH) {
  const batch = books.slice(i, i + BATCH).map(b => ({
    title: b.title,
    author_first: b.author_first || null,
    author_last: b.author_last || null,
    series: b.series || null,
    series_num: b.series_num || null,
  }))

  const { data, error } = await supabase
    .from('books')
    .upsert(batch, { onConflict: 'title,author_last', ignoreDuplicates: true })
    .select('id')

  if (error) {
    // Try one-by-one to isolate bad rows
    for (const row of batch) {
      const { error: e2 } = await supabase.from('books')
        .upsert([row], { onConflict: 'title,author_last', ignoreDuplicates: true })
      if (e2) {
        console.error(`  ✗ ${row.title} by ${row.author_last}: ${e2.message}`)
        errors++
      } else {
        inserted++
      }
    }
  } else {
    inserted += batch.length
  }

  process.stdout.write(`\r  ${Math.min(i + BATCH, books.length)}/${books.length}…`)
}

console.log(`\n\nDone. ${inserted} processed, ${errors} errors.`)

if (errors === 0) {
  console.log('\n⚠️  Note: "David Balducci" in this list should be "David Baldacci" — the original spreadsheet has a typo. You can fix it in the library after import.')
}
