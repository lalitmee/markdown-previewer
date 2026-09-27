# Markdown Previewer — sample

A **quick** smoke-test doc: headings, lists, tables, code, a diagram, and an image.

- [x] GFM task list
- [ ] Search finds this line via "smoke"

| feature | status |
| ------- | ------ |
| tables  | ✅ |
| code    | ✅ |

> Blockquote renders with a left border.

```js
console.log('code fence');
```

```mermaid
graph LR
  A[Drop files] --> B{Single or folder?}
  B -->|single| C[Preview tab]
  B -->|folder| D[Search + list]
  D --> C
```

![demo screenshot](assets/demo.png)

_Last line to prove italics work._
