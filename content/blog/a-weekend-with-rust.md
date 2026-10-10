---
title: A Weekend with Rust
description: I spent a weekend learning Rust by building a simple CLI tool. Here's what I learned about ownership, borrowing, and why everyone loves it.
date: 2026-03-10
image: /og-image.png
draft: false
---

I finally sat down to learn Rust over a weekend. No distractions, just me, the compiler, and a lot of error messages.

## First Impressions

The learning curve is real. The borrow checker feels like a strict teacher at first, but after a few hours, you start to understand _why_ it's so strict.

```rust
fn main() {
    let s = String::from("hello");
    let s2 = s; // s is moved, not copied
    // println!("{}", s); // this won't compile!
}
```

## Ownership Changes How You Think

Coming from JavaScript, where everything is garbage-collected, Rust's ownership model forces you to think about memory upfront. It's frustrating at first, then liberating.

## The Compiler is Your Friend

Rust's compiler messages are the best I've ever seen. They tell you exactly what's wrong and often suggest the fix.

## Conclusion

One weekend isn't enough to master Rust, but it's enough to fall in love with it. I'll be using it for my next CLI project.
