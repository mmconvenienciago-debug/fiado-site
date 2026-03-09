import prisma from "@/lib/prisma";
import {
  getAdminFromRequest,
  onlyDigits,
  pinPadraoPorTelefone,
} from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);

    if (!admin) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const clientes = await prisma.cliente.findMany({
      include: {
        compras: {
          orderBy: { data: "desc" },
        },
        pagamentos: {
          orderBy: { data: "desc" },
        },
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({ clientes });
  } catch (error) {
    console.error("ERRO LISTAR CLIENTES:", error);
    return NextResponse.json(
      { erro: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);

    if (!admin) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const nome = String(body?.nome ?? "").trim();
    const telefone = onlyDigits(String(body?.telefone ?? ""));
    const cpfRaw = String(body?.cpf ?? "").trim();
    const cpf = cpfRaw || null;

    if (!nome || !telefone) {
      return NextResponse.json(
        { erro: "Nome e telefone são obrigatórios" },
        { status: 400 }
      );
    }

    if (telefone.length < 10 || telefone.length > 11) {
      return NextResponse.json(
        { erro: "Telefone inválido" },
        { status: 400 }
      );
    }

    const existente = await prisma.cliente.findUnique({
      where: { telefone },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Já existe cliente com esse telefone" },
        { status: 400 }
      );
    }

    const pin = pinPadraoPorTelefone(telefone);

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        telefone,
        cpf,
        pin,
        primeiroAcesso: true,
        bloqueado: false,
      },
      include: {
        compras: true,
        pagamentos: true,
      },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: `Cliente criado. PIN inicial: ${pin}`,
      cliente,
    });
  } catch (error) {
    console.error("ERRO CRIAR CLIENTE:", error);
    return NextResponse.json(
      { erro: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}