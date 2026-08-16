/**
 * HTML to Structured Policy JSON Converter & Renderer Utility
 *
 * Converts legacy HTML policy strings into structured JSON sections & block arrays,
 * and compiles structured JSON back into standard HTML.
 */

function slugify(text) {
    return (text || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

/**
 * Convert HTML string into structured JSON policy format.
 * Creates sections for each <h2> and groups paragraphs/lists/callouts as content blocks.
 */
function convertHtmlToPolicyJson(title, htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
        return {
            title: title || 'Policy',
            description: '',
            sections: [],
        };
    }

    const sections = [];
    // Split HTML by <h2> tags
    const h2Parts = htmlContent.split(/<h2[^>]*>/gi);
    let sectionCounter = 1;

    h2Parts.forEach((part, index) => {
        const trimmed = part.trim();
        if (!trimmed) return;

        let sectionTitle = `Section ${sectionCounter}`;
        let sectionBodyHtml = trimmed;

        if (index > 0) {
            const h2EndIdx = trimmed.indexOf('</h2>');
            if (h2EndIdx !== -1) {
                sectionTitle = trimmed.substring(0, h2EndIdx).replace(/<[^>]+>/g, '').trim();
                sectionBodyHtml = trimmed.substring(h2EndIdx + 5).trim();
            }
        }

        const sectionId = slugify(sectionTitle) || `section-${sectionCounter}`;
        const blocks = [];
        let blockCounter = 1;

        // Parse paragraphs, lists, blockquotes, and callout blocks
        const paragraphParts = sectionBodyHtml.split(/(?=<p|<ul|<ol|<blockquote|<div)/gi);

        paragraphParts.forEach((pPart) => {
            const cleanPart = pPart.trim();
            if (!cleanPart) return;

            // Unordered / Ordered list
            if (cleanPart.startsWith('<ul') || cleanPart.startsWith('<ol')) {
                const isOrdered = cleanPart.startsWith('<ol');
                const items = [];
                const liMatches = cleanPart.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
                liMatches.forEach((li) => {
                    const cleanLi = li.replace(/<[^>]+>/g, '').trim();
                    if (cleanLi) items.push(cleanLi);
                });

                blocks.push({
                    id: `blk-${sectionCounter}-${blockCounter++}`,
                    type: isOrdered ? 'ordered_list' : 'unordered_list',
                    items: items.length > 0 ? items : ['Item 1'],
                });
            }
            // Blockquote / Warning / Callout
            else if (cleanPart.includes('background: #f8fafc') || cleanPart.includes('border-left: 4px solid #ef4444') || cleanPart.includes('warning')) {
                const text = cleanPart.replace(/<[^>]+>/g, '').trim();
                blocks.push({
                    id: `blk-${sectionCounter}-${blockCounter++}`,
                    type: 'warning_box',
                    title: 'Important Notice',
                    text: text || 'Please review carefully.',
                });
            }
            // Standard Paragraph / Text
            else {
                const text = cleanPart.replace(/<[^>]+>/g, '').trim();
                if (text) {
                    blocks.push({
                        id: `blk-${sectionCounter}-${blockCounter++}`,
                        type: 'paragraph',
                        text,
                    });
                }
            }
        });

        if (blocks.length === 0) {
            blocks.push({
                id: `blk-${sectionCounter}-1`,
                type: 'paragraph',
                text: sectionBodyHtml.replace(/<[^>]+>/g, '').trim() || 'No content.',
            });
        }

        sections.push({
            id: sectionId,
            title: sectionTitle,
            order: sectionCounter++,
            content: blocks,
        });
    });

    return {
        title: title || 'Policy Document',
        description: `Official policy terms for ${title}.`,
        sections,
    };
}

/**
 * Compile structured JSON policy format into clean HTML fallback string.
 */
function compileJsonToHtml(json) {
    if (!json || !Array.isArray(json.sections)) {
        return '<p>No policy content available.</p>';
    }

    let html = '';

    json.sections.forEach((sec) => {
        html += `<h2>${sec.title || 'Section'}</h2>\n`;
        if (Array.isArray(sec.content)) {
            sec.content.forEach((blk) => {
                switch (blk.type) {
                    case 'paragraph':
                        html += `<p>${blk.text || ''}</p>\n`;
                        break;
                    case 'heading':
                        html += `<h3>${blk.text || ''}</h3>\n`;
                        break;
                    case 'subheading':
                        html += `<h4>${blk.text || ''}</h4>\n`;
                        break;
                    case 'unordered_list':
                        html += `<ul>\n${(blk.items || []).map(i => `  <li>${i}</li>`).join('\n')}\n</ul>\n`;
                        break;
                    case 'ordered_list':
                        html += `<ol>\n${(blk.items || []).map(i => `  <li>${i}</li>`).join('\n')}\n</ol>\n`;
                        break;
                    case 'warning_box':
                    case 'info_box':
                    case 'success_box':
                        html += `<div style="background:#f8fafc; border-left:4px solid #ef4444; padding:16px; margin:16px 0;"><strong>${blk.title || 'Notice'}:</strong> <p>${blk.text || ''}</p></div>\n`;
                        break;
                    case 'faq':
                        if (Array.isArray(blk.items)) {
                            blk.items.forEach(faq => {
                                html += `<h3>${faq.question}</h3>\n<p>${faq.answer}</p>\n`;
                            });
                        }
                        break;
                    case 'contact_block':
                        html += `<p>Email: ${blk.email || ''}<br/>Phone: ${blk.phone || ''}<br/>Address: ${blk.address || ''}</p>\n`;
                        break;
                    default:
                        if (blk.text) html += `<p>${blk.text}</p>\n`;
                        break;
                }
            });
        }
    });

    return html;
}

module.exports = {
    slugify,
    convertHtmlToPolicyJson,
    compileJsonToHtml,
};
