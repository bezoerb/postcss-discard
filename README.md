# PostCSS Discard [![Build Status][ci-img]][ci]

[PostCSS] plugin to discard rules by selector, RegExp or @type.

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/bezoerb/postcss-discard.svg
[ci]:      https://travis-ci.org/bezoerb/postcss-discard

```css
.foo {
    /* Input example */
}
```

```css
.foo {
  /* Output example */
}
```

## Usage

```js
postcss([ require('postcss-discard') ])
```

See [PostCSS] docs for examples for your environment.
