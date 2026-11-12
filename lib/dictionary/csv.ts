/**
 * Minimal RFC 4180 CSV reader (quoted fields, doubled quotes, newlines inside quotes).
 * Yields one array of fields per record; a trailing newline does not add an empty record.
 */
export function* parseCsv(text: string): Generator<string[]> {
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"' && field === "") inQuotes = true;
    else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      record.push(field);
      yield record;
      record = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    yield record;
  }
}
