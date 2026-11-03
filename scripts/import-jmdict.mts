/**
 * Imports the "common words" edition of JMdict (English glosses) into dictionary_entries.
 * Data: jmdict-simplified by scriptin, from JMdict by EDRDG — CC BY-SA 4.0.
 *
 *   npm run dict:import            # local Supabase from .env.local
 *
 * Idempotent: rows are upserted by JMdict id.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

const RELEASE = "3.6.2+20261026175559";
const URL_ = `https://github.com/scriptin/jmdict-simplified/releases/download/${encodeURIComponent(RELEASE)}/jmdict-eng-common-${encodeURIComponent(RELEASE)}.json.zip`;
const BATCH_SIZE = 1000;

interface JmdictWord {
  id: string;
  kanji: Array<{ common: boolean; text: string }>;
  kana: Array<{ common: boolean; text: string }>;
  sense: Array<{ partOfSpeech: string[]; gloss: Array<{ text: string }> }>;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret)
  throw new Error("Run with .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)");

console.info(`Downloading JMdict common ${RELEASE}...`);
const response = await fetch(URL_);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const zipPath = join(mkdtempSync(join(tmpdir(), "jmdict-")), "jmdict.zip");
writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));

// The archive holds a single JSON file; `unzip -p` streams it to stdout
const json = execFileSync("unzip", ["-p", zipPath], { maxBuffer: 512 * 1024 * 1024 }).toString(
  "utf8",
);
const { words } = JSON.parse(json) as { words: JmdictWord[] };
console.info(`Parsed ${words.length} entries`);

const rows = words.map((word) => ({
  id: word.id,
  // Common forms first so the popup shows the usual spelling
  kanji: [...word.kanji].sort((a, b) => Number(b.common) - Number(a.common)).map((k) => k.text),
  kana: [...word.kana].sort((a, b) => Number(b.common) - Number(a.common)).map((k) => k.text),
  senses: word.sense.slice(0, 5).map((sense) => ({
    pos: sense.partOfSpeech,
    glosses: sense.gloss.slice(0, 4).map((gloss) => gloss.text),
  })),
  common: word.kanji.some((k) => k.common) || word.kana.some((k) => k.common),
}));

const admin = createClient(url, secret, { auth: { persistSession: false } });
for (let start = 0; start < rows.length; start += BATCH_SIZE) {
  const { error } = await admin
    .from("dictionary_entries")
    .upsert(rows.slice(start, start + BATCH_SIZE));
  if (error) throw new Error(`Upsert failed at ${start}: ${error.message}`);
  process.stdout.write(`\r  imported ${Math.min(start + BATCH_SIZE, rows.length)}/${rows.length}`);
}
console.info("\nDone.");
