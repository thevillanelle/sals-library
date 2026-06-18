// Fetches book descriptions from Open Library and writes summaries.sql.
// Run: node fetch-summaries.mjs
// Then paste summaries.sql into the Supabase SQL editor.

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const sleep = ms => new Promise(r => setTimeout(r, ms))

function esc(str) {
  return str.replace(/'/g, "''")
}

function parseCSV(path) {
  const lines = readFileSync(path, 'utf8').split('\n').slice(1)
  const books = []
  for (const line of lines) {
    if (!line.trim()) continue
    const parts = line.split(',')
    const first = parts[0]?.trim()
    const last = parts[1]?.trim()
    const titleRaw = parts[2]?.trim()
    if (!titleRaw || !last) continue
    const title = titleRaw.replace(/\s*\(.*?\)\s*/g, '').trim()
    books.push({ first, last, title })
  }
  return books
}

async function fetchDescription(title, authorLast) {
  try {
    // Step 1: search for the book
    const q = encodeURIComponent(`${title} ${authorLast}`)
    const searchUrl = `https://openlibrary.org/search.json?q=${q}&limit=3&fields=key,title,author_name,first_publish_year`
    const searchRes = await fetch(searchUrl)
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()

    const doc = (searchData.docs || []).find(d =>
      d.author_name?.some(a => a.toLowerCase().includes(authorLast.toLowerCase()))
    ) || searchData.docs?.[0]

    if (!doc?.key) return null

    // Step 2: fetch the work to get description
    const workRes = await fetch(`https://openlibrary.org${doc.key}.json`)
    if (!workRes.ok) return null
    const work = await workRes.json()

    let desc = work.description
    if (typeof desc === 'object') desc = desc.value
    if (!desc || desc.length < 60) return null

    return desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 600)
  } catch { return null }
}

async function main() {
  const csvPath = '/tmp/sals_books_export/Sheet1-Table 1.csv'
  const books = parseCSV(csvPath)
  console.log(`Fetching descriptions for ${books.length} books via Open Library...\n`)

  const lines = []
  let found = 0, missing = 0

  for (let i = 0; i < books.length; i++) {
    const { title, first, last } = books[i]
    const desc = await fetchDescription(title, last)

    if (desc) {
      lines.push(`UPDATE public.books SET summary = '${esc(desc)}' WHERE title ILIKE '${esc(title)}' AND author_last ILIKE '${esc(last)}';`)
      found++
    } else {
      missing++
    }

    process.stdout.write(`\r  ${found} found, ${missing} not found -- ${i + 1}/${books.length}`)
    await sleep(200)
  }

  const outPath = join(__dir, 'summaries.sql')
  writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(`\n\nDone. ${found} descriptions written to summaries.sql`)
  console.log('Paste summaries.sql into the Supabase SQL editor to apply.')
}

main()
