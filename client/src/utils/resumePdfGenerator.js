import { jsPDF } from 'jspdf';

/**
 * Configuration presets for the 3 resume templates.
 */
const TEMPLATE_CONFIGS = {
  professional: {
    fontFamily: 'times',
    margin: 40,
    lineHeight: 14,
    bodyFontSize: 10,
    headingFontSize: 12,
    nameFontSize: 22,
    headlineFontSize: 11,
    contactFontSize: 9.5,
    colors: {
      name: [20, 20, 20],
      headline: [75, 85, 99],
      contact: [55, 65, 81],
      heading: [30, 41, 59],
      body: [31, 41, 55],
      meta: [100, 116, 139],
      divider: [180, 180, 180],
      accent: [30, 41, 59]
    },
    headerAlign: 'center',
    dividerStyle: 'line',
    headingTransform: 'uppercase'
  },
  minimal: {
    fontFamily: 'helvetica',
    margin: 36,
    lineHeight: 13,
    bodyFontSize: 9.5,
    headingFontSize: 10.5,
    nameFontSize: 18,
    headlineFontSize: 10,
    contactFontSize: 9,
    colors: {
      name: [17, 24, 39],
      headline: [75, 85, 99],
      contact: [75, 85, 99],
      heading: [17, 24, 39],
      body: [55, 65, 81],
      meta: [107, 114, 128],
      divider: [209, 213, 219],
      accent: [17, 24, 39]
    },
    headerAlign: 'left',
    dividerStyle: 'thin',
    headingTransform: 'uppercase'
  },
  modern: {
    fontFamily: 'helvetica',
    margin: 40,
    lineHeight: 14,
    bodyFontSize: 10,
    headingFontSize: 11,
    nameFontSize: 20,
    headlineFontSize: 10.5,
    contactFontSize: 9,
    colors: {
      name: [30, 58, 138],       // Deep navy (#1e3a8a)
      headline: [37, 99, 235],    // Vibrant blue (#2563eb)
      contact: [71, 85, 105],     // Slate (#475569)
      heading: [30, 58, 138],     // Deep navy
      body: [30, 41, 59],         // Dark slate (#1e293b)
      meta: [71, 85, 105],        // Slate
      divider: [219, 234, 254],   // Light blue (#dbeafe)
      accent: [37, 99, 235]       // Vibrant blue accent
    },
    headerAlign: 'left',
    dividerStyle: 'modern-bar',
    headingTransform: 'uppercase'
  }
};

/**
 * Generate and download a template-aware PDF from resume data using native jsPDF text rendering.
 *
 * @param {object} resume - Resume data object (personalDetails, skills, education, experience)
 * @param {string} templateId - Selected template identifier ('professional', 'minimal', 'modern')
 */
