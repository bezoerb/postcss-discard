/* eslint-env jest */

'use strict';

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const {stripIndents} = require('common-tags');
const plugin = require('.');

const styles = stripIndents`
html,body {
  margin: 0;
  padding: 0;
}

@font-face {
  font-family: 'Glyphicons Halflings';
}

.my.awesome.selector {
  width: 100%;
  background: url('/myImage.jpg');
}

main h1 > p {
  font-size: 1.2rem;
}



@media only screen and (max-width: 768px) {
  .test {
    display: block;
  }

  main h1 > p {
    font-size: 1rem;
  }
}

@media only print {
  h1 {
    color: #000;
  }
}

@supports not (font-variation-settings: 'XHGT' 0.7) {
  .testa {
    display: block;
  }
  @media only screen and (max-width: 768px) {
    .testa {
      display: none;
    }
  }
}
`;

function run(input, opts, output = '') {
  return postcss([plugin(opts)])
    .process(input, {from: undefined})
    .then(result => {
      expect(result.warnings()).toHaveLength(0);
      if (output) {
        expect(result.css).toEqual(output);
      }

      return result;
    });
}

const read = (i, type) => {
  return fs.readFileSync(path.join(__dirname, `test/fixtures/${i}-${type}.css`), 'utf8');
};

const testCss = (i, r = true) => {
  const all = read(i, 'all');
  const critical = (r && read(i, 'critical')) || path.join(__dirname, `test/fixtures/${i}-critical.css`);
  const diff = read(i, 'diff');

  return run(all, {css: critical}, diff);
};

it('removes css defined as string', () => {
  return Promise.all([1, 2, 3, 4, 5, 6, 7].map(i => testCss(i)));
});

it('removes css defined as file', () => {
  return Promise.all([1, 2, 3, 4, 5, 6, 7].map(i => testCss(i, false)));
});

it('returns unchanged css', () => {
  return run(styles, {}, styles);
});

it('removes @supports atrule', () => {
  return run(styles, {atrule: ['@supports']}).then(({css}) => {
    expect(css).toMatch('@font-face');
    expect(css).toMatch('font-family: \'Glyphicons Halflings\'');
    expect(css).toMatch('html');
    expect(css).toMatch('.my.awesome.selector');
    expect(css).toMatch('main h1 > p');
    expect(css).toMatch('.test');
    expect(css).toMatch('only print');
    expect(css).not.toMatch('@supports');
    expect(css).not.toMatch('.testa');
  });
});

it('removes @font-face atrule', () => {
  return run(styles, {atrule: '@font-face'}).then(({css}) => {
    expect(css).not.toMatch('@font-face');
    expect(css).not.toMatch('font-family: \'Glyphicons Halflings\'');
    expect(css).toMatch('html');
    expect(css).toMatch('.my.awesome.selector');
    expect(css).toMatch('main h1 > p');
    expect(css).toMatch('.test');
    expect(css).toMatch('only print');
  });
});

it('works regular expressions', () => {
  return run(styles, {rule: /body/}).then(({css}) => {
    expect(css).not.toMatch('body');
    expect(css).toMatch('html');
    expect(css).toMatch('font-face');
    expect(css).toMatch('.my.awesome.selector');
    expect(css).toMatch('main h1 > p');
    expect(css).toMatch('.test');
    expect(css).toMatch('only print');
  });
});

it('removes everything', () => {
  return run(styles, {decl: /.*/}).then(({css}) => {
    expect(css).not.toMatch('body');
    expect(css).not.toMatch('html');
    expect(css).not.toMatch('font-face');
    expect(css).not.toMatch('.my.awesome.selector');
    expect(css).not.toMatch('main h1 > p');
    expect(css).not.toMatch('.test');
    expect(css).not.toMatch('only print');
  });
});

it('removes all rules', () => {
  return run(
    styles,
    {rule: /.*/},
    stripIndents`
    @font-face {
      font-family: 'Glyphicons Halflings';
    }
  `
  );
});

it('removes media queries width max-width: 768px', () => {
  return run(
    styles,
    {atrule: /max-width: 768px/},
    stripIndents`
    html,body {
      margin: 0;
      padding: 0;
    }

    @font-face {
      font-family: 'Glyphicons Halflings';
    }

    .my.awesome.selector {
      width: 100%;
      background: url('/myImage.jpg');
    }

    main h1 > p {
      font-size: 1.2rem;
    }

    @media only print {
      h1 {
        color: #000;
      }
    }

    @supports not (font-variation-settings: 'XHGT' 0.7) {
        .testa {
        display: block;
      }
    }
  `
  );
});

it('removes declarations by filter function', () => {
  function filter(node, value) {
    expect(node).toHaveProperty('type', 'decl');
    return node.prop === 'width' || value === 'url(\'/myImage.jpg\')';
  }

  return run(styles, {decl: filter}).then(({css}) => {
    expect(css).toMatch('body');
    expect(css).toMatch('html');
    expect(css).toMatch('font-face');
    expect(css).not.toMatch('.my.awesome.selector');
    expect(css).toMatch('main h1 > p');
    expect(css).toMatch('.test');
    expect(css).toMatch('only print');
    expect(css).toMatch('@supports not (font-variation-setting');
  });
});

it('removes font-face && print', () => {
  return run(styles, {atrule: ['@font-face', /print/]}).then(({css}) => {
    expect(css).toMatch('body');
    expect(css).toMatch('html');
    expect(css).not.toMatch('font-face');
    expect(css).not.toMatch('@media only print');
    expect(css).not.toMatch('color: #000');
    expect(css).not.toMatch('Glyphicons Halflings');
    expect(css).toMatch('main h1 > p');
    expect(css).toMatch('.test');
    expect(css).toMatch('@supports not (font-variation-setting');
  });
});
