'use strict';

const fs = require('fs');
const postcss = require('postcss');
const isFunction = require('lodash.isfunction');
const isRegExp = require('lodash.isregexp');
const CleanCSS = require('clean-css');

const c = new CleanCSS({level: 1});
const minify = str => c.minify(`a{${str}}`).styles;

const _default = {
  atrule: [],
  rule: [],
  decl: [],
  _cssDiscard: {}
};

const match = function (node, value, ignores = [], strict = false) {
  if (!Array.isArray(ignores)) {
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

const customMediaNameRegExp = /^custom-media$/i;
const customMediaParamsRegExp = /^(--[A-z][\w-]*)\s+([\W\w]+)\s*$/;

const checkCustomMedia = node => node.type === 'atrule' && customMediaNameRegExp.test(node.name) && customMediaParamsRegExp.test(node.params);

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

const normalize = (str = '', decl = true) => {
  if (decl) {
    str = minify(str);
  }

  return str.replace(/"/g, '\'').trim();
};

const getIdentifier = (node, selector = '') => {
  switch (node.type) {
    case 'decl':
      return normalize(getIdentifier(node.parent), false);
    case 'rule':
      return normalize(`${getIdentifier(node.parent)} ${selector || node.selector}`, false);
    case 'atrule':
      return normalize(`${getIdentifier(node.parent)} @${node.name} ${node.params}`, false);
    default:
      return '';
  }
};

const getCssMapping = css => {
  let ast;
  try {
    ast = postcss.parse(css, {from: undefined});
  } catch (error) {
    if (fs.existsSync(css)) {
      ast = postcss.parse(fs.readFileSync(css, 'utf8'), {from: undefined});
    }
  }

  const result = {};
  ast.walkDecls(decl => {
    const id = getIdentifier(decl);
    result[id] = result[id] || [];
    result[id].push(normalize(decl.toString()));
  });

  ast.walkRules(rule => {
    rule.selectors.forEach(selector => {
      const id = getIdentifier(rule, selector);
      rule.walkDecls(decl => {
        result[id] = result[id] || [];
        result[id].push(normalize(decl.toString()));
      });
    });
  });

  return result;
};

const walker = function (root, options = _default) {
  const {_testCss} = options;
  root.walkDecls(decl => {
    const id = getIdentifier(decl);

    if (checkDecl(decl, options.decl) || _testCss(id, decl)) {
      decl.remove();
    }
  });

  root.walkRules(rule => {
    const selectors = rule.selectors.filter(selector => {
      const id = getIdentifier(rule, selector);
      let drop = true;
      rule.walkDecls(decl => {
        drop = drop && _testCss(id, decl);
      });

      return !drop && !match(rule, selector, options.rule);
    });

    if (rule.nodes.length === 0) {
      rule.remove();
      return;
    }

    if (selectors && selectors.length > 0) {
      rule.selectors = selectors;
    } else {
      rule.remove();
    }
  });

  root.walkAtRules(rule => {
    if (isFunction(rule.walk)) {
      walker(rule, options);
    }
  });

  root.walkAtRules(rule => {
    const remove = !checkCustomMedia(rule) && (!rule.nodes || rule.nodes.length === 0);
    if (remove || checkAtrule(rule, options.atrule)) {
      rule.remove();
    }
  });
};

module.exports = postcss.plugin('postcss-discard', opts => {
  const options = Object.assign({}, _default, opts || {});

  if (options.css) {
    const mapping = getCssMapping(options.css);
    options._testCss = (key, decl) => {
      const arr = (mapping && mapping[key]) || [];
      return arr.includes(normalize(decl.toString()));
    };
  } else {
    options._testCss = () => false;
  }

  // Work with options here
  return function (root) {
    return walker(root, options);
  };
});
