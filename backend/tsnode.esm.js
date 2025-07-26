import { register } from 'ts-node';

register({
  esm: true,
  transpileOnly: true,
  experimentalSpecifierResolution: 'node',
  compilerOptions: {
    module: 'esnext',
    target: 'es2020',
    moduleResolution: 'node',
    allowSyntheticDefaultImports: true,
    esModuleInterop: true
  }
});
