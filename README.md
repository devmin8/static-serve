# static-serve

A small Bun static file server with a polished directory listing.

It serves files directly so the browser handles them normally. Directories render a dark, compact listing with full filename wrapping, current-folder search, sortable columns, breadcrumbs, and parent-folder navigation.

![Static Serve directory listing](assets/screenshot.png)

## Usage

```sh
bun install
bun src/cli.ts ./public --port 3000
```

## Global install from this checkout

Until `static-serve` is published to a package registry, install it globally from
this repository:

```sh
bun install
bun link
```

Then use the package binary from anywhere:

```sh
static-serve ./public --port 3000
```

## Development

```sh
bun test
bun run typecheck
```
