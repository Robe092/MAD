import {NextRequest, NextResponse} from 'next/server';
import {authenticate, signSession, operatorSession, SESSION_COOKIE, cookieOptions, sameOrigin, csrfValid, authConfig, revokeSession} from '@/lib/operator-auth';
export const dynamic = 'force-dynamic';
const attempts = new Map<string, {count:number, reset:number}>();
function result(data: object, status = 200) { return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}}); }
export async function GET(req: NextRequest) {
  const session = operatorSession(req);
  return result({configured:!!authConfig(), authenticated:!!session, user:session ? {username:session.username,role:session.role} : null, csrf:session?.csrf || null});
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req,true)) return result({code:'ORIGIN_DENIED',message:'Origine refusée.'},403);
  // Deliberately do not trust X-Forwarded-For supplied by the browser.
  const key = 'operator-login'; const now=Date.now();
  const previous=attempts.get(key);const bucket = previous && previous.reset>now ? previous : {count:0,reset:now+60000};
  if (++bucket.count>8) return result({code:'LOGIN_RATE_LIMIT',message:'Trop de tentatives. Réessayez dans une minute.'},429);
  attempts.set(key,bucket);
  try {
    if (Number(req.headers.get('content-length') || 0)>2048) return result({code:'INVALID_LOGIN'},400);
    const raw = await req.text(); if(raw.length>2048) return result({code:'INVALID_LOGIN'},400);
    const body=JSON.parse(raw);
    if(typeof body?.username!=='string'||typeof body?.password!=='string') return result({code:'INVALID_LOGIN'},400);
    if(!authConfig()) return result({code:'AUTH_NOT_CONFIGURED',message:'Authentification non configurée.'},503);
    const session=authenticate(body.username,body.password);
    if(!session) return result({code:'INVALID_CREDENTIALS',message:'Identifiants incorrects.'},401);
    const response=result({authenticated:true,user:{username:session.username,role:session.role},csrf:session.csrf});
    response.cookies.set(SESSION_COOKIE,signSession(session),cookieOptions(req));
    return response;
  } catch { return result({code:'INVALID_LOGIN',message:'Requête invalide.'},400); }
}
export async function DELETE(req:NextRequest) {
  const session=operatorSession(req);
  if(!session||!csrfValid(req,session)) return result({code:'AUTH_OR_CSRF_DENIED'},403);
  revokeSession(session);
  const response=result({authenticated:false});
  response.cookies.set(SESSION_COOKIE,'',{...cookieOptions(req),maxAge:0});
  return response;
}
