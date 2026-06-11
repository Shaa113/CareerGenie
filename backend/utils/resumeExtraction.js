const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const pdfParse = require('pdf-parse');

const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';

const DOCX_CONTENT_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
]);

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripXmlTags(xml) {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\s*\/>/g, '\t')
      .replace(/<w:br\s*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<w:tc>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) {
      return offset;
    }
  }
  return -1;
}

function readDocxEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) {
    throw new Error('Invalid DOCX archive');
  }

  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  while (offset < centralDirectoryEnd) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x02014b50) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraFieldLength = buffer.readUInt16LE(offset + 30);
    const fileCommentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer
      .slice(offset + 46, offset + 46 + fileNameLength)
      .toString('utf8');

    entries.push({
      fileName,
      compressionMethod,
      compressedSize,
      localHeaderOffset
    });

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function extractZipEntry(buffer, entry) {
  const localHeaderOffset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error(`Invalid local header for ${entry.fileName}`);
  }

  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraFieldLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraFieldLength;
  const dataEnd = dataStart + entry.compressedSize;
  const compressed = buffer.slice(dataStart, dataEnd);

  if (entry.compressionMethod === 0) {
    return compressed;
  }

  if (entry.compressionMethod === 8) {
    return zlib.inflateRawSync(compressed);
  }

  throw new Error(`Unsupported DOCX compression method: ${entry.compressionMethod}`);
}

function extractDocxText(buffer) {
  const entries = readDocxEntries(buffer);
  const documentEntry = entries.find((entry) => entry.fileName === 'word/document.xml');

  if (!documentEntry) {
    throw new Error('DOCX document.xml not found');
  }

  const xml = extractZipEntry(buffer, documentEntry).toString('utf8');
  const text = stripXmlTags(xml);
  return text.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function extractImageText(buffer, mimeType) {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey) {
    throw new Error('OCR is not configured on this server');
  }

  const formData = new FormData();
  const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;

  formData.append('base64Image', dataUri);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');

  const response = await fetch(OCR_SPACE_API_URL, {
    method: 'POST',
    headers: {
      apikey: apiKey
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OCR request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.IsErroredOnProcessing) {
    const messages = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : 'OCR processing failed';
    throw new Error(messages);
  }

  return Array.isArray(data.ParsedResults)
    ? data.ParsedResults.map((result) => result.ParsedText || '').join('\n').trim()
    : '';
}

async function extractPdfText(buffer) {
  const parsed = await pdfParse(buffer);
  return parsed.text ? parsed.text.trim() : '';
}

async function extractTextFromUpload(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const mimeType = file.mimetype || file.mimeType || '';
  const extension = path.extname(file.originalname || '').toLowerCase();
  const buffer = file.buffer || fs.readFileSync(file.path);

  if (mimeType === 'application/pdf' || extension === '.pdf') {
    try {
      const pdfText = await extractPdfText(buffer);
      if (pdfText) return { text: pdfText, detectedType: 'pdf' };
    } catch (err) {
      // Fall through to OCR fallback.
    }

    const ocrText = await extractImageText(buffer, 'application/pdf');
    return { text: ocrText, detectedType: 'pdf-ocr' };
  }

  if (mimeType === 'text/plain' || extension === '.txt') {
    return {
      text: buffer.toString('utf8').replace(/\u0000/g, '').trim(),
      detectedType: 'txt'
    };
  }

  if (DOCX_CONTENT_TYPES.has(mimeType) || extension === '.docx') {
    return {
      text: extractDocxText(buffer),
      detectedType: 'docx'
    };
  }

  if (mimeType && mimeType.startsWith('image/')) {
    return {
      text: await extractImageText(buffer, mimeType),
      detectedType: 'image'
    };
  }

  throw new Error('Unsupported file type');
}

module.exports = {
  extractTextFromUpload
};
