# neocmakslsp vscode plugin

This plugin is for [neocmakslsp](https://github.com/Decodetalkers/neocmakelsp) on vscode, it providing:

 - code completion
 - compile errors and warnings
 - go-to-definition and cross references
 - hover information
 - code formatting
 - highlight
 - AST tree

## Settings

neocmakslsp can use tcp way to start, to set is like

```json
{
  "neocmakslsp": {
    "tcp": true
  }
}
```

NOTE: this feature only enable on unix system which has `nc` command.

## Feature show

### highlight

![highlight](./images/highlight.png)

### Ast tree

![ast](./images/ast.png)

### Hover

![hover](./images/hover.png)

