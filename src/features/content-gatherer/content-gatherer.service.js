/**
 * Detects class, week, and site type from URL and page content.
 * Supports Capella, Yellowdig, and VitalSource.
 */
function detectClassAndWeek() {
    const url = window.location.href;
    let detectedClass = null;
    let detectedWeek = null;

    if (url.includes('vitalsource.com')) {
        detectedClass = detectVitalSourceClass();
        detectedWeek = detectVitalSourceChapter();
    } else if (url.includes('capella.edu')) {
        detectedClass = detectCapellaClass(url);
        const weekMatch = url.match(/week[\-_\/]?(\d+)/i);
        detectedWeek = weekMatch ? 'Week ' + weekMatch[1] : 'Week 1';
    } else if (url.includes('yellowdig')) {
        detectedClass = detectYellowdigClass();
        detectedWeek = 'Discussion';
    }

    return {
        detectedClass: detectedClass || 'Unknown Class',
        detectedWeek: detectedWeek || 'Week 1'
    };
}

function isVitalSourcePage() {
    return window.location.href.includes('vitalsource.com');
}

function detectCapellaClass(url) {
    const patterns = [/([A-Z]{2,4}[\-_]?FPX?\d{4})/i, /courses\/(\d+)/, /course\/([A-Za-z0-9\-_]+)/];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    const titleMatch = (document.title || '').match(/([A-Z]{2,4}[\-_]?FPX?\d{4})/i);
    return titleMatch ? titleMatch[1] : 'Capella';
}

function detectYellowdigClass() {
    const title = document.title || '';
    const cm = title.match(/([A-Z]{2,4}[\-_]?FPX?\d{4})/i);
    if (cm) return cm[1];
    const heading = document.querySelector('h1, h2, [class*="community"]');
    if (heading?.innerText?.trim().length > 2) return heading.innerText.trim().substring(0, 40);
    const last = localStorage.getItem('dig_last_class');
    return last || 'Yellowdig';
}


