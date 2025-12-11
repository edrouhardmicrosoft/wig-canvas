"use client";

import { Sandpack } from "@codesandbox/sandpack-react";

export default function PlaygroundPage() {
  return (
    <Sandpack
      template="react"
      files={{
        "/App.js": `// Your Button component code here`
      }}
    />
  );
}