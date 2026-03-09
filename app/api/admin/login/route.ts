import prisma from "@/lib/prisma";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  adminEstaBloqueado,
  checkPassword,
  createAdminSessionToken,
  ensureDefaultAdmin,
  precisaCaptcha,
  registrarFalhaLoginAdmin,
  resetarSegurancaLoginAdmin,
  TEMPO_BLOQUEIO_MINUTOS,
} from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const body = await req.json();
    const usuario = String(body?.usuario ?? "").trim();
    const senha = String(body?.senha ?? "").trim();
    const captchaToken = String(body?.captchaToken ?? "").trim();

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

    if (adminEstaBloqueado(admin.bloqueadoAte)) {
      return NextResponse.json(
        {
          erro: `Login bloqueado temporariamente. Tente novamente em ${TEMPO_BLOQUEIO_MINUTOS} minutos.`,
          bloqueado: true,
        },
        { status: 429 }
      );
    }

    if (admin.captchaObrigatorio && !captchaToken) {
      return NextResponse.json(
        {
          erro: "Confirme que você não é um robô para continuar.",
          captchaObrigatorio: true,
        },
        { status: 400 }
      );
    }

    const senhaOk = await checkPassword(admin.senhaHash, senha);

    if (!senhaOk) {
      const adminAtualizado = await registrarFalhaLoginAdmin(
        admin.id,
        admin.tentativasLogin
      );

      const agoraBloqueado = adminEstaBloqueado(adminAtualizado.bloqueadoAte);

      return NextResponse.json(
        {
          erro: agoraBloqueado
            ? `Login bloqueado temporariamente. Tente novamente em ${TEMPO_BLOQUEIO_MINUTOS} minutos.`
            : "Usuário ou senha inválidos",
          captchaObrigatorio: adminAtualizado.captchaObrigatorio,
          bloqueado: agoraBloqueado,
          tentativasRestantes: Math.max(0, 3 - adminAtualizado.tentativasLogin),
        },
        { status: agoraBloqueado ? 429 : 401 }
      );
    }

    await resetarSegurancaLoginAdmin(admin.id);

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