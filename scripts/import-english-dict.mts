/**
 * Imports the offline English dictionary into english_entries + english_forms.
 * Sources (pinned, all free to redistribute with attribution — shown in the app):
 *   - ECDICT by skywind3000 (MIT): headwords, frequency rank, Oxford 3000 flag, inflections
 *   - WordNet 3.1 © Princeton University (WordNet license): definitions and examples
 *   - CMUdict © Carnegie Mellon University (BSD): US pronunciations → IPA
 *
 *   npm run dict:import:en         # local Supabase from .env.local
 *
 * Idempotent: rows are upserted by word / (form, lemma, kind).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { buildEnglishDictionary, type EcdictRow } from "../lib/dictionary/build-english.ts";
import { parseCsv } from "../lib/dictionary/csv.ts";

const ECDICT_URL =
  "https://raw.githubusercontent.com/skywind3000/ECDICT/39cfb9672c0906b63569e0453c2e6abfb9ab182a/ecdict.csv";
const CMUDICT_URL =
  "https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict";
const WORDNET_URL = "https://registry.npmjs.org/wordnet-db/-/wordnet-db-3.1.14.tgz";
const BATCH_SIZE = 1000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret)
  throw new Error("Run with .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)");

async function download(source: string): Promise<Buffer> {
  console.info(`Downloading ${source.split("/").pop()}...`);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${source}`);
  return Buffer.from(await response.arrayBuffer());
}

const [ecdict, cmudict, wordnet] = await Promise.all([
  download(ECDICT_URL),
  download(CMUDICT_URL),
  download(WORDNET_URL),
]);

// The npm tarball holds WordNet's database files under package/dict/
const workDir = mkdtempSync(join(tmpdir(), "english-dict-"));
writeFileSync(join(workDir, "wordnet.tgz"), wordnet);
execFileSync("tar", ["xzf", "wordnet.tgz"], { cwd: workDir });
const wordnetFile = (name: string) =>
  readFileSync(join(workDir, "package", "dict", name), "utf8").split("\n");

function* ecdictRows(): Generator<EcdictRow> {
  const records = parseCsv(ecdict.toString("utf8"));
  const header = records.next().value ?? [];
  const column = (name: string) => header.indexOf(name);
  const index = {
    word: column("word"),
    phonetic: column("phonetic"),
    definition: column("definition"),
    collins: column("collins"),
    oxford: column("oxford"),
    bnc: column("bnc"),
    frq: column("frq"),
    exchange: column("exchange"),
  };
  if (Object.values(index).some((position) => position < 0)) {
    throw new Error("ECDICT header changed; update the import");
  }
  for (const record of records) {
    yield {
      word: record[index.word] ?? "",
      phonetic: record[index.phonetic] ?? "",
      definition: record[index.definition] ?? "",
      collins: record[index.collins] ?? "",
      oxford: record[index.oxford] ?? "",
      bnc: record[index.bnc] ?? "",
      frq: record[index.frq] ?? "",
      exchange: record[index.exchange] ?? "",
    };
  }
}

console.info("Building entries...");
const { entries, forms } = buildEnglishDictionary({
  ecdict: ecdictRows(),
  senseIndexLines: wordnetFile("index.sense"),
  dataLines: ["data.noun", "data.verb", "data.adj", "data.adv"].flatMap(wordnetFile),
  cmudictLines: cmudict.toString("utf8").split("\n"),
});
console.info(`Built ${entries.length} entries and ${forms.length} inflected forms`);

const admin = createClient(url, secret, { auth: { persistSession: false } });

async function upsertAll<T extends object>(table: string, rows: T[], onConflict: string) {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const { error } = await admin
      .from(table)
      .upsert(rows.slice(start, start + BATCH_SIZE), { onConflict });
    if (error) throw new Error(`${table} batch at ${start} failed: ${error.message}`);
    process.stdout.write(`\r${table}: ${Math.min(start + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

// Entries first: forms reference their lemma
await upsertAll("english_entries", entries, "word");
await upsertAll("english_forms", forms, "form,lemma,kind");
console.info("Done.");
