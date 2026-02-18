const express = require('express');
const {
  Document, Packer, Paragraph, TextRun,
  HeadingLevel, AlignmentType, convertInchesToTwip,
} = require('docx');

const router = express.Router();

/**
 * POST /api/export/docx
 *
 * Convert markdown/text content to a DOCX file.
 * Body: { content: string, filename?: string }
 *
 * Returns: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 *
 * Formatting: Cambria 11pt, 1-inch margins (matches immigration law firm standard).
 */
router.post('/docx', async (req, res) => {
  const { content, filename = 'document.docx' } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required and must be a string' });
  }

  try {
    const children = parseMarkdownToParagraphs(content);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[Export] DOCX generation failed:', err);
    res.status(500).json({ error: 'Failed to generate DOCX', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Markdown → docx Paragraph conversion
// ---------------------------------------------------------------------------

const FONT = 'Cambria';
const FONT_SIZE = 22; // 11pt in half-points

function parseMarkdownToParagraphs(markdown) {
  const lines = markdown.split('\n');
  const paragraphs = [];

  for (const line of lines) {
    // Headings
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: h1[1], font: FONT, size: 32, bold: true })],
      }));
      continue;
    }

    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: h2[1], font: FONT, size: 28, bold: true })],
      }));
      continue;
    }

    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: h3[1], font: FONT, size: 24, bold: true })],
      }));
      continue;
    }

    // Empty line → spacing paragraph
    if (line.trim() === '') {
      paragraphs.push(new Paragraph({ children: [] }));
      continue;
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      const text = line.replace(/^[-*] /, '');
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: parseInlineFormatting(text),
      }));
      continue;
    }

    // Regular paragraph with inline formatting
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      children: parseInlineFormatting(line),
    }));
  }

  return paragraphs;
}

/**
 * Parse inline markdown formatting (**bold**, *italic*)
 */
function parseInlineFormatting(text) {
  const runs = [];
  // Split on **bold** and *italic* markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        font: FONT,
        size: FONT_SIZE,
        bold: true,
      }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        font: FONT,
        size: FONT_SIZE,
        italics: true,
      }));
    } else if (part) {
      runs.push(new TextRun({
        text: part,
        font: FONT,
        size: FONT_SIZE,
      }));
    }
  }

  return runs;
}

module.exports = router;
