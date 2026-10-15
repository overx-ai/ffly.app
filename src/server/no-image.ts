// Astro 4 injects /_image into every hybrid build. The site has no astro:assets images, so it answers nothing.
export const GET = () => new Response(null, { status: 404 });
