const fs = require('fs');
const postcss = require('postcss');
const isFunction = require('lodash/isFunction');
const isArray = require('lodash/isArray');
const isRegExp = require('lodash/isRegExp');

const _default = {
  atrule: [],
  rule: [],
  decl: [],
  _cssDiscard: {}
};

const match = function (node, value, ignores = [], strict = false) {
  if (!isArray(ignores)) {
    ignores = [ignores];
  }
  return (
    ignores.find(pattern => {
      return (
        (isFunction(pattern) && pattern(node, value)) ||
        (!strict && isRegExp(pattern) && pattern.test(value)) ||
        pattern === value
      );
    }) !== undefined
  );
};

const checkAtrule = function (node, ignores = []) {
  return match(node, '@' + node.name, ignores, true) || match(node, node.params, ignores);
};

const checkDecl = function (node, ignores = []) {
  return (
    match(node, node.toString(), ignores) ||
    match(node, node.prop, ignores, true) ||
    match(node, node.value, ignores, true)
  );
};

const getIdentifier = (node, selector = '') => {
  switch (node.type) {
    case 'decl':
      return getIdentifier(node.parent);
    case 'rule':
      return `${getIdentifier(node.parent)} ${selector || node.selector}`.trim();
    case 'atrule':
      return `${getIdentifier(node.parent)} @${node.name} ${node.params}`.trim();
    default:
      return '';
  }
};

const getCssMapping = css => {
  let ast;
  try {
    ast = postcss.parse(css, {from: undefined});
  } catch (err) {
    if (fs.existsSync(css)) {
      ast = postcss.parse(fs.readFileSync(css, 'utf8'), {from: undefined});
    }
  }

  const result = {};
  ast.walkDecls(decl => {
    const id = getIdentifier(decl);
    result[id] = result[id] || [];
    result[id].push(decl.toString());
  });

  ast.walkRules(rule => {
    rule.selectors.forEach(selector => {
      const id = getIdentifier(rule, selector);
      rule.walkDecls(decl => {
        result[id] = result[id] || [];
        result[id].push(decl.toString());
      });
    });
  });

  return result;
};

const walker = function (root, options = _default) {
  const get = key => (options._cssDiscard && options._cssDiscard[key]) || [];

  root.walkDecls(decl => {
    const id = getIdentifier(decl);
    if (checkDecl(decl, options.decl) || get(id).includes(decl.toString())) {
      decl.remove();
    }
  });

  root.walkRules(rule => {
    const selectors = rule.selectors.filter(selector => {
      const id = getIdentifier(rule, selector);
      let drop = true;
      rule.walkDecls(decl => {
        drop = drop && get(id).includes(decl.toString());
      });

      return !drop && !match(rule, selector, options.rule);
    });

    if (rule.nodes.length === 0) {
      rule.remove();
      return;
    }

    if (selectors && selectors.length) {
      rule.selectors = selectors;
    } else {
      rule.remove();
    }
  });

  root.walkAtRules(rule => {
    if (isFunction(rule.walk)) {
      walker(rule, options);
    }

    const remove = !rule.nodes || rule.nodes.length === 0;

    if (remove || checkAtrule(rule, options.atrule)) {
      rule.remove();
    }
  });
};

module.exports = postcss.plugin('postcss-discard', opts => {
  const options = Object.assign({}, _default, opts || {});

  if (options.css) {
    options._cssDiscard = getCssMapping(options.css);
  }

  // Work with options here
  return function (root) {
    return walker(root, options);
  };
});
