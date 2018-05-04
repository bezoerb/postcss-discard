const postcss = require('postcss');
const isFunction = require('lodash/isFunction');
const isArray = require('lodash/isArray');
const isRegExp = require('lodash/isRegExp');

const _default = {
  atrule: [],
  rule: [],
  decl: []
};

/**
 * Identify ignored selectors
 * @param {object} node
 * @param {string} value
 * @param {array} ignores
 * @param {boolean} strict
 * @returns {Function}
 */
const match = (node, value, ignores = [], strict = false) => {
  if (!isArray(ignores)) {
    ignores = [ignores];
  }
  return (
    ignores.find(pattern => {
      if (isFunction(pattern) && pattern(node, value)) {
        return true;
      } else if (!strict && isRegExp(pattern) && pattern.test(value)) {
        return true;
      } else if (pattern === value) {
        return true;
      }
      return false;
    }) !== undefined
  );
};

const checkAtrule = (node, ignores = []) =>
  match(node, `@${node.name}`, ignores, true) ||
  match(node, node.name, ignores);

const checkRule = (node, ignores = []) => match(node, node.selector, ignores);

const checkDecl = (node, ignores = []) =>
  match(node, node.toString(), ignores) ||
  match(node, node.prop, ignores, true) ||
  match(node, node.value, ignores, true);

module.exports = postcss.plugin('postcss-discard', function (opts) {
  const options = Object.assign({}, _default, opts || {});

  // const matcher = getMatcher(opts.ignore);

  // Work with options here
  return root => {
    // Transform each rule here
    root.walk(node => {
      // node types: decl, rule, atrule
      if (node.type === 'atrule' && checkAtrule(node, options.atrule)) {
        node.remove();
        return;
      }

      if (node.type === 'rule' && checkRule(node, options.rule)) {
        node.remove();
        return;
      }

      if (node.type === 'decl' && checkDecl(node, options.decl)) {
        node.remove();
      }
    });
  };
});
