/**
 * Helper script to convert multiline PEM certificate to single line with \n
 * Usage: node scripts/convert-cert-to-oneline.js < input.pem
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let lines = [];

rl.on('line', (line) => {
  lines.push(line);
});

rl.on('close', () => {
  const multiline = lines.join('\n');
  const oneline = multiline.replace(/\n/g, '\\n');
  console.log('\n=== Single-line format (copy this to Vercel) ===');
  console.log(oneline);
  console.log('\n=== Verification ===');
  console.log('Starts with BEGIN:', multiline.includes('-----BEGIN CERTIFICATE-----'));
  console.log('Ends with END:', multiline.includes('-----END CERTIFICATE-----'));
  console.log('Length:', oneline.length, 'characters');
});

