import fs from 'fs';

let rawCode = fs.readFileSync('public/advancedBookmarklet.js', 'utf8');
// Remove only standalone comment lines (lines that are purely comments)
rawCode = rawCode.replace(/^\s*\/\/[^\n]*$/gm, '');
// Remove newlines and tabs
rawCode = rawCode.replace(/[\n\r\t]/g, ' ');
// Remove multiple spaces
let minified = rawCode.replace(/\s{2,}/g, ' ').trim();

let banner = fs.readFileSync('src/components/offers/BookmarkletBanner.tsx', 'utf8');

// Find the line with javascript:...
const regex = /const bookmarkletCode = `javascript:[^`]+`\.replace\('APP_URL_PLACEHOLDER', origin\)/;
banner = banner.replace(regex, 'const bookmarkletCode = `javascript:' + minified + '`.replace(\'APP_URL_PLACEHOLDER\', origin)');

fs.writeFileSync('src/components/offers/BookmarkletBanner.tsx', banner);
console.log("Updated BookmarkletBanner.tsx with fresh code");
