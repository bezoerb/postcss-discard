var postcss = require('postcss');

var plugin = require('./');

var styles = `
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
  return postcss([plugin(opts)]).process(input, { from: undefined })
    .then(result => {
      expect(result.warnings().length).toBe(0);
      if (output) {
        expect(result.css).toEqual(output);
      }
      return result;
    });
}

it('returns unchanged css', () => {
  return run(styles, {}, styles);
});

it('removes @font-face', () => {
  return run(styles, { atrule: '@font-face' }).then(result => {
    expect(result.css).not.toMatch('@font-face');
    expect(result.css).not.toMatch('font-family: \'Glyphicons Halflings\'');
  });
});
