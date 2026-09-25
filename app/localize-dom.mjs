// Keep the English source per node, rather than guessing it from a translation.
// Several English labels share a translation, and some translated fragments are empty.
export const normalizePhrase = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase();

export function createLocalizer(dictionaries) {
  const sources = new WeakMap();
  const attributes = new WeakMap();
  const ignored = 'script, style, noscript, textarea, [contenteditable]:not([contenteditable="false"]), [translate="no"], [data-speech-ignore], .language-picker';

  function translate(current, previous, language) {
    const source = previous && current === previous.rendered ? previous.source : current;
    const key = normalizePhrase(source);
    const translated = language === 'en' ? undefined : dictionaries[language]?.[key];
    const rendered = translated === undefined ? source : source.replace(/\S[\s\S]*\S|\S/, () => translated);
    return { source, rendered };
  }

  return function localize(root, language) {
    const document = root.ownerDocument || root;
    const walker = document.createTreeWalker(root, 4 /* SHOW_TEXT */);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest(ignored)) continue;
      const state = translate(node.nodeValue || '', sources.get(node), language);
      sources.set(node, state);
      if (node.nodeValue !== state.rendered) node.nodeValue = state.rendered;
    }
    root.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
      if (element.closest(ignored)) return;
      const states = attributes.get(element) || {};
      for (const name of ['placeholder', 'title', 'aria-label']) {
        if (!element.hasAttribute(name)) { delete states[name]; continue; }
        const current = element.getAttribute(name);
        const state = translate(current, states[name], language);
        states[name] = state;
        if (current !== state.rendered) element.setAttribute(name, state.rendered);
      }
      attributes.set(element, states);
    });
  };
}
