import type { APIRoute } from 'astro';
import { signOut } from '../../../server/auth-session';

export const prerender = false;

export const DELETE: APIRoute = ({ request }) => signOut(request);
