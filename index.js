const postcss = require('postcss');
const isFunction = require('lodash/isFunction');
const isArray = require('lodash/isArray');
const isRegExp = require('lodash/isRegExp');

const _default = {
  atrule: [],
  rule: [],
  decl: []
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

const walker = function (root, options = _default) {
  root.walkDecls(decl => {
    if (checkDecl(decl, options.decl)) {
      decl.remove();
    }
  });

  root.walkRules(rule => {
    const selectors = rule.selectors.filter(selector => {
      return !match(rule, selector, options.rule);
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

  // Work with options here
  return function (root) {
    return walker(root, options);
  };
});
