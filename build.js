

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const cheerio = require('cheerio');
const { minify } = require('html-minifier-terser');


const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'docs');

const OBFUSCATE_JS_DIR = path.join(SRC_DIR, 'js');

const EXCLUDE_KEYWORDS = [
  'jquery',
  'bootstrap',
  'vendor',
  'lib',
  'min.js'
];

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,   
  stringArray: true,
  stringArrayThreshold: 0.75,

  debugProtection: false,
  selfDefending: false,
  disableConsoleOutput: false,

  renameGlobals: false            
};


function getBuildTag() {
  const now = new Date();
  const time = now.toISOString().replace('T', ' ').slice(0, 19);
  return `build: ${time} fingerprint-secure`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function shouldObfuscateJs(filePath) {
  if (!filePath.startsWith(OBFUSCATE_JS_DIR)) return false;

  const name = filePath.toLowerCase();
  return !EXCLUDE_KEYWORDS.some(k => name.includes(k));
}


function processJsFile(srcPath, distPath) {
  const code = fs.readFileSync(srcPath, 'utf8');

  if (shouldObfuscateJs(srcPath)) {
    console.log('[OBFUSCATE]', srcPath);

    const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS);
    fs.writeFileSync(distPath, result.getObfuscatedCode(), 'utf8');
  } else {
    console.log('[COPY]', srcPath);
    fs.copyFileSync(srcPath, distPath);
  }
}

async function processHtmlFile(srcPath, distPath) {
  const html = fs.readFileSync(srcPath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const buildTag = getBuildTag();


  if ($('head').length) {
    $('head').prepend(`\n<!-- ${buildTag} -->\n`);
  }

  const compressedHtml = await minify($.html(), {
    collapseWhitespace: true,        
    removeComments: true,            
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,                 
    minifyJS: false,                 
    removeAttributeQuotes: false,    
    keepClosingSlash: true
  });

  fs.writeFileSync(distPath, compressedHtml, 'utf8');
  console.log('[HTML+MINIFY]', srcPath);
}



async function walkDir(srcDir, distDir) {
  ensureDir(distDir);

  const items = fs.readdirSync(srcDir);

  for (const item of items) {
    const srcPath = path.join(srcDir, item);
    const distPath = path.join(distDir, item);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      await walkDir(srcPath, distPath);
    } else if (item.endsWith('.js')) {
      processJsFile(srcPath, distPath);
    } else if (item.endsWith('.html')) {
      await processHtmlFile(srcPath, distPath);
    } else {
      fs.copyFileSync(srcPath, distPath);
    }
  }
}

(async function build() {
  console.log('=== Build Start ===');
  ensureDir(DIST_DIR);
  await walkDir(SRC_DIR, DIST_DIR);
  console.log('=== Build Finished ===');
})();


console.log('=== Build Start ===');
ensureDir(DIST_DIR);
walkDir(SRC_DIR, DIST_DIR);
console.log('=== Build Finished ===');
