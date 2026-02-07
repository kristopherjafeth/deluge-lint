# Deluge Lint 🌊

![Status](https://img.shields.io/badge/status-beta-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

**Deluge Lint** is a static analysis tool (linter) designed specifically for **Zoho Deluge**. It helps developers write cleaner code, avoid common runtime errors, and follow best practices recommended by the Zoho community.

## 🚀 Installation

You can install it globally or as a development dependency in your project.

### Global

```bash
npm install -g deluge-lint
```

### In your project (Recommended)

```bash
npm install --save-dev deluge-lint
```

## 🛠️ Usage

### Initialization

To get started, create a `.delugerc` configuration file in the root of your project using the init command:

```bash
npx deluge-lint --init
```

This will generate a file with recommended rules.

### Analyzing a file

Run the linter on any `.dg` file (or whichever extension you use for your Deluge scripts):

```bash
npx deluge-lint path/to/script.dg
```

## ⚙️ Configuration (.delugerc)

The behavior of `deluge-lint` is fully customizable via the `.delugerc` JSON file.

```json
{
  "rules": {
    "no-hardcoded-ids": "error",
    "require-semicolon": "error",
    "camelcase-vars": "warn",
    "enforce-timeout-awareness": "warn",
    "max-lines-per-function": 100
  },
  "exclude": [
    "tests/**",
    "legacy/**"
  ]
}
```

### Rule Levels

* `"error"`: Marks the violation as an error and exits with code 1 (ideal for CI/CD).
* `"warn"`: Shows a yellow warning but does not stop execution.
* `"off"`: Disables the rule.

## 📏 Available Rules

| Rule | Description | Default |
| ----- | ----------- | ------- |
| **`no-hardcoded-ids`** | Detects record IDs (19 digits) written directly in the code. It is recommended to use variables or `Zoho Variables` to facilitate migration between environments (Sandbox/Production). | `warn` |
| **`require-semicolon`** | Verifies that each instruction ends with a semicolon `;`. Essential to avoid strange syntax errors in Deluge. | `error` |
| **`camelcase-vars`** | Enforces the use of `camelCase` for variable names (e.g., `myVariable` instead of `MyVariable` or `my_variable`). | `warn` |
| **`enforce-timeout-awareness`** | **CRITICAL**: Detects API calls (`zoho.crm.*`, `invokeurl`) inside `for each` loops. These practices often cause the "Statement Execution Limit Exceeded" error. | `warn` |
| **`max-lines-per-function`** | Warns if a script is too long, which hampers readability and increases the risk of timeouts. | `off` |

## 🚫 Ignoring Files

You can exclude specific folders or files by adding them to the `exclude` array in your configuration. Glob patterns are supported (e.g., `**/*.test.dg`).

```json
"exclude": [
  "test/**",
  "scripts/deprecated.dg"
]
```

## 🤝 Contributing

Contributions are welcome! If you have ideas for new rules or improvements:

1. Fork the repository.
2. Create your branch (`git checkout -b feature/new-rule`).
3. Commit your changes (`git commit -m 'Add new rule'`).
4. Push to the branch (`git push origin feature/new-rule`).
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License.
