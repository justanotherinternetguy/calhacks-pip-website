import { defineConfig } from 'astro/config';

export default defineConfig({
    site: 'https://pip.internetguy.dev',
    output: 'static',
    compressHTML: true,
    build: { inlineStylesheets: 'always' },
    devToolbar: { enabled: false }
});
