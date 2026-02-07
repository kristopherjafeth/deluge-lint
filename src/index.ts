import {cosmiconfig} from 'cosmiconfig';
import * as fs from 'fs';

export interface DelugeConfig {
  rules: {
    'no-hardcoded-ids'?: 'error' | 'warn' | 'off';
    'require-semicolon'?: 'error' | 'warn' | 'off';
    'camelcase-vars'?: 'error' | 'warn' | 'off';
    'max-lines-per-function'?: number | 'off';
    'no-unused-maps'?: 'error' | 'warn' | 'off';
    'enforce-timeout-awareness'?: 'error' | 'warn' | 'off';
    [key: string]: string | number | undefined;
  };
  exclude?: string[];
  env?: {
    app?: string;
    version?: string;
  };
}

export const defaultConfig: DelugeConfig = {
  rules: {
    'no-hardcoded-ids': 'warn',
    'require-semicolon': 'error',
    'camelcase-vars': 'warn',
    'max-lines-per-function': 'off',
    'no-unused-maps': 'warn',
    'enforce-timeout-awareness': 'warn',
  },
  exclude: ['scripts/deprecated/**', 'tests/**'],
  env: {
    app: 'crm',
    version: '2.0',
  },
};

const explorer = cosmiconfig('deluge');

export async function getConfig(): Promise<DelugeConfig> {
  const result = await explorer.search();
  if (result) {
    return result.config as DelugeConfig;
  }
  return defaultConfig;
}

export interface LintError {
  line: number;
  message: string;
  type: 'warning' | 'error';
  ruleId?: string;
}

export function analyzeDeluge(
  code: string,
  config: DelugeConfig = defaultConfig,
): LintError[] {
  const lines = code.split('\n');
  const errors: LintError[] = [];

  // Check max-lines-per-function if configured
  const maxLinesRule = config.rules['max-lines-per-function'];
  if (typeof maxLinesRule === 'number' && lines.length > maxLinesRule) {
    errors.push({
      line: 1,
      message: `Function length (${lines.length}) exceeds the maximum of ${maxLinesRule} lines.`,
      type: 'warning',
      ruleId: 'max-lines-per-function',
    });
  }

  // Loop/Brace tracking state
  // Stack of booleans: true = this brace scope is a loop, false = regular block
  let braceStack: boolean[] = [];
  let expectingLoopBrace = false;

  lines.forEach((content, index) => {
    const lineNumber = index + 1;
    const trimmed = content.trim();

    // Skip comment lines for logic checks (simple check)
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      return;
    }

    // --- State Update Logic ---

    // Check for 'for each' to identify upcoming loop scope
    // Note: Deluge uses 'for each var in list'
    if (/\bfor\s+each\b/.test(content)) {
      expectingLoopBrace = true;
    }

    // Process all braces in the line to update the stack state
    // We match braces one by one to handle cases like '} else {' or nested on same line
    // We iterate through characters for precision or use regex match loop
    const braces = content.match(/[{}]/g);
    if (braces) {
      braces.forEach(brace => {
        if (brace === '{') {
          braceStack.push(expectingLoopBrace);
          // Once we've "consumed" the expectation, reset it.
          // Nested loop: 'for each ... { ... for each ... {' -> correct
          expectingLoopBrace = false;
        } else if (brace === '}') {
          braceStack.pop();
        }
      });
    }

    // --- Rule Checks ---

    // 1. Detect Hardcoded IDs (19 digits)
    const hardcodedIdRule = config.rules['no-hardcoded-ids'] || 'warn';
    if (hardcodedIdRule !== 'off') {
      if (/\d{18,20}/.test(content)) {
        errors.push({
          line: lineNumber,
          message: 'Avoid using hardcoded IDs. Use configuration variables.',
          type: hardcodedIdRule === 'error' ? 'error' : 'warning',
          ruleId: 'no-hardcoded-ids',
        });
      }
    }

    // 2. Detect missing semicolon (ignore braces and comments)
    const semicolonRule = config.rules['require-semicolon'] || 'error';
    if (semicolonRule !== 'off') {
      const codePart = trimmed.split('//')[0].trim();

      if (
        codePart &&
        codePart.length > 0 &&
        !codePart.endsWith(';') &&
        !codePart.endsWith('{') &&
        !codePart.endsWith('}') &&
        !codePart.endsWith(':') && // Case statements
        !/^(if|else|for|while)\b/.test(codePart) // Control flow statements often span lines without ;
      ) {
        errors.push({
          line: lineNumber,
          message: 'Missing semicolon at the end of the line.',
          type: semicolonRule === 'error' ? 'error' : 'warning',
          ruleId: 'require-semicolon',
        });
      }
    }

    // 3. Detect non-camelCase variables
    const camelCaseRule = config.rules['camelcase-vars'] || 'warn';
    if (camelCaseRule !== 'off') {
      const assignmentMatch = content.match(/^\s*([a-zA-Z0-9_]+)\s*=/);
      if (assignmentMatch) {
        const variableName = assignmentMatch[1];
        if (!/^[a-z][a-zA-Z0-9]*$/.test(variableName)) {
          errors.push({
            line: lineNumber,
            message: `Variable '${variableName}' should be in camelCase.`,
            type: camelCaseRule === 'error' ? 'error' : 'warning',
            ruleId: 'camelcase-vars',
          });
        }
      }
    }

    // 4. Enforce Timeout Awareness (API calls inside loops)
    const timeoutRule = config.rules['enforce-timeout-awareness'] || 'warn';
    if (timeoutRule !== 'off') {
      // Check if any scope in the stack is a loop
      const isInsideLoop = braceStack.some(isLoop => isLoop);

      // Check for risky API calls
      // Matches: zoho.any_module.any_function() or invokeurl
      if (isInsideLoop) {
        if (
          /(zoho\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+|invokeurl)\s*\(/.test(content)
        ) {
          errors.push({
            line: lineNumber,
            message:
              'Avoid using API calls (zoho.*, invokeurl) inside loops. This may cause "Time limit exceeded" errors.',
            type: timeoutRule === 'error' ? 'error' : 'warning',
            ruleId: 'enforce-timeout-awareness',
          });
        }
      }
    }
  });

  return errors;
}
