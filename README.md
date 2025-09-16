# humanquery-mongo

This is a MongoDB query parser that converts human-readable search strings into MongoDB query syntax.

## Features

- Parse human-friendly search expressions into MongoDB queries
- Supports logical operators, grouping, comparison, regex, arrays, dates, booleans, and nulls
- Handles nested and complex expressions

## Installation

```sh
npm install humanquery-mongo
```

## Usage

```js
import convert from 'humanquery-mongo';
// or: const convert = require('humanquery-mongo');

const str = `n > 0 & (b = true | r ~ 'hello.*' | t != "text") & d = now-1d`;
const query = convert(str);

console.log(query);
// Output:
// {
//   "$and": [
//     { "n": { "$gt": 0 } },
//     {
//       "$or": [
//         { "b": true }, { "r": { "$regex": "hello.*" } },
//         { "t": { "$ne": "text" } }
//       ]
//     },
//     { "d": "2025-09-15T21:29:15.934Z" }
//   ]
// }
```

## Supported Syntax

- **Comparison:** `=`, `==`, `!=`, `!==`, `>`, `>=`, `<`, `<=`
- **Logical:** `&` (AND), `|` (OR), `()` parentheses for grouping
- **RegEx:** `~` (case-sensitive), `~*` (case-insensitive)
- **Quotes:** `'` or `"`
- **Arrays:** `[1, "text", true, null]`
- **Dates (ISO 8601):** `YYYY-MM-DD`, `YYYY-MM-DDThh:mm:ss`, `now`, `now+1d`, `now-6h`
- **Booleans:** `true`, `false`
- **Null:** `null`
