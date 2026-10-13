# Third-party notices

This package is a **mixed** distribution, and the split matters:

| part | license |
| --- | --- |
| `src/`, `bin/`, `scripts/`, `dist/` — everything we wrote | **MIT** ([LICENSE](LICENSE)) |
| `assets/cobol/` — GnuCOBOL and its runtime | **GPL-3.0-or-later** / **LGPL-3.0-or-later** ([LICENSE.GPL](LICENSE.GPL)) |

`package.json` declares that as `(MIT AND GPL-3.0-or-later)`.

**Why it cannot be one license.** The LGPL's own preamble says it "incorporates the terms and
conditions of version 3 of the GNU General Public License, supplemented by the additional
permissions listed below" — permissions are added to the GPL, never taken away. So GnuCOBOL's
compiler, which is GPL-3.0-or-later, cannot be conveyed under LGPL, and a package that ships it
cannot honestly be declared LGPL. It can be declared GPL, or a mix like this one.

**Why our code can still be MIT.** It is not a derivative work of GnuCOBOL. It loads the compiler as
a separate WASI module and talks to it through argv and a filesystem — the same relationship a shell
script has to the programs it runs — so the code and the assets are separate works that happen to be
distributed together. That is also why the MIT side was kept: a consumer who wants only the code, to
bundle into their own build, should not inherit the compiler's copyleft.

## What ships, and under what

### `assets/cobol/` — the GnuCOBOL frontend

Built from GnuCOBOL 3.2 and GMP 6.3.0 by the `cobol-browser` producer in
[`seo-rii/wasm-llvm`](https://github.com/seo-rii/wasm-llvm), which documents the same licenses:

| asset | what it is | license |
| --- | --- | --- |
| `cobc.wasm.gz` | the GnuCOBOL compiler frontend (`cobc`) | **GPL-3.0-or-later** |
| `rootfs.tar.gz` | GnuCOBOL compiler configuration, copybooks and static libraries, including `libcob.a` and `libgmp.a` | **LGPL-3.0-or-later** (GnuCOBOL runtime, GMP); copybooks and configuration are GPL-3.0-or-later |
| `c-sysroot.tar.gz` | the C sysroot the generated C is compiled against — wasi-libc headers, crt objects and libs | Apache-2.0 WITH LLVM-exception, and MIT (wasi-libc) |

Upstream: [GnuCOBOL](https://gnucobol.sourceforge.io/) · [GMP](https://gmplib.org/) ·
[wasi-libc](https://github.com/WebAssembly/wasi-libc).

### `dist/cobol-wasm.global.js` — the IIFE bundle

It bundles the package's own MIT code together with the host it runs on:

| bundled | license |
| --- | --- |
| `@wasm-idle/llvm-core` | MIT AND (Apache-2.0 WITH LLVM-exception) |
| `@live-codes/clang-wasm` | MIT |
| `@bjorn3/browser_wasi_shim` | MIT OR Apache-2.0 |
| `fflate` | MIT |

All permissive, so the bundle stays MIT and carries a header naming them; esbuild writes any
`@license` comments it finds to `dist/cobol-wasm.global.js.LEGAL.txt`.

## What does not ship here

The Clang toolchain — `bin/clang.wasm.gz`, `bin/lld.wasm.gz`, `bin/memfs.wasm.gz` and the Clang
sysroot — belongs to [`@live-codes/clang-wasm`](https://www.npmjs.com/package/@live-codes/clang-wasm),
which this package depends on and reads at run time rather than duplicating. Those files are
LLVM/Clang, under **Apache-2.0 WITH LLVM-exception**, plus that package's own MIT code and notices.

## The obligations, stated plainly

- **Conveying the package conveys GPL-3.0-or-later and LGPL-3.0-or-later binaries.** Pass on
  [LICENSE.GPL](LICENSE.GPL) and make the corresponding source available.
- **The corresponding source** is GnuCOBOL 3.2 and GMP 6.3.0 from the upstream projects above,
  together with the producer's build recipe and patches in `seo-rii/wasm-llvm`'s
  `producer/cobol-browser` — the exact form these binaries were built from.
- **Compiled programs are not affected.** A compiler's output is not a derivative work of the
  compiler, and the only part of GnuCOBOL that ends up inside a program — `libcob`, linked in from
  `rootfs.tar.gz` — is **LGPL-3.0-or-later**, whose section 4 is written precisely to let a combined
  work be conveyed under terms of your choice. So a COBOL program a user compiles through this
  package belongs to them, under whatever license they choose. (GnuCOBOL has no *named* runtime
  exception of the kind GCC has; the LGPL is what does the work here.)
- **A consumer that merely depends on this package is not relicensing anything.** The GPL applies to
  what is conveyed here; code that loads it as a separate module or dependency is a separate work.

If you are packaging this for distribution, the practical minimum is to include `LICENSE`,
[LICENSE.GPL](LICENSE.GPL) and this file alongside the assets, and to keep the upstream links above
reachable.
