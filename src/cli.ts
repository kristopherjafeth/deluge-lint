#!/usr/bin/env node
import {analyzeDeluge, getConfig, defaultConfig} from './index';
import * as fs from 'fs';
import * as path from 'path';
import {minimatch} from 'minimatch';

async function main() {
  if (process.argv.includes('--init')) {
    const configPath = path.join(process.cwd(), '.delugerc');
    if (fs.existsSync(configPath)) {
      console.error('The .delugerc file already exists.');
      process.exit(1);
    }

    const initialConfig = {
      rules: {
        'no-hardcoded-ids': 'error',
        'require-semicolon': 'error',
        'camelcase-vars': 'warn',
        'max-lines-per-function': 100,
        'no-unused-maps': 'warn',
        'enforce-timeout-awareness': 'warn',
      },
      exclude: ['scripts/deprecated/**', 'tests/**'],
      env: {
        app: 'crm',
        version: '2.0',
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));
    console.log('✅ Configuration file .delugerc created successfully.');
    process.exit(0);
  }

  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Please provide a .dg file');
    process.exit(1);
  }

  try {
    const config = await getConfig();

    // Check exclusions with minimatch
    if (config.exclude && Array.isArray(config.exclude)) {
      const relativePath = path.relative(process.cwd(), filePath);
      // Normalize path separators for windows consistency in glob matching
      const normalizedPath = relativePath.split(path.sep).join('/');

      const isExcluded = config.exclude.some(pattern =>
        minimatch(normalizedPath, pattern),
      );

      if (isExcluded) {
        console.log(`⚠️  File ignored by configuration: ${normalizedPath}`);
        process.exit(0);
      }
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const results = analyzeDeluge(code, config as any);

    if (results.length === 0) {
      console.log('✅ Clean code!');
    } else {
      let hasError = false;
      results.forEach(err => {
        const color = err.type === 'error' ? '\x1b[31m' : '\x1b[33m'; // Red or Yellow
        const reset = '\x1b[0m';
        const ruleId = err.ruleId ? ` (${err.ruleId})` : '';
        console.log(
          `${color}[Line ${err.line}] ${err.type.toUpperCase()}: ${err.message}${ruleId}${reset}`,
        );
        if (err.type === 'error') hasError = true;
      });

      if (hasError) process.exit(1);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
  }
}

main();
