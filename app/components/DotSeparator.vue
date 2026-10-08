<script setup lang="ts">
// Decorative dot separator.
//
// `UChip` is not usable here: it renders a root `<div>`, and three of these separators sit
// inside a `<p>`. The HTML parser closes a `<p>` when it meets a `<div>`, so the browser
// restructured the server-rendered DOM (`<p>a</p><div>b</div>c<p></p>`) while the vdom still
// expected three children — producing "Server rendered element contains fewer/more child nodes
// than client vdom" on every hydrated render.
</script>

<template>
  <span class="inline-block size-[5px] shrink-0 rounded-full bg-primary ring ring-bg" aria-hidden="true" />
</template>