export function generateResumePdf(resume, templateId = 'professional') {
  if (!resume) return;

  const config = TEMPLATE_CONFIGS[templateId] || TEMPLATE_CONFIGS.professional;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = config.margin;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = config.lineHeight;

  let y = margin;

  /**
   * Helper: ensure there is sufficient space on current page; otherwise break to next page.
   */
  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  /**
   * Helper: render a line of text (left or center aligned)
   */
  const drawText = (text, x, yPos, options = {}) => {
    const { align = 'left', style = 'normal', size = config.bodyFontSize, color = config.colors.body } = options;
    doc.setFont(config.fontFamily, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, yPos, { align });
  };

  /**
   * Helper: render wrapped paragraph text
   */
  const drawWrappedText = (text, x, width, options = {}) => {
    if (!text) return;
    const { style = 'normal', size = config.bodyFontSize, color = config.colors.body, spacing = lineHeight } = options;
    doc.setFont(config.fontFamily, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, width);
    lines.forEach((line) => {
      checkPageBreak(spacing);
      doc.text(line, x, y);
      y += spacing;
    });
  };

  /**
   * Helper: draw a horizontal divider
   */
  const drawDivider = (yPos, color = config.colors.divider, lineWidth = 0.5) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(lineWidth);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  /**
   * Helper: render a section title with orphan prevention
   */
  const drawSectionHeading = (title) => {
    // Prevent stranded headings: require at least 50pt (heading + first item preview)
    checkPageBreak(50);
    y += 10;

    const formattedTitle = config.headingTransform === 'uppercase' ? title.toUpperCase() : title;

    if (templateId === 'modern') {
      // Modern: vertical accent pill bar on the left + navy title
      doc.setFillColor(config.colors.accent[0], config.colors.accent[1], config.colors.accent[2]);
      doc.rect(margin, y - config.headingFontSize + 2, 3, config.headingFontSize, 'F');
      drawText(formattedTitle, margin + 8, y, {
        style: 'bold',
        size: config.headingFontSize,
        color: config.colors.heading
      });
      y += 6;
      drawDivider(y, config.colors.divider, 0.75);
      y += 8;
    } else if (templateId === 'minimal') {
      // Minimal: crisp, compact ATS-friendly title with subtle underline
      drawText(formattedTitle, margin, y, {
        style: 'bold',
        size: config.headingFontSize,
        color: config.colors.heading
      });
      y += 4;
      drawDivider(y, config.colors.divider, 0.5);
      y += 8;
    } else {
      // Professional: traditional centered heading with horizontal rule
      const centerX = margin + contentWidth / 2;
      drawText(formattedTitle, centerX, y, {
        align: 'center',
        style: 'bold',
        size: config.headingFontSize,
        color: config.colors.heading
      });
      y += 5;
      drawDivider(y, config.colors.divider, 0.75);
      y += 10;
    }
  };

  const { personalDetails = {}, skills = [], education = [], experience = [] } = resume;
  const { fullName, email, phone, location, headline, summary } = personalDetails;

  // ==================== HEADER ====================
  const isCentered = config.headerAlign === 'center';
  const headerX = isCentered ? margin + contentWidth / 2 : margin;
  const headerAlign = isCentered ? 'center' : 'left';

  if (fullName) {
    drawText(fullName, headerX, y, {
      align: headerAlign,
      style: 'bold',
      size: config.nameFontSize,
      color: config.colors.name
    });
    y += config.nameFontSize * 0.85;
  }

  if (headline) {
    y += 4;
    drawText(headline, headerX, y, {
      align: headerAlign,
      style: templateId === 'professional' ? 'italic' : 'bold',
      size: config.headlineFontSize,
      color: config.colors.headline
    });
    y += config.headlineFontSize + 4;
  }

  // Contact items (email, phone, location)
  const contactParts = [];
  if (email) contactParts.push(email);
  if (phone) contactParts.push(phone);
  if (location) contactParts.push(location);

  if (contactParts.length > 0) {
    y += 2;
    const separator = templateId === 'minimal' ? ' | ' : '  •  ';
    const contactText = contactParts.join(separator);
    drawText(contactText, headerX, y, {
      align: headerAlign,
      style: 'normal',
      size: config.contactFontSize,
      color: config.colors.contact
    });
    y += config.contactFontSize + 6;
  }

  // Header Divider
  if (templateId === 'modern') {
    // Vibrant accent bar
    doc.setFillColor(config.colors.accent[0], config.colors.accent[1], config.colors.accent[2]);
    doc.rect(margin, y, contentWidth, 2.5, 'F');
    y += 8;
  } else if (templateId === 'professional') {
    drawDivider(y, config.colors.divider, 1);
    y += 8;
  } else {
    drawDivider(y, config.colors.divider, 0.5);
    y += 6;
  }

  // ==================== SUMMARY ====================
  if (summary && summary.trim()) {
    drawSectionHeading('Summary');
    drawWrappedText(summary.trim(), margin, contentWidth, {
      size: config.bodyFontSize,
      color: config.colors.body,
      spacing: lineHeight
    });
    y += 6;
  }

  // ==================== SKILLS ====================
  if (skills && skills.length > 0) {
    drawSectionHeading('Skills');
    const skillSeparator = templateId === 'minimal' ? ' • ' : ', ';
    const skillText = skills.join(skillSeparator);
    drawWrappedText(skillText, margin, contentWidth, {
      size: config.bodyFontSize,
      color: config.colors.body,
      spacing: lineHeight
    });
    y += 6;
  }

  // ==================== EXPERIENCE ====================
  if (experience && experience.length > 0) {
    drawSectionHeading('Experience');
    experience.forEach((ex) => {
      checkPageBreak(35);
      // Company and job title
      const jobLine = ex.jobTitle ? `${ex.company} – ${ex.jobTitle}` : ex.company;
      drawText(jobLine, margin, y, {
        style: 'bold',
        size: config.bodyFontSize + 0.5,
        color: templateId === 'modern' ? config.colors.name : config.colors.heading
      });
      y += lineHeight;

      // Meta: location and dates
      const metaParts = [];
      if (ex.location) metaParts.push(ex.location);
      if (ex.startDate || ex.endDate) {
        metaParts.push(`${ex.startDate || ''}${ex.startDate && ex.endDate ? ' – ' : ''}${ex.endDate || ''}`);
      }
      if (metaParts.length > 0) {
        drawText(metaParts.join('  •  '), margin, y, {
          style: 'italic',
          size: config.bodyFontSize - 0.5,
          color: config.colors.meta
        });
        y += lineHeight;
      }

      // Description
      if (ex.description && ex.description.trim()) {
        drawWrappedText(ex.description.trim(), margin, contentWidth, {
          size: config.bodyFontSize,
          color: config.colors.body,
          spacing: lineHeight
        });
      }
      y += 6;
    });
  }

  // ==================== EDUCATION ====================
  if (education && education.length > 0) {
    drawSectionHeading('Education');
    education.forEach((ed) => {
      checkPageBreak(35);
      const degreeLine = `${ed.institution} – ${ed.qualification}${ed.fieldOfStudy ? ', ' + ed.fieldOfStudy : ''}`;
      drawText(degreeLine, margin, y, {
        style: 'bold',
        size: config.bodyFontSize + 0.5,
        color: templateId === 'modern' ? config.colors.name : config.colors.heading
      });
      y += lineHeight;

      if (ed.startDate || ed.endDate) {
        const dateText = `${ed.startDate || ''}${ed.startDate && ed.endDate ? ' – ' : ''}${ed.endDate || ''}`;
        drawText(dateText, margin, y, {
          style: 'italic',
          size: config.bodyFontSize - 0.5,
          color: config.colors.meta
        });
        y += lineHeight;
      }

      if (ed.description && ed.description.trim()) {
        drawWrappedText(ed.description.trim(), margin, contentWidth, {
          size: config.bodyFontSize,
          color: config.colors.body,
          spacing: lineHeight
        });
      }
      y += 6;
    });
  }

  // ==================== SAVE PDF ====================
  const safeName = (fullName || 'resume').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${safeName}.pdf`);
  return doc;
}
