import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'payflow_operator';
const SESSION_SECONDS = 3600;
interface AuthConfig { version: string; username: string; subject: string; role: 'operator'; salt: string; passwordHash: string; sessionSecret: string; privateKey: string; publicKey: string }
export interface OperatorSession { sid: string; sub: string; username: string; role: 'operator'; exp: number; iat: number; csrf: string; version: string; aud: 'payflow-operator' }
function sessionPath(sid: string) {
  if(!/^[a-f0-9-]{36}$/.test(sid)) throw new Error('Invalid session');
  const configPath = process.env.PAYFLOW_AUTH_CONFIG || path.resolve(process.cwd(), '..', '.payflow-private', 'operator.json');
  const dir = path.join(path.dirname(configPath),'sessions');
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  return path.join(dir,sid+'.json');
}
export function authConfig(): AuthConfig | null {
  try {
    const target = process.env.PAYFLOW_AUTH_CONFIG || path.resolve(process.cwd(), '..', '.payflow-private', 'operator.json');
    if ((fs.statSync(target).mode & 0o077) !== 0) return null;
    const c = JSON.parse(fs.readFileSync(target, 'utf8'));
    return c.role === 'operator' && /^[a-f0-9]{64}$/.test(c.sessionSecret) && c.passwordHash?.length === 128 && c.subject && c.privateKey ? c : null;
  } catch { return null; }
}
export function equal(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export function authenticate(username: string, password: string): OperatorSession | null {
  const c = authConfig();
  if (!c || password.length > 256 || username.length > 128) return null;
  const hash = crypto.scryptSync(password, c.salt, 64).toString('hex');
  if (!equal(hash, c.passwordHash) || !equal(username, c.username)) return null;
  const now = Math.floor(Date.now()/1000);
  return {sid:crypto.randomUUID(),sub:c.subject, username:c.username, role:c.role, exp:now+SESSION_SECONDS, iat:now, csrf:crypto.randomBytes(32).toString('base64url'), version:c.version, aud:'payflow-operator'};
}
export function signSession(session: OperatorSession): string {
  const c = authConfig();
  if (!c) throw new Error('Authentication not configured');
  fs.writeFileSync(sessionPath(session.sid),JSON.stringify({sub:session.sub,exp:session.exp,version:session.version}),{mode:0o600});
  const body = Buffer.from(JSON.stringify(session)).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', Buffer.from(c.sessionSecret,'hex')).update(body).digest('base64url');
}
export function sessionFromToken(token: string | undefined): OperatorSession | null {
  try {
    const c = authConfig();
    if (!c || !token || token.length > 3000) return null;
    const [body, sig, extra] = token.split('.');
    if (!body || !sig || extra !== undefined) return null;
    const expected = crypto.createHmac('sha256', Buffer.from(c.sessionSecret,'hex')).update(body).digest('base64url');
    if (!equal(sig,expected)) return null;
    const s = JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
    const stored = JSON.parse(fs.readFileSync(sessionPath(s.sid),'utf8'));
    if(stored.sub!==s.sub || stored.exp!==s.exp || stored.version!==s.version) return null;
    const now = Math.floor(Date.now()/1000);
    return s.aud === 'payflow-operator' && s.sub === c.subject && s.role === c.role && s.version === c.version && typeof s.csrf === 'string' && s.csrf.length >= 40 && Number.isFinite(s.iat) && Number.isFinite(s.exp) && s.iat <= now && s.exp > now && s.exp-s.iat === SESSION_SECONDS ? s : null;
  } catch { return null; }
}
export function operatorSession(req: NextRequest) { return sessionFromToken(req.cookies.get(SESSION_COOKIE)?.value); }
export function revokeSession(s: OperatorSession) { try {fs.unlinkSync(sessionPath(s.sid));} catch {} }
export function sameOrigin(req: NextRequest, requireOrigin = false): boolean {
  const origin = req.headers.get('origin');
  if (req.headers.get('sec-fetch-site') === 'cross-site') return false;
  if (!origin) return !requireOrigin;
  try {
    const u = new URL(origin);
    const configured = process.env.PAYFLOW_PUBLIC_ORIGIN;
    return ['http:','https:'].includes(u.protocol) && (configured ? u.origin === new URL(configured).origin : u.host === req.headers.get('host'));
  } catch { return false; }
}
export function csrfValid(req: NextRequest, s: OperatorSession): boolean { return sameOrigin(req, true) && equal(req.headers.get('x-payflow-csrf') || '', s.csrf); }
export function assertion(session: OperatorSession, body: Record<string, unknown>): string {
  const c = authConfig();
  if (!c) throw new Error('Authentication not configured');
  const now = Math.floor(Date.now()/1000);
  const payload = Buffer.from(JSON.stringify({aud:'payflow-engine',sub:session.sub,role:session.role,iat:now,exp:now+90,nonce:crypto.randomUUID(),body_sha256:crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')})).toString('base64url');
  return payload+'.'+crypto.sign(null,Buffer.from(payload),c.privateKey).toString('base64url');
}
export function cookieOptions(req: NextRequest) {
  const origin = process.env.PAYFLOW_PUBLIC_ORIGIN || req.headers.get('origin') || req.url;
  const url = new URL(origin);
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  return {httpOnly:true, sameSite:'strict' as const, secure:!local || url.protocol === 'https:', path:'/', maxAge:SESSION_SECONDS};
}
