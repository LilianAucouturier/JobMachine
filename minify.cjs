const fs = require('fs');
const code = fs.readFileSync('public/advancedBookmarklet.js', 'utf8');
const minified = code
  .replace(/\s+/g, ' ') // collapse whitespace
  .replace(/\s*([{};,=\(\)\[\]\|&!])\s*/g, '$1') // remove spaces around operators
  .replace(/return\s/g, 'return ')
  .replace(/var\s/g, 'var ')
  .replace(/else\s/g, 'else ')
  .trim();
fs.writeFileSync('public/minifiedBookmarklet.txt', 'javascript:void(' + minified + ')');
