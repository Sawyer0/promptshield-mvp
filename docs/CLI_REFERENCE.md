# CLI reference

```
promptshield <command> [options]
promptshield --version
promptshield <command> --help
```

`-r, --rulepack` takes a RulePack YAML path or a bundled name: `prompt-injection`, `pii`, `bias`, `hallucination`.

## scan

```
promptshield scan <input> -r <rulepack> [options]
```

`<input>` is a JSON, NDJSON/JSONL or text file, a directory, or `-` for stdin.

| Option                        | Description                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| `-r, --rulepack <path>`       | RulePack to apply (required)                                               |
| `-o, --output <format>`       | `markdown` (default), `json`, `table`, `csv`, `html`, `ndjson`             |
| `-f, --output-file <file>`    | Write the report to a file instead of stdout                               |
| `--severity <levels>`         | Only report these severities, comma-separated (`low,medium,high,critical`) |
| `--category <categories>`     | Only report these categories, comma-separated                              |
| `--max-violations <n>`        | Report at most n violations                                                |
| `--offset <n>`, `--limit <n>` | Page through the reported violations                                       |
| `--fields <fields>`           | JSON fields to scan, comma-separated (default `prompt,response,content`)   |
| `--scan-entire-object`        | Also scan each JSON object as a whole string                               |
| `--max-objects <n>`           | Stop after n objects                                                       |
| `--max-depth <n>`             | Maximum nested object depth to search for fields (default 4)               |
| `--ndjson`                    | Treat the input as NDJSON regardless of extension                          |
| `--streaming-threshold <n>`   | Stream files larger than n MB (default 1000)                               |
| `--fail-on <severity>`        | Exit with code 1 if any violation is at or above this severity             |
| `-q, --quiet`                 | Suppress the summary, metrics and progress messages                        |
| `-v, --verbose`               | Include more detail in reports                                             |
| `--debug`                     | Print debug logs                                                           |
| `--no-color`                  | Disable colors (also off automatically when writing to a file or pipe)     |

## list

```
promptshield list -r <rulepack> [--category <c>] [--severity <s>] [--enabled-only]
```

Prints the RulePack's rules, optionally filtered.

## init

```
promptshield init <file> [-t basic|pii|security] [-n <name>] [-d <description>] [--force] [-q] [-v]
```

Creates a RulePack from a template. `--force` overwrites an existing file.

## validate

```
promptshield validate <file> [--strict] [--output table|json|summary] [options]
```

Checks a RulePack (`.yaml`) or an input file. Exits with code 1 if it is invalid.

| Option              | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `--strict`          | Require a valid category and severity on every rule    |
| `--output <format>` | `table` (default), `json`, `summary`                   |
| `--skip-warnings`   | Leave warnings out of the report                       |
| `--max-errors <n>`  | Report at most n errors                                |
| `--format <format>` | Expected input format: `json`, `ndjson`, `yaml`, `txt` |
| `--batch`           | Batch validation mode                                  |
| `-v, --verbose`     | More detail                                            |

## Exit codes

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| 0    | Success                                                                 |
| 1    | Invalid arguments or input, a failed validation, or a `--fail-on` match |
