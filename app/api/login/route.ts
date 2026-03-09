import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const telefone = String(body.telefone ?? "").trim();
    const pin = String(body.pin ?? "").trim();

    if (!telefone || !pin) {
      return NextResponse.json(
        { erro: "Telefone e PIN são obrigatórios" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { telefone },
      include: {
        compras: {
          orderBy: { data: "desc" },
        },
        pagamentos: {
          orderBy: { data: "desc" },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { erro: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (!cliente.pin || cliente.pin !== pin) {
      return NextResponse.json(
        { erro: "PIN inválido" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        cpf: cliente.cpf,
        bloqueado: cliente.bloqueado,
        primeiroAcesso: cliente.primeiroAcesso,
        compras: cliente.compras,
        pagamentos: cliente.pagamentos,
      },
    });
  } catch (error) {
    console.error("ERRO LOGIN CLIENTE:", error);

    return NextResponse.json(
      { erro: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}