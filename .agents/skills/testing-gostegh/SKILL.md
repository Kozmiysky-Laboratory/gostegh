---
name: testing-gostegh
description: Test the GOSTegh DOCX formatting app end-to-end. Use when verifying DOCX upload, formatting, or GOST 7.32 compliance.
---

# Testing GOSTegh

## Prerequisites
- Node.js >= 18
- Run `npm install` in repo root

## Start the Server
```bash
npm start
# Server runs at http://localhost:3000
```

## Create a Test DOCX File
Use JSZip to create a minimal valid DOCX for testing:
```bash
node -e "
const JSZip = require('jszip');
const fs = require('fs');
async function create() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/><Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/></Types>');
  zip.file('_rels/.rels', '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>');
  zip.file('word/document.xml', '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>Test paragraph</w:t></w:r></w:p><w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/></w:sectPr></w:body></w:document>');
  zip.file('word/styles.xml', '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:styles xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\"/><w:sz w:val=\"22\"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>');
  const buf = await zip.generateAsync({type: 'nodebuffer'});
  fs.writeFileSync('/tmp/test.docx', buf);
  console.log('Created /tmp/test.docx');
}
create();
"
```

## Test via API (curl)
```bash
curl -s -o /tmp/result.docx -w "%{http_code}" -F "file=@/tmp/test.docx" http://localhost:3000/api/format
# Expected: 200
```

## Verify Formatting Values
After getting the result, verify the DOCX XML contains these GOST 7.32-2017 values:
- `w:top="1134"` (20mm), `w:bottom="1134"` (20mm)
- `w:left="1701"` (30mm), `w:right="850"` (15mm)
- `w:ascii="Times New Roman"`
- `w:val="28"` (14pt in half-points)
- `w:line="360"` with `w:lineRule="auto"` (1.5 spacing)
- `w:firstLine="709"` (1.25cm indent)
- `w:val="both"` (justify alignment)

## UI Testing
1. Navigate to http://localhost:3000/#upload
2. Upload a .docx file via the upload zone
3. Verify file name/size display, then click "Форматировать по ГОСТ 7.32"
4. Verify success message and file download
5. Try uploading a .txt file — should show error "Поддерживается только формат DOCX"

## Notes
- No authentication required
- Files processed in-memory only (no disk writes)
- For browser testing via Playwright/CDP, serve the test file from /public/ temporarily to use fetch() + DataTransfer API to programmatically set the file input
