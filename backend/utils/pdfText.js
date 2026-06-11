const pdfParse = require('pdf-parse');
const pdfjsLib = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');

const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';

async function extractTextViaOcrSpace(buffer) {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';

  const formData = new FormData();
  formData.append('base64Image', `data:application/pdf;base64,${buffer.toString('base64')}`);
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
    return '';
  }

  const data = await response.json();
  if (data.IsErroredOnProcessing) {
    return '';
  }

  const parsedText = Array.isArray(data.ParsedResults)
    ? data.ParsedResults.map((result) => result.ParsedText || '').join('\n').trim()
    : '';

  return parsedText;
}

async function extractPdfText(buffer) {
  try {
    const parsed = await pdfParse(buffer);
    const parsedText = parsed.text ? parsed.text.trim() : '';

    if (parsedText) {
      return parsedText;
    }
  } catch (err) {
    // Fall through to the PDF.js extraction path below.
  }

  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => item.str)
        .filter(Boolean)
        .join(' ')
        .trim();

      if (text) {
        pageTexts.push(text);
      }
    }

    const pdfJsText = pageTexts.join('\n').trim();
    if (pdfJsText) {
      return pdfJsText;
    }
  } catch (err) {
    // Ignore and try OCR fallback.
  }

  return extractTextViaOcrSpace(buffer);
}

module.exports = { extractPdfText };
