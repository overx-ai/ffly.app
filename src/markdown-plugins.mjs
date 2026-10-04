// The guide layout renders the markdown H1 itself, above the byline, so the body drops it.
export function remarkDropTitle() {
  return (tree) => {
    tree.children = tree.children.filter((node) => !(node.type === 'heading' && node.depth === 1));
  };
}

// A focusable scroll box, so a wide table scrolls sideways on a phone instead of widening the page.
// A focusable element needs a role and a name for screen readers, hence the labelled region.
export function rehypeScrollTables() {
  const wrap = (node) => {
    node.children?.forEach((child, i) => {
      if (child.type === 'element' && child.tagName === 'table') {
        node.children[i] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['table-scroll'], tabIndex: 0, role: 'region', ariaLabel: 'Scrollable table' },
          children: [child],
        };
      } else {
        wrap(child);
      }
    });
  };
  return wrap;
}
