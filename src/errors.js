// Browser-safe ANSI/OSC stripping; leaves newlines and tabs readable.
const stripVTControlCharacters = value => value
  .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
  .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');

const guides = {
  syntax: { title: 'Syntax error', meaning: 'The parser cannot understand part of your code.', hints: ['Check the reported line and the line immediately above it.', 'Match opening and closing brackets, parentheses, braces, and quotes.', 'Read the exact unexpected token before making a change.'], example: 'console.log("Hello"); // Quotes and parentheses must match.' },
  reference: { title: 'Undefined variable', meaning: 'A variable is being used where it has not been defined or is not accessible.', hints: ['Check the spelling and capitalization of the variable.', 'Declare the variable before using it, in a scope that can access it.', 'If it comes from another file, check its export and import.'], example: 'const total = 10;\nconsole.log(total);' },
  type: { title: 'Type error', meaning: 'An operation received a value it cannot work with, such as calling a non-function.', hints: ['Inspect the value immediately before the failing operation.', 'Check whether it is null, undefined, or the wrong type.', 'Fix how the value is created; optional chaining is only appropriate when missing data is expected.'], example: 'const user = { name: "Ada" };\nconsole.log(user.name);' },
  module: { title: 'Module not found', meaning: 'The runtime or build tool cannot resolve an imported package or file.', hints: ['Check the import path, filename case, and relative ./ prefix.', 'For external packages, confirm the package is listed and installed in this project.', 'Check the package exports and your ESM/CommonJS configuration.'], example: 'import { helper } from "./helper.js";' },
  test: { title: 'Test failure', meaning: 'A test assertion did not match the actual behavior, or the test process failed.', hints: ['Find the failing test and compare expected versus actual output.', 'Reproduce the failure with the smallest input you can.', 'Check boundary cases before changing either the implementation or assertion.'], example: '// Include boundary cases such as zero, empty arrays, and missing input.' },
  range: { title: 'Range error', meaning: 'A value is outside an allowed range, or recursion exceeded the call stack.', hints: ['Check numeric bounds and array lengths.', 'For recursion, verify the base case and that each call gets closer to it.', 'For large inputs, consider an iterative implementation.'], example: 'function count(n) {\n  if (n <= 0) return;\n  count(n - 1);\n}' },
  generic: { title: 'Command failed', meaning: 'The command reported a failure. The output below is the source of truth.', hints: ['Read the first actionable error rather than the final summary.', 'Check the command, working directory, and required configuration.', 'These are general hints; the package does not infer an exact fix from an exit code.'], example: '// Re-run the failing command directly to inspect its complete output.' },
};
export const errorGuides = guides;

export function classifyError(output) {
  const text = stripVTControlCharacters(String(output)).slice(0, 8000);
  let category;
  if (/cannot find (?:module|package)|module not found|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|could not resolve/i.test(text)) category = 'module';
  else if (/SyntaxError|unexpected token|unexpected end|unterminated|expected ["'`)}\]]/i.test(text)) category = 'syntax';
  else if (/ReferenceError|\bis not defined\b|cannot access .+ before initialization/i.test(text)) category = 'reference';
  else if (/TypeError|cannot read propert|is not a function/i.test(text)) category = 'type';
  else if (/RangeError|maximum call stack/i.test(text)) category = 'range';
  else if (/AssertionError|ERR_ASSERTION|\bFAIL\b|\bnot ok\s+\d|tests? failed/i.test(text)) category = 'test';
  else if (/\berror\b|\bERR_[A-Z_]+\b/i.test(text)) category = 'generic';
  else return null;
  const location = text.match(/(?:file:\/\/)?((?:[A-Za-z]:[\\/]|\.{0,2}\/|\/)?[^\s():<>"']+\.(?:[cm]?[jt]sx?|py|java|go|rs)):(\d+)(?::(\d+))?/);
  return { category, message: text.trim().slice(0, 1200), location: location ? { file: location[1], line: Number(location[2]), column: location[3] ? Number(location[3]) : null } : null, guide: guides[category] };
}
