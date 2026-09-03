/**
 * Helper for incrementally extracting complete Day objects out of the raw
 * text Gemini streams back for a `{"days": [ {...}, {...}, ... ]}` response
 * (Requirement 14.1). Since a single Day/Stop entry's JSON can span
 * multiple raw stream chunks, the server accumulates all text received so
 * far and re-scans it on every chunk rather than trying to parse each raw
 * chunk in isolation.
 *
 * This is a simplified (but real and functional) approach: it detects
 * *complete* top-level objects within the `days` array by brace-depth
 * tracking that is string-aware (so `{`/`}` characters inside quoted string
 * values, including escaped quotes, don't throw off the count). It does not
 * attempt token-level incremental rendering of a single in-progress Day.
 */

/**
 * Scans `accumulatedText` and returns the raw JSON text of every complete
 * top-level object found so far inside the `"days": [...]` array, in order.
 * The (possibly still-incomplete) trailing object being written, if any, is
 * never included, since its braces haven't balanced out yet.
 *
 * Returns an empty array if the `"days"` key/array opening hasn't appeared
 * in the text yet.
 */
export function findCompleteDayObjects(accumulatedText: string): string[] {
  const daysKeyMatch = /"days"\s*:\s*\[/.exec(accumulatedText);
  if (!daysKeyMatch) return [];

  const objects: string[] = [];

  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = daysKeyMatch.index + daysKeyMatch[0].length; i < accumulatedText.length; i++) {
    const ch = accumulatedText[i];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
      } else if (ch === "\\") {
        escapeNext = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        objects.push(accumulatedText.slice(objectStart, i + 1));
        objectStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      // Reached the end of the `days` array itself.
      break;
    }
  }

  return objects;
}
