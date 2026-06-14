const JSZip = require('jszip');
const { parseStringPromise, Builder } = require('xml2js');

// GOST 7.32-2017 constants (in twips: 1mm = 56.692913 twips)
const MARGIN_LEFT = 1701;   // 30mm
const MARGIN_RIGHT = 850;   // 15mm
const MARGIN_TOP = 1134;    // 20mm
const MARGIN_BOTTOM = 1134; // 20mm

const FONT_NAME = 'Times New Roman';
const FONT_SIZE = 28;        // 14pt in half-points
const LINE_SPACING = 360;    // 1.5 line spacing (240 * 1.5)
const FIRST_LINE_INDENT = 709; // 1.25cm in twips
const ALIGNMENT = 'both';   // justify

async function processDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  // Process document.xml - apply formatting to all paragraphs
  const docXml = await zip.file('word/document.xml').async('string');
  const doc = await parseStringPromise(docXml, { explicitArray: false, preserveChildOrder: true });

  applyPageMargins(doc);
  applyTextFormatting(doc);

  const builder = new Builder({ headless: true, renderOpts: { pretty: false } });
  const newDocXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + builder.buildObject(doc);
  zip.file('word/document.xml', newDocXml);

  // Also update styles.xml to set default font
  const stylesFile = zip.file('word/styles.xml');
  if (stylesFile) {
    const stylesXml = await stylesFile.async('string');
    const styles = await parseStringPromise(stylesXml, { explicitArray: false, preserveChildOrder: true });
    applyDefaultStyles(styles);
    const newStylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + builder.buildObject(styles);
    zip.file('word/styles.xml', newStylesXml);
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function applyPageMargins(doc) {
  const body = doc['w:document']['w:body'];
  if (!body) return;

  // Find or create sectPr
  if (!body['w:sectPr']) {
    body['w:sectPr'] = {};
  }

  const sectPr = body['w:sectPr'];
  sectPr['w:pgMar'] = {
    $: {
      'w:top': String(MARGIN_TOP),
      'w:right': String(MARGIN_RIGHT),
      'w:bottom': String(MARGIN_BOTTOM),
      'w:left': String(MARGIN_LEFT),
      'w:header': '708',
      'w:footer': '708',
      'w:gutter': '0',
    },
  };
}

function applyTextFormatting(doc) {
  const body = doc['w:document']['w:body'];
  if (!body) return;

  const paragraphs = findAllParagraphs(body);
  for (const p of paragraphs) {
    applyParagraphFormatting(p);
    applyRunFormatting(p);
  }
}

function findAllParagraphs(obj) {
  const results = [];
  if (!obj || typeof obj !== 'object') return results;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...findAllParagraphs(item));
    }
  } else {
    if (obj['w:p']) {
      const ps = Array.isArray(obj['w:p']) ? obj['w:p'] : [obj['w:p']];
      results.push(...ps);
      for (const p of ps) {
        results.push(...findAllParagraphs(p));
      }
    }
    for (const key of Object.keys(obj)) {
      if (key !== 'w:p' && key !== '$') {
        results.push(...findAllParagraphs(obj[key]));
      }
    }
  }
  return results;
}

function applyParagraphFormatting(p) {
  if (!p || typeof p !== 'object') return;

  if (!p['w:pPr']) {
    p['w:pPr'] = {};
  }
  const pPr = p['w:pPr'];

  // Set alignment to justify
  pPr['w:jc'] = { $: { 'w:val': ALIGNMENT } };

  // Set 1.5 line spacing
  pPr['w:spacing'] = {
    $: {
      'w:after': '0',
      'w:before': '0',
      'w:line': String(LINE_SPACING),
      'w:lineRule': 'auto',
    },
  };

  // Set first line indent 1.25cm
  pPr['w:ind'] = {
    $: {
      'w:firstLine': String(FIRST_LINE_INDENT),
    },
  };

  // Set font in paragraph properties
  if (!pPr['w:rPr']) {
    pPr['w:rPr'] = {};
  }
  pPr['w:rPr']['w:rFonts'] = {
    $: {
      'w:ascii': FONT_NAME,
      'w:hAnsi': FONT_NAME,
      'w:cs': FONT_NAME,
    },
  };
  pPr['w:rPr']['w:sz'] = { $: { 'w:val': String(FONT_SIZE) } };
  pPr['w:rPr']['w:szCs'] = { $: { 'w:val': String(FONT_SIZE) } };
}

function applyRunFormatting(p) {
  if (!p || typeof p !== 'object') return;

  const runs = p['w:r'];
  if (!runs) return;

  const runArray = Array.isArray(runs) ? runs : [runs];
  for (const r of runArray) {
    if (!r || typeof r !== 'object') continue;
    if (!r['w:rPr']) {
      r['w:rPr'] = {};
    }
    const rPr = r['w:rPr'];
    rPr['w:rFonts'] = {
      $: {
        'w:ascii': FONT_NAME,
        'w:hAnsi': FONT_NAME,
        'w:cs': FONT_NAME,
      },
    };
    rPr['w:sz'] = { $: { 'w:val': String(FONT_SIZE) } };
    rPr['w:szCs'] = { $: { 'w:val': String(FONT_SIZE) } };
  }
}

function applyDefaultStyles(styles) {
  const root = styles['w:styles'];
  if (!root) return;

  // Update docDefaults
  if (!root['w:docDefaults']) {
    root['w:docDefaults'] = {};
  }
  const docDefaults = root['w:docDefaults'];

  docDefaults['w:rPrDefault'] = {
    'w:rPr': {
      'w:rFonts': {
        $: {
          'w:ascii': FONT_NAME,
          'w:hAnsi': FONT_NAME,
          'w:cs': FONT_NAME,
        },
      },
      'w:sz': { $: { 'w:val': String(FONT_SIZE) } },
      'w:szCs': { $: { 'w:val': String(FONT_SIZE) } },
    },
  };

  docDefaults['w:pPrDefault'] = {
    'w:pPr': {
      'w:spacing': {
        $: {
          'w:after': '0',
          'w:before': '0',
          'w:line': String(LINE_SPACING),
          'w:lineRule': 'auto',
        },
      },
      'w:ind': { $: { 'w:firstLine': String(FIRST_LINE_INDENT) } },
      'w:jc': { $: { 'w:val': ALIGNMENT } },
    },
  };
}

module.exports = { processDocx };
