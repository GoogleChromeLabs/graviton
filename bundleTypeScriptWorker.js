const walker = require("acorn-walk");
const MagicString = require("magic-string");

function generate_uuid() {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join("-");
}

export default function() {
  const placeholders = new Set();
  return {
    transform(code, id) {
      const ast = this.parse(code);

      // The walker calls a method for each node type on a “base”before calling
      // the method on our visitor object. The default base doesn’t handle
      // dynamic import and errors. So we create a copy of the original base
      // using `make()` and put `Import()` in there to handle dynamic imports
      // ourselves. IDK what I’m doing here, tbqh
      const newBase = walker.make({
        Import(node) {}
      });
      const importCalls = [];
      walker.simple(
        ast,
        {
          NewExpression(node) {
            if (node.callee.name !== "Worker") {
              return;
            }
            if (node.arguments[0].callee.type !== "Import") {
              return;
            }
            // Save the location of the import() call
            importCalls.push(node.arguments[0]);
          }
        },
        newBase
      );
      // Remove the saved `import` calls and generate a source map.
      const ms = new MagicString(code);
      importCalls.forEach(node => {
        const uuid = generate_uuid();
        placeholders.add(uuid);
        ms.appendLeft(node.start, `"${uuid}_start" +`);
        ms.appendRight(node.end, `+ "${uuid}_end"`);
      });
      return {
        code: ms.toString(),
        map: ms.generateMap({hires: true})
      };
    },
    renderChunk(code) {
      debugger;
      const magicCode = new MagicString(code);
      for(const uuid of placeholders) {
        const matcher = new RegExp(`${uuid}_start.+${uuid}_end`);
        const match = matcher.exec(code);
        if(!match) {
          continue
        }
        const newFilename = /chunk-[^.]+\.js/.exec(match)[0];
        magicCode.overwrite(match.index, match.index + match[0].length, newFilename)
      }
      return {
        code: magicCode.toString(),
        map: magicCode.generateMap({hires: true})
      };
    }
  };
}