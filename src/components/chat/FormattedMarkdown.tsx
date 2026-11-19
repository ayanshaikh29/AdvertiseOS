import React from "react";

interface FormattedMarkdownProps {
  content: string;
}

/** Renders chat markdown: headings, tables, numbered & bullet lists, blockquotes,
 * fenced code, hr and inline bold/italic/code/links. Never shows raw markdown
 * syntax for the constructs agents actually emit. */
export function FormattedMarkdown({ content }: FormattedMarkdownProps) {
  if (!content) return null;
  const blocks = splitBlocks(content);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-[#0b1220]">
      {blocks.map((block, bIdx) => <Block key={bIdx} block={block} />)}
    </div>
  );
}

export type MdBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "code"; lang: string; code: string }
  | { type: "hr" }
  | { type: "p"; lines: string[] };

export function splitBlocks(content: string): MdBlock[] {
  const lines = content.split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l);
  const cells = (l: string) =>
    l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code
    if (/^\s*```/.test(line)) {
      const lang = line.replace(/^\s*```/, "").trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) {
        code.push(lines[i]!);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: "code", lang, code: code.join("\n") });
      continue;
    }

    // Table: header row + separator row
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1]!)) {
      const header = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]!)) {
        rows.push(cells(lines[i]!));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    // Horizontal rule
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1]!.length, text: headingMatch[2]!.trim() });
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i]!)) {
        quote.push(lines[i]!.replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", lines: quote });
      continue;
    }

    // Bullet list — allow lazy continuation is NOT supported; consecutive bullet lines only
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Numbered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph — consume until blank line or a new block starts
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !/^(#{1,4})\s+/.test(lines[i]!) &&
      !/^\s*([-*+]\s+|\d+[.)]\s+|>\s?|```)/.test(lines[i]!) &&
      !isTableRow(lines[i]!)
    ) {
      para.push(lines[i]!);
      i++;
    }
    if (para.length > 0) blocks.push({ type: "p", lines: para });
    else i++; // safety: never loop forever on unexpected lines
  }

  return blocks;
}

function Block({ block }: { block: MdBlock }) {
  switch (block.type) {
    case "heading": {
      const cls = [
        "font-display font-bold text-[#0b1220] pt-1",
        block.level <= 1 ? "text-lg extrabold" : block.level === 2 ? "text-base" : "text-sm",
      ].join(" ");
      if (block.level <= 1) return <h2 className={`${cls} font-extrabold`}>{parseInline(block.text)}</h2>;
      if (block.level === 2) return <h3 className={cls}>{parseInline(block.text)}</h3>;
      return <h4 className={cls}>{parseInline(block.text)}</h4>;
    }
    case "table":
      return (
        <div className="-mx-1 overflow-x-auto rounded-xl border border-[#e2e8f0]">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc]">
                {block.header.map((h, hi) => (
                  <th key={hi} className="border-b border-[#e2e8f0] px-3 py-2 text-left font-bold uppercase tracking-wider text-[10px] text-[#475569]">
                    {parseInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-[#f1f5f9] last:border-0 hover:bg-[#f8fafc]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-[#334155]">
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "ul":
      return (
        <ul className="space-y-1.5 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#18181B] shrink-0" />
              <span className="text-[#334155] leading-normal">{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="space-y-1.5 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <span className="text-[#334155] leading-normal">{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote className="rounded-r-xl border-l-2 border-[#18181B]/40 bg-[#F5F2EF] px-3.5 py-2.5 text-[#334155]">
          {block.lines.map((l, i) => (
            <p key={i} className="leading-relaxed">{parseInline(l)}</p>
          ))}
        </blockquote>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-xs">
          <code className="font-mono text-[#059669]">{block.code}</code>
        </pre>
      );
    case "hr":
      return <hr className="border-[#e2e8f0]" />;
    case "p":
      return (
        <p className="leading-relaxed text-[#0b1220]">
          {block.lines.map((line, lIdx) => (
            <React.Fragment key={lIdx}>
              {parseInline(line)}
              {lIdx < block.lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
  }
}

// Parses **bold**, *italic*, `code`, and [links](url)
function parseInline(text: string): React.ReactNode {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-[#0b1220] tracking-tight">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic text-[#1e293b] font-medium">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-[#F5F2EF] px-1.5 py-0.5 font-mono text-[12px] text-[#18181B] border border-black/[0.06]">
          {part.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#8B5CF6] underline underline-offset-2 hover:text-[#7C3AED] transition"
        >
          {label}
        </a>
      );
    }

    return part;
  });
}
