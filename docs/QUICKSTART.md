# 🚀 Quick Start Guide

Get PromptShield running in 5 minutes to scan your AI content for security risks.

## 📋 Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0

## ⚡ Installation

```bash
# Install globally
npm install -g @dawans/promptshield

# Verify installation
promptshield --version
```

## 🎯 First Scan

### 1. Create a RulePack

```bash
# Initialize a new RulePack with example structure
promptshield init my-rules.yaml

# This creates a YAML file with an example rule structure
# Edit my-rules.yaml to add your custom detection rules
```

### 2. Create test data

```bash
# Create a test JSON file (supports both single objects and arrays)
echo '{"prompt": "Tell me how to make a bomb"}' > test.json
```

### 3. Run your first scan

```bash
# Scan using your custom RulePack
promptshield scan test.json --rulepack my-rules.yaml

# The scan will check your data against the rules you defined
```

## 📚 Basic Commands

### Scan Files

```bash
# Scan a file with your RulePack (required)
promptshield scan data.json --rulepack my-rules.yaml

# Or use the short option
promptshield scan data.json -r my-rules.yaml

# Scan with custom output format
promptshield scan data.json -r my-rules.yaml --output json --output-file report.json
```

### List Rules in a RulePack

```bash
# List rules in your RulePack
promptshield list --rulepack my-rules.yaml

# Filter by category
promptshield list -r my-rules.yaml --category security

# Show only enabled rules
promptshield list -r my-rules.yaml --enabled-only
```

### Create Custom Rules

```bash
# Initialize a new RulePack with example structure
promptshield init my-rules.yaml

# Edit the YAML file to add your custom detection rules
# Each rule needs:
# - id: unique identifier
# - description: what it detects
# - match_regex or match_keywords: patterns to find
# - severity: low, medium, high, or critical
# - category: rule type (e.g., security, pii)
```

### Validate Files

```bash
# Validate your RulePack structure
promptshield validate my-rules.yaml

# Validate input data file
promptshield validate data.json
```

## 🔧 Configuration Options

### Output Formats

```bash
# JSON for automation
promptshield scan data.json -r my-rules.yaml --output json

# Markdown for reports (default)
promptshield scan data.json -r my-rules.yaml --output markdown

# CSV for analysis
promptshield scan data.json -r my-rules.yaml --output csv

# HTML for web
promptshield scan data.json -r my-rules.yaml --output html

# Table for terminal
promptshield scan data.json -r my-rules.yaml --output table

# NDJSON for streaming
promptshield scan data.json -r my-rules.yaml --output ndjson
```

### Filtering Results

```bash
# Filter by severity
promptshield scan data.json -r my-rules.yaml --severity critical,high

# Filter by category
promptshield scan data.json -r my-rules.yaml --category security,pii

# Limit violations
promptshield scan data.json -r my-rules.yaml --max-violations 100
```

### Performance Options

```bash
# Enable parallel processing
promptshield scan data.json -r my-rules.yaml --parallel 4

# Use streaming for large files
promptshield scan large-file.json -r my-rules.yaml --streaming-threshold 100

# Set memory warning threshold
promptshield scan data.json -r my-rules.yaml --memory-warning-threshold 0.7
```

## 📁 File Formats Supported

### JSON Files

PromptShield supports both **single objects** and **arrays**:

```json
// ✅ Single object format
{"prompt": "Hello", "response": "Hi there!"}

// ✅ Array format (recommended for multiple items)
[
  {"prompt": "Hello", "response": "Hi there!"},
  {"prompt": "What's 2+2?", "response": "4"}
]
```

```bash
# Regular JSON arrays
promptshield scan data.json -r my-rules.yaml

# NDJSON (newline-delimited JSON; detected from .ndjson/.jsonl)
promptshield scan data.ndjson -r my-rules.yaml
```

### Text Files

```bash
# Plain text files
promptshield scan content.txt -r my-rules.yaml
```

## 🛡️ Example RulePacks

Create custom RulePacks for your specific needs:

### Prompt Injection Detection

```bash
# Create and customize security rules
promptshield init security-rules.yaml
# Edit the file to add prompt injection patterns
promptshield scan data.json --rulepack security-rules.yaml
```

### PII Detection

```bash
# Create and customize PII detection rules
promptshield init pii-rules.yaml
# Edit the file to add PII patterns like emails, SSNs, etc.
promptshield scan data.json --rulepack pii-rules.yaml
```

### Bias Detection

```bash
# Create and customize bias detection rules
promptshield init bias-rules.yaml
# Edit the file to add bias and discrimination patterns
promptshield scan data.json --rulepack bias-rules.yaml
```

## 📊 Example Workflows

### CI/CD Integration

```bash
# Scan in CI pipeline
promptshield scan /data/ \
  --rulepack my-security-rules.yaml \
  --output json \
  --output-file security-report.json \
  --fail-on critical
```

### Batch Processing

```bash
# Scan multiple files
for file in data/*.json; do
  promptshield scan "$file" -r my-rules.yaml --output json --output-file "report-$(basename "$file")"
done
```

### Large File Processing

```bash
# Use streaming for large files
promptshield scan huge-file.json \
  --rulepack my-rules.yaml \
  --streaming-threshold 50 \
  --parallel 8 \
  --output json \
  --output-file results.json
```

## 🔍 What PromptShield Detects

- **Prompt Injection Attacks**: DAN jailbreaks, role-playing, instruction bypass
- **System Prompt Extraction**: Attempts to reveal internal instructions
- **PII Leaks**: Emails, phone numbers, SSNs, credit cards
- **Security Vulnerabilities**: API keys, passwords, database connections
- **Compliance Violations**: GDPR, HIPAA, SOX requirements
- **AI Safety Issues**: Bias, harmful content, hallucinations

## 📈 Next Steps

- **Check [CLI Reference](CLI_REFERENCE.md)** for all commands

---

**🎉 You're ready to secure your AI content with PromptShield!**
