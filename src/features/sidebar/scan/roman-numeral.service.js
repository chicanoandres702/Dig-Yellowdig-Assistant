/**
 * Roman Numeral Service: Converts between roman numerals and integers.
 * Why: VitalSource readers display some page numbers as roman numerals (xiii, iv, etc.),
 * so we need bi-directional conversion for auto-scan page navigation.
 */

const ROMAN_MAP = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const ROMAN_VALS = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
const ROMAN_SYMS = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

function romanToInt(r) {
    let total = 0;
    r = r.toUpperCase();
    for (let i = 0; i < r.length; i++) {
        const curr = ROMAN_MAP[r[i]];
        const next = ROMAN_MAP[r[i + 1]];
        if (next && next > curr) {
            total += next - curr;
            i++;
        } else {
            total += curr;
        }
    }
    return total;
}

function intToRoman(num) {
    let res = '';
    for (let i = 0; i < ROMAN_VALS.length; i++) {
        while (num >= ROMAN_VALS[i]) {
            num -= ROMAN_VALS[i];
            res += ROMAN_SYMS[i];
        }
    }
    return res;
}

/** Why: Page fields can be arabic or roman — this normalizes for comparison. */
function parsePageVal(val) {
    if (!val) return NaN;
    if (/^\d+$/.test(val)) return parseInt(val, 10);
    if (/^[ivxlcdm]+$/i.test(val)) return romanToInt(val);
    return NaN;
}

/** Why: Auto-scan must verify single-page stepping to avoid skipping content. */
function areConsecutive(a, b) {
    const na = parsePageVal(a);
    const nb = parsePageVal(b);
    if (isNaN(na) || isNaN(nb)) return false;
    return nb - na === 1;
}

/** Why: Increments page by 1, respecting numeric vs roman format. */
function bumpPageValue(val, lastPageNum) {
    if (!val || typeof val !== 'string') return null;
    // Avoid double-increment when page matches last saved
    if (lastPageNum && val.toLowerCase() === lastPageNum.toLowerCase()) return val;
    if (/^\d+$/.test(val)) return (parseInt(val, 10) + 1).toString();
    if (/^[ivxlcdm]+$/i.test(val)) {
        return intToRoman(romanToInt(val) + 1).toLowerCase();
    }
    return null;
}
