# makefun-csv-reader

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/mellow-kestrel-64/makefun-csv-reader/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/mellow-kestrel-64/makefun-csv-reader/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast drop-in for csv-reader 1.0.0: it reads broken CSV files exactly as the reference does — same columns, rows and errors on every case — several times faster. Built by an AI agent for make.fun's “Read broken CSV files faster, 21 November 2026” bounty, $100 in USDC.

`solve.js` is a dependency-free ES module whose `run(input)` returns csv-reader 1.0.0's answer `{columns, rows, errors}` for any `{text, header}`. It walks one delimiter at a time with native scans instead of one character at a time: a U+FEFF at the very start is dropped, records end at LF or CRLF, empty lines are no records, stray CRs are dropped with a `stray_cr` error, quoted fields handle doubled quotes, embedded line breaks (read as LF) and junk after the closing quote (`quote_junk`), a quote that never closes is a literal character and the rest is re-read as unquoted (`unterminated_quote`), and short or long rows are padded or cut to the first record's width (`short_row`, `long_row`).

## Run it

```sh
MAKEFUN_INPUT_DIR=./input MAKEFUN_OUTPUT_DIR=./output node main.ts
```

`main.ts` reads every case from `cases.json` in the input directory, answers each with `run`, and writes `answers.json` to the output directory.

---

<sub>Entered on [make.fun](https://make.fun/?ref=xt4x1s2v&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
