---
title: Building CLI Tools in Go
description: How I built my first CLI tool in Go and why the language is perfect for this kind of work.
date: 2026-05-15
tags:
  - Go
  - CLI
  - Backend
  - Tooling
  - Programming
  - Open Source
  - Terminal
image: /og-image.png
draft: false
---

Go is the best language for CLI tools. Here's why I think so after building one.

## Single Binary Output

`go build` produces a single static binary. No runtime, no dependencies. Just a file you can put anywhere.

```bash
go build -o mytool ./cmd/mytool
```

## Cross-Compilation is Trivial

```bash
GOOS=linux GOARCH=arm64 go build
```

One command to build for any platform. CI pipelines love this.

## The Standard Library is Enough

For most CLI tools, you don't need third-party packages. `flag`, `os`, `fmt`, and `io` cover 90% of use cases.

## Cobra for Complex CLIs

When you need subcommands and flags, Cobra is the way to go:

```go
var rootCmd = &cobra.Command{
  Use:   "mytool",
  Short: "A brief description",
  Run: func(cmd *cobra.Command, args []string) {
    fmt.Println("Hello from mytool!")
  },
}
```

## Testing is Straightforward

Go's testing package makes it easy to test CLI output by capturing stdout and stderr.

## Distributing via Homebrew

Once your tool is ready, creating a Homebrew tap makes installation trivial for macOS users.

## Conclusion

Go and CLI tools are a match made in heaven. Fast, simple, and easy to distribute. Try building one this weekend.
