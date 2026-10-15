import type { APIRoute } from 'astro';
import { exchange } from '../../../server/auth-session';

export const prerender = false;

export const POST: APIRoute = ({ request }) => exchange(request, 'google');
