<div align="center">
  <h1>Utilities to compile SpiderMonkey to <code>wasm32-wasi</code></h1>
</div>

## Development Requirements

- Node >= 14.13.1
- [zx](https://github.com/google/zx)
- Rust >= 1.56.1 with the `wasm32-wasi` target


## Building from source

- Run `./build.mjs` 
- Build artifacts will be placed under the `./obj` directory

## Creating a release

- Run  `./tag.sh`
