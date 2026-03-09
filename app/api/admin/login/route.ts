import prisma from "@/lib/prisma";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  checkPassword,
  createAdminSessionToken,
  ensureDefaultAdmin,
} from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const body = await req.json();
    const usuario = String(body?.usuario ?? "").trim();
    const senha = String(body?.senha ?? "").trim();

    if (!usuario || !senha) {
      return NextResponse.json(
        { erro: "Usuário e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { usuario },
    });

    if (!admin) {
      return NextResponse.json(
        { erro: "Usuário ou senha inválidos" },
        { status: 401 }
      );
    }

    const senhaOk = await checkPassword(admin.senhaHash, senha);

    if (!senhaOk) {
      return NextResponse.json(
        { erro: "Usuário ou senha inválidos" },
        { status: 401 }
      );
    }

    const sessionToken = createAdminSessionToken();

    await prisma.admin.update({
      where: { id: admin.id },
      data: { sessionToken },
    });

    const response = NextResponse.json({
      sucesso: true,
      admin: {
        id: admin.id,
        usuario: admin.usuario,
      },
    });

    response.cookies.set(
      ADMIN_COOKIE_NAME,
      sessionToken,
      adminCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("ERRO LOGIN ADMIN:", error);
    return NextResponse.json(
      { erro: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ sucesso: true });

  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...adminCookieOptions(),
    maxAge: 0,
  });

  return response;
}