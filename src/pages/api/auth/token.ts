import type { APIRoute } from 'astro';
import { refresh } from '../../../server/auth-session';

export const prerender = false;

export const POST: APIRoute = ({ request }) => refresh(request);
