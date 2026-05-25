export const domCaptureScript = String.raw`
var ignoreSelectors = (window.__chromeLayoutDiffIgnoreSelectors || []);
var ignoredTags = {
  SCRIPT: true,
  STYLE: true,
  META: true,
  LINK: true,
  NOSCRIPT: true,
  TEMPLATE: true
};
var styleProps = [
  'display',
  'position',
  'boxSizing',
  'overflow',
  'overflowX',
  'overflowY',
  'flexDirection',
  'flexWrap',
  'rowGap',
  'columnGap',
  'alignItems',
  'justifyContent',
  'gridTemplateColumns',
  'gridTemplateRows',
  'fontSize',
  'lineHeight',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth'
];

var round = function (value) {
  return Math.round(value * 1000) / 1000;
};

var rectSnapshot = function (rect, origin) {
  var left = origin ? rect.left - origin.left : rect.left;
  var top = origin ? rect.top - origin.top : rect.top;
  return {
    x: round(left),
    y: round(top),
    width: round(rect.width),
    height: round(rect.height),
    top: round(top),
    right: round(left + rect.width),
    bottom: round(top + rect.height),
    left: round(left)
  };
};

var numericLayoutValue = function (value) {
  return typeof value === 'number' ? value : null;
};

var hashText = function (text) {
  var hash = 2166136261;
  for (var i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
};

var elementIndex = function (element) {
  if (!element.parentElement) return 1;
  var sameTag = 0;
  var children = element.parentElement.children;
  for (var i = 0; i < children.length; i += 1) {
    if (children[i].tagName === element.tagName) sameTag += 1;
    if (children[i] === element) return sameTag;
  }
  return 1;
};

var elementPath = function (element, root) {
  var parts = [];
  var current = element;
  while (current && current !== root) {
    var id = current.id ? '#' + current.id : '';
    var classes = Array.prototype.slice.call(current.classList || []).slice(0, 3).map(function (name) {
      return '.' + name;
    }).join('');
    parts.unshift(current.tagName.toLowerCase() + id + classes + ':nth-of-type(' + elementIndex(current) + ')');
    current = current.parentElement;
  }
  return '#app' + (parts.length ? '>' + parts.join('>') : '');
};

var isIgnoredBySelector = function (element) {
  for (var ignoreIndex = 0; ignoreIndex < ignoreSelectors.length; ignoreIndex += 1) {
    var selector = ignoreSelectors[ignoreIndex];
    if (selector && element.matches && element.matches(selector)) return true;
    if (selector && element.closest && element.closest(selector)) return true;
  }
  return false;
};

var isVisible = function (element) {
  if (ignoredTags[element.tagName]) return false;
  if (element.hasAttribute('data-chrome-layout-diff-runtime')) return false;
  if (isIgnoredBySelector(element)) return false;
  var style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  var rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return true;
};

var textForHash = function (element) {
  var parts = [];
  var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      var parent = node.parentElement || node.parentNode;
      if (!parent || parent.nodeType !== 1) return NodeFilter.FILTER_REJECT;
      if (isIgnoredBySelector(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var node = walker.nextNode();
  while (node) {
    parts.push(node.nodeValue || '');
    node = walker.nextNode();
  }
  return parts.join(' ');
};

var app = document.querySelector('#app');
if (!app) throw new Error('#app was not found');

var appRect = app.getBoundingClientRect();
var elements = [];
var all = app.querySelectorAll('*');
for (var i = 0; i < all.length; i += 1) {
  var element = all[i];
  if (!isVisible(element)) continue;

  var style = window.getComputedStyle(element);
  var styles = {};
  for (var propIndex = 0; propIndex < styleProps.length; propIndex += 1) {
    var prop = styleProps[propIndex];
    styles[prop] = style[prop];
  }

  var text = textForHash(element).replace(/\s+/g, ' ').trim();
  var rect = element.getBoundingClientRect();
  elements.push({
    path: elementPath(element, app),
    tag: element.tagName.toLowerCase(),
    id: element.id || '',
    classes: Array.prototype.slice.call(element.classList || []),
    textHash: text ? hashText(text) : '',
    appRect: rectSnapshot(rect, appRect),
    viewportRect: rectSnapshot(rect),
    clientWidth: numericLayoutValue(element.clientWidth),
    clientHeight: numericLayoutValue(element.clientHeight),
    scrollWidth: numericLayoutValue(element.scrollWidth),
    scrollHeight: numericLayoutValue(element.scrollHeight),
    offsetWidth: numericLayoutValue(element.offsetWidth),
    offsetHeight: numericLayoutValue(element.offsetHeight),
    styles: styles
  });
}

return {
  url: window.location.href,
  title: document.title,
  appRect: rectSnapshot(appRect),
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio
  },
  elements: elements
};
`
