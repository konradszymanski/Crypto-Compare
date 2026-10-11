import { defineConfig } from 'vite';

export default defineConfig({
    // Relative asset URLs work both on the GitHub Pages project subpath and locally.
    base: './',
    build: {
        // The larger ECharts bundle is deferred and does not load on non-chart pages.
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            input: ['index.html', 'cycles.html', 'market.html', 'events.html']
        }
    }
});
