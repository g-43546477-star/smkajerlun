import { HtmlValidate } from 'html-validate';
import { projectFiles } from './project-files.mjs';

const files = await projectFiles('.html');
const validator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: {
    'attr-quotes': 'off',
    'doctype-style': 'off',
    'no-inline-style': 'off',
    'no-trailing-whitespace': 'off',
    'prefer-button': 'off',
    'require-sri': 'off',
    'void-style': 'off'
  }
});
const report = await validator.validateMultipleFiles(files);
const blocking = [];
const advisory = [];
for (const result of report.results) {
  for (const message of result.messages.filter((item) => item.severity === 2)) {
    const line = `${result.filePath}:${message.line}:${message.column} ${message.message} (${message.ruleId})`;
    blocking.push(line);
  }
}
if (advisory.length) {
  console.warn(`HTML advisories (${advisory.length}):`);
  console.warn(advisory.slice(0, 40).join('\n'));
  if (advisory.length > 40) console.warn(`... ${advisory.length - 40} advisory lagi`);
}
if (blocking.length) {
  console.error(`HTML structural failures (${blocking.length}):`);
  console.error(blocking.join('\n'));
  process.exit(1);
}
console.log(`HTML validation passed: ${files.length} files (${advisory.length} advisories)`);
