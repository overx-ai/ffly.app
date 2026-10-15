// The Vercel adapter's build output (spec 014): the prerendered site in static/, the routes in config.json.
export const VERCEL_OUTPUT = new URL('../.vercel/output/', import.meta.url);

// In config.json a route whose dest is not a path is served by the function.
export const functionRoutes = (config) => config.routes.filter((route) => route.dest && !route.dest.startsWith('/'));
