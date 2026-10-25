

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const cheerio = require('cheerio');
const { minify } = require('html-minifier-terser');


// ====== 配置区 ======

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'docs');

// 只混淆这个目录下的 js（你自己的代码）
const OBFUSCATE_JS_DIR = path.join(SRC_DIR, 'js');

// 不混淆这些关键字命中的文件（防止误伤库）
const EXCLUDE_KEYWORDS = [
  'jquery',
  'bootstrap',
  'vendor',
  'lib',
  'min.js'
];

// 混淆参数（先用温和版，保证不炸）
const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,   // 先关，稳定第一
  stringArray: true,
  stringArrayThreshold: 0.75,

  // ⚠️ 所有“自毁 / 反调试”统统关闭
  debugProtection: false,
  selfDefending: false,
  disableConsoleOutput: false,

  renameGlobals: false            // 非常重要：避免全局函数名被改
};

// ====== 工具函数 ======

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
  // 只处理 /src/js 目录下的文件
  if (!filePath.startsWith(OBFUSCATE_JS_DIR)) return false;

  const name = filePath.toLowerCase();
  return !EXCLUDE_KEYWORDS.some(k => name.includes(k));
}

// ====== 处理 JS 文件 ======

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

// ====== 处理 HTML 文件（不动内联脚本，只改引用路径） ======

async function processHtmlFile(srcPath, distPath) {
  const html = fs.readFileSync(srcPath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const buildTag = getBuildTag();

  // 插入构件标记到 <head> 最前面
  if ($('head').length) {
    $('head').prepend(`\n<!-- ${buildTag} -->\n`);
  }
  // ⚠️ 不混淆内联 JS，只做结构级压缩
  const compressedHtml = await minify($.html(), {
    collapseWhitespace: true,        // 压缩空白
    removeComments: true,            // 移除 HTML 注释
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,                 // 内联 CSS 压缩
    minifyJS: false,                 // ⚠️ 内联 JS 不动，防止炸
    removeAttributeQuotes: false,    // 保留引号，防止兼容问题
    keepClosingSlash: true
  });

  fs.writeFileSync(distPath, compressedHtml, 'utf8');
  console.log('[HTML+MINIFY]', srcPath);
}


// ====== 递归处理目录 ======

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


// ====== 主入口 ======

console.log('=== Build Start ===');
ensureDir(DIST_DIR);
walkDir(SRC_DIR, DIST_DIR);
console.log('=== Build Finished ===');
