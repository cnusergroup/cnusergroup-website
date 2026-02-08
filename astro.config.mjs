import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  site: 'https://awscommunity.cn',
  // 使用自定义域名时 base 为根路径
  base: '/',
  output: 'static',
  build: {
    assets: 'assets'
  },
  compressHTML: true
});