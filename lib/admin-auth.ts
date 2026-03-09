import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_session";
export const DEFAULT_ADMIN_USUARIO = "admconveniencia";
export const DEFAULT_ADMIN_SENHA = "a1b2c3";

export const MAX_TENTATIVAS_SEM_CAPTCHA = 3;
export const MAX_TENTATIVAS_TOTAL = 6;
export const TEMPO_BLOQUEIO_MINUTOS = 15;

export function createAdminSessionToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 10);
}

export async function checkPassword(hash: string, value: string) {
  return bcrypt.compare(value, hash);
}

export async function ensureDefaultAdmin() {
  let admin = await prisma.admin.findUnique({
    where: { usuario: DEFAULT_ADMIN_USUARIO },
  });

  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        usuario: DEFAULT_ADMIN_USUARIO,
        senhaHash: await hashPassword(DEFAULT_ADMIN_SENHA),
      },
    });
  }

  return admin;
}

export async function getAdminFromRequest(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) return null;

  return prisma.admin.findFirst({
    where: {
      sessionToken: token,
    },
  });
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function pinPadraoPorTelefone(telefone: string) {
  return onlyDigits(telefone).slice(-4);
}

export function adminEstaBloqueado(bloqueadoAte: Date | null) {
  if (!bloqueadoAte) return false;
  return bloqueadoAte.getTime() > Date.now();
}

export function precisaCaptcha(tentativasLogin: number) {
  return tentativasLogin >= MAX_TENTATIVAS_SEM_CAPTCHA;
}

export function calcularBloqueioAte() {
  return new Date(Date.now() + TEMPO_BLOQUEIO_MINUTOS * 60 * 1000);
}

export async function registrarFalhaLoginAdmin(adminId: number, tentativasAtuais: number) {
  const novasTentativas = tentativasAtuais + 1;
  const deveExigirCaptcha = novasTentativas >= MAX_TENTATIVAS_SEM_CAPTCHA;
  const deveBloquear = novasTentativas >= MAX_TENTATIVAS_TOTAL;

  return prisma.admin.update({
    where: { id: adminId },
    data: {
      tentativasLogin: novasTentativas,
      captchaObrigatorio: deveExigirCaptcha,
      bloqueadoAte: deveBloquear ? calcularBloqueioAte() : null,
    },
  });
}

export async function resetarSegurancaLoginAdmin(adminId: number) {
  return prisma.admin.update({
    where: { id: adminId },
    data: {
      tentativasLogin: 0,
      captchaObrigatorio: false,
      bloqueadoAte: null,
    },
  });
}