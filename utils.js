// Utility functions for Dig Academic Assistant
// Modularized for maintainability and reuse

// Convert markdown to HTML
export function markdownToHtml(md) {
  let html = md;
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/\*\*([\s\S]+?)\*\*/gim, '<b>$1</b>');
  html = html.replace(/^\* ([\s\S]+?)/gim, '<li>$1</li>');
  html = html.replace(/\n/g, '<br>');
  return `<div>${html}</div>`;
}

// Copy HTML to clipboard as rich text
export async function copyHtmlToClipboard(html) {
  const blob = new Blob([html], { type: 'text/html' });
  const data = [new ClipboardItem({ 'text/html': blob })];
  await navigator.clipboard.write(data);
}

// Knowledge base functions
export function getKnowledgeBase() {
  return JSON.parse(localStorage.getItem('digKnowledgeBase') || '{}');
}

export function saveKnowledgeBase(kb) {
  localStorage.setItem('digKnowledgeBase', JSON.stringify(kb));
}

export function tagKbItem(className, topicName, idx, tag) {
  let kb = getKnowledgeBase();
  kb[className][topicName][idx].type = tag;
  saveKnowledgeBase(kb);
}
