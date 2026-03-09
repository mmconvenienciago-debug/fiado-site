import prisma from "@/lib/prisma";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  checkPassword,
  createAdminSessionToken,
  getAdminFromRequest,
  hashPassword,
} from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);

    if (!admin) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const senhaAtual = String(body?.senhaAtual ?? "").trim();
    const novaSenha = String(body?.novaSenha ?? "").trim();

    if (!senhaAtual || !novaSenha) {
      return NextResponse.json(
        { erro: "Senha atual e nova senha são obrigatórias" },
        { status: 400 }
      );
    }

    if (novaSenha.length < 6) {
      return NextResponse.json(
        { erro: "A nova senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    const senhaOk = await checkPassword(admin.senhaHash, senhaAtual);

    if (!senhaOk) {
      return NextResponse.json(
        { erro: "Senha atual incorreta" },
        { status: 401 }
      );
    }

    const sessionToken = createAdminSessionToken();

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        senhaHash: await hashPassword(novaSenha),
        sessionToken,
      },
    });

    const response = NextResponse.json({ sucesso: true });

    response.cookies.set(
      ADMIN_COOKIE_NAME,
      sessionToken,
      adminCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("ERRO ALTERAR SENHA ADMIN:", error);
    return NextResponse.json(
      { erro: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}