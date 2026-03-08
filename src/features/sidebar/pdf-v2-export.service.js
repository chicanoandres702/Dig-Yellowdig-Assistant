/**
 * PDF Export Service: Generates formatted PDFs from knowledge base content.
 */
async function exportToPDF(title, contentArray) {
    let jsPDF;
    if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
    } else if (window.jsPDF) {
        jsPDF = window.jsPDF;
    } else {
        alert('PDF Library (jsPDF) not found [v2.2]. Please reload the extension and refresh the page AGAIN.');
        return;
    }

    const doc = new jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(18);
    doc.text(title, margin, y);
    y += 15;

    for (let i = 0; i < contentArray.length; i++) {
        const item = contentArray[i];
        if (i > 0) doc.addPage();
        y = margin;

        doc.setFontSize(10);
        doc.setTextColor(100);

        const timestamp = item.ts ? new Date(item.ts).toLocaleString() : 'Date Unknown';
        const chapterInfo = item.chapter ? `Chapter: ${item.chapter}` : 'Chapter Unknown';

        doc.text(`${chapterInfo} | Captured: ${timestamp}`, margin, y);
        y += 7;

        doc.setTextColor(0);
        doc.setFontSize(12);

        // Handle images in text (markdown format: ![alt](src))
        const parts = item.text.split(/(!\[.*?\]\(.*?\))/);
        for (const part of parts) {
            if (part.startsWith('![')) {
                const match = part.match(/!\[(.*?)\]\((.*?)\)/);
                if (match) {
                    const src = match[2];
                    try {
                        const imgData = await getImageDataUrl(src);
                        const imgProps = doc.getImageProperties(imgData);
                        const imgWidth = pageWidth - (2 * margin);
                        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                        if (y + imgHeight > pageHeight - margin) {
                            doc.addPage();
                            y = margin;
                        }
                        doc.addImage(imgData, 'JPEG', margin, y, imgWidth, imgHeight);
                        y += imgHeight + 5;
                    } catch (e) {
                        digLog(`Failed to add image to PDF: ${e.message}`);
                    }
                }
            } else if (part.trim()) {
                const lines = doc.splitTextToSize(part.trim(), pageWidth - (2 * margin));
                // Internal page break if content is too long for one page
                for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                    if (y > pageHeight - margin) {
                        doc.addPage();
                        y = margin;
                    }
                    doc.text(lines[lineIdx], margin, y);
                    y += 7;
                }
                y += 5;
            }
        }
    }

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

function getImageDataUrl(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = reject;
        img.src = url;
    });
}

