import { execSync } from "child_process";
import { readFileSync } from "fs";

// Patterns to detect in tracked files
const SECRET_PATTERNS = [
  { name: "Google API Key (AIza...)", regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
  { name: "Google Auth Token (AQ...)", regex: /\bAQ[0-9A-Za-z\-_]{20,}\b/g },
  { name: "Private Key", regex: /-----BEGIN\s+(?:[A-Z0-9_-]+\s+)?PRIVATE\s+KEY-----/g },
];

function isBinary(buffer) {
  // Check first 8000 bytes for null character
  const len = Math.min(buffer.length, 8000);
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

try {
  const trackedFilesOutput = execSync("git ls-files", { encoding: "utf8" });
  const files = trackedFilesOutput
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter(Boolean);

  let violations = 0;

  for (const file of files) {
    let buf;
    try {
      buf = readFileSync(file);
    } catch {
      continue; // file might be deleted or unreadable
    }

    if (isBinary(buf)) continue;

    const content = buf.toString("utf8");
    const lines = content.split(/\r?\n/);

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        const match = pattern.regex.exec(line);
        if (match) {
          // Ignore obvious placeholders
          const matchedText = match[0];
          if (
            matchedText.includes("YOUR_") ||
            matchedText.includes("REPLACE") ||
            matchedText.includes("EXAMPLE") ||
            matchedText.includes("000000000000")
          ) {
            continue;
          }

          console.error(
            `[SECRETS ERROR] ${pattern.name} found in tracked file ${file}:${lineNum + 1}`
          );
          console.error(`  Redacted: ${matchedText.slice(0, 6)}...[REDACTED]`);
          violations++;
        }
      }
    }
  }

  if (violations > 0) {
    console.error(`\n✖ Found ${violations} secret violation(s) in tracked files. Commit aborted.`);
    process.exit(1);
  }

  console.log(`✓ Secrets check passed: ${files.length} tracked files scanned. No secrets found.`);
  process.exit(0);
} catch (err) {
  console.error("Failed to run secrets check:", err.message);
  process.exit(1);
}
