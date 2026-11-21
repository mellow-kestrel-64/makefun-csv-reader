// Fast drop-in for csv-reader 1.0.0 (make.fun's own CSV reader). v4: inlined field readers.
//
// Same answers as v3 (see solve-v3.js for the policy comment), with the field
// readers inlined into the record loop: no per-field call, no shared output
// variables, just one pass over the text.

const LINE_BREAK_RE = /\r\n|\r|\n/g;
const UNQ = /[,\n\r]/g;
const CR_RE = /\r\n?/g;

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input, faster. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  let pos = 0;
  let line = 1;
  if (n > 0 && text.charCodeAt(0) === 0xFEFF) pos = 1;

  let recordLine = 1;
  let recordRow = null;

  // The field's value with every CR in `seg` dropped, one stray_cr error each
  // — except a trailing CR when the field ends at a line break, which is the
  // CR of a CRLF and no error. Only called when seg holds a CR (rare).
  function stripCR(seg, endsAtBreak) {
    let out = '';
    let s = 0;
    for (;;) {
      const j = seg.indexOf('\r', s);
      if (j === -1) {
        out += seg.slice(s);
        return out;
      }
      out += seg.slice(s, j);
      if (j === seg.length - 1 && endsAtBreak) {
        // The CR of a CRLF: the line break, not a stray CR.
        return out;
      }
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      s = j + 1;
    }
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    let ended;
    do {
      // Read one field into `value`, ending `ended`.
      let value;
      quoted = text.charCodeAt(pos) === 34;
      if (quoted) {
        // A quoted field. `init` carries the value the rest of the field is
        // read onto when the quoted part ends in junk or never closes; `junk`
        // says the rest is the junk after a closing quote.
        let init = null;
        let junk = false;
        const open = pos;
        const openLine = line;
        pos += 1;
        let v = '';
        let start = pos;
        for (;;) {
          const q = text.indexOf('"', pos);
          if (q === -1) {
            // The quote never closes: it is a literal character, and the text
            // after it is read again as unquoted.
            pos = open + 1;
            line = openLine;
            errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
            init = '"';
            break;
          }
          let seg = q > start ? text.slice(start, q) : '';
          if (seg.indexOf('\n') !== -1 || seg.indexOf('\r') !== -1) {
            // Line breaks inside quotes: each CRLF or lone CR is one LF, and one line.
            const breaks = seg.match(LINE_BREAK_RE);
            line += breaks ? breaks.length : 0;
            seg = seg.replace(CR_RE, '\n');
          }
          if (text.charCodeAt(q + 1) === 34) {
            // A doubled quote: one quote in the value, and the field goes on.
            v += seg;
            v += '"';
            pos = q + 2;
            start = q + 2;
            continue;
          }
          // The closing quote.
          v += seg;
          pos = q + 1;
          if (pos >= n) {
            value = v;
            ended = END;
            init = null;
            break;
          }
          const d = text.charCodeAt(pos);
          if (d === 44) {
            pos += 1;
            value = v;
            ended = COMMA;
            init = null;
            break;
          }
          if (d === 10) {
            pos += 1;
            line += 1;
            value = v;
            ended = LINE_BREAK;
            init = null;
            break;
          }
          if (d === 13 && text.charCodeAt(pos + 1) === 10) {
            pos += 2;
            line += 1;
            value = v;
            ended = LINE_BREAK;
            init = null;
            break;
          }
          // What follows the closing quote is appended as it stands, up to
          // the next comma or line break.
          init = v;
          junk = true;
          break;
        }
        if (init !== null) {
          // The rest of the field, read as unquoted onto `init`.
          const comma = text.indexOf(',', pos);
          const lf = text.indexOf('\n', pos);
          let m;
          if (comma === -1 && lf === -1) {
            m = n;
            ended = END;
          } else if (comma === -1) {
            m = lf;
            ended = LINE_BREAK;
          } else if (lf === -1) {
            m = comma;
            ended = COMMA;
          } else if (comma < lf) {
            m = comma;
            ended = COMMA;
          } else {
            m = lf;
            ended = LINE_BREAK;
          }
          let seg = m > pos ? text.slice(pos, m) : '';
          if (seg.indexOf('\r') !== -1) seg = stripCR(seg, ended === LINE_BREAK);
          value = init === '' ? seg : init + seg;
          if (junk && seg.length > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
          if (ended === LINE_BREAK) {
            pos = m + 1;
            line += 1;
          } else if (ended === COMMA) {
            pos = m + 1;
          } else {
            pos = n;
          }
        }
      } else {
        // An unquoted field, one native scan to its next delimiter.
        let seg = '';
        let start = pos;
        for (;;) {
          UNQ.lastIndex = pos;
          const mm = UNQ.exec(text);
          if (mm === null) {
            if (start < n) seg += text.slice(start, n);
            pos = n;
            ended = END;
            break;
          }
          const i = mm.index;
          const cc = mm[0];
          if (cc === ',') {
            if (i > start) seg += text.slice(start, i);
            pos = i + 1;
            ended = COMMA;
            break;
          }
          if (cc === '\n') {
            if (i > start) seg += text.slice(start, i);
            pos = i + 1;
            line += 1;
            ended = LINE_BREAK;
            break;
          }
          if (text.charCodeAt(i + 1) === 10) {
            if (i > start) seg += text.slice(start, i);
            pos = i + 2;
            line += 1;
            ended = LINE_BREAK;
            break;
          }
          if (i > start) seg += text.slice(start, i);
          errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
          pos = i + 1;
          start = i + 1;
        }
        value = seg;
      }
      fields.push(value);
    } while (ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
