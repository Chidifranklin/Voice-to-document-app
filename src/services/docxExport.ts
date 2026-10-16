import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} from 'docx';

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Basic regex to parse **bold** and *italic*
  const regex = /(\*\*.*?\*\*|\*.*?\*|[^*]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const chunk = match[0];
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length >= 4) {
      runs.push(
        new TextRun({
          text: chunk.slice(2, -2),
          bold: true,
          font: 'Calibri',
          size: 24, // 12pt
        })
      );
    } else if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length >= 2) {
      runs.push(
        new TextRun({
          text: chunk.slice(1, -1),
          italics: true,
          font: 'Calibri',
          size: 24,
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: chunk,
          font: 'Calibri',
          size: 24,
        })
      );
    }
  }

  return runs.length > 0
    ? runs
    : [
        new TextRun({
          text,
          font: 'Calibri',
          size: 24,
        }),
      ];
}

export async function generateDocxBlob(options: {
  title: string;
  template: string;
  content: string;
  dateStr?: string;
}): Promise<Blob> {
  const { title, template, content, dateStr } = options;
  const createdDate = dateStr || new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const paragraphs: Paragraph[] = [];

  // Title Paragraph
  paragraphs.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
      alignment: AlignmentType.LEFT,
    })
  );

  // Subtitle / Metadata (Template & Date)
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Template: ${template}  |  Date: ${createdDate}`,
          color: '64748B', // Slate 500
          size: 20, // 10pt
          italics: true,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 360 },
    })
  );

  // Split lines and parse markdown
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      // Empty line / paragraph break
      paragraphs.push(
        new Paragraph({
          text: '',
          spacing: { after: 140 },
        })
      );
      continue;
    }

    if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 280, after: 140 },
        })
      );
    } else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        })
      );
    } else if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const bulletText = line.replace(/^[-*•]\s+/, '');
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(bulletText),
          bullet: {
            level: 0,
          },
          spacing: { after: 80 },
        })
      );
    } else if (/^\d+\.\s+/.test(line)) {
      const numberText = line.replace(/^\d+\.\s+/, '');
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(numberText),
          bullet: {
            level: 0,
          },
          spacing: { after: 80 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(line),
          spacing: { after: 140 },
        })
      );
    }
  }

  // Footer / attribution note
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated with VoiceDoc PWA',
          color: '94A3B8',
          size: 18,
          italics: true,
          font: 'Calibri',
        }),
      ],
      spacing: { before: 400 },
      alignment: AlignmentType.RIGHT,
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function downloadDocxBlob(blob: Blob, filename: string): void {
  const safeName = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export async function shareDocxDocument(options: {
  blob: Blob;
  filename: string;
  title: string;
  text?: string;
}): Promise<{ shared: boolean; method: 'web-share' | 'download' | 'clipboard' }> {
  const { blob, filename, title, text } = options;
  const safeName = filename.endsWith('.docx') ? filename : `${filename}.docx`;

  const file = new File([blob], safeName, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  if (
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title,
        text: text || `Document: ${title}`,
        files: [file],
      });
      return { shared: true, method: 'web-share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'web-share' };
      }
    }
  }

  // Fallback to direct download
  downloadDocxBlob(blob, safeName);
  return { shared: true, method: 'download' };
}
