import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const telefone = String(body.telefone ?? "").trim();
    const pinAtual = String(body.pinAtual ?? "").trim();
    const novoPin = String(body.novoPin ?? "").trim();

    if (!telefone || !pinAtual || !novoPin) {
      return NextResponse.json(
        { erro: "Telefone, PIN atual e novo PIN são obrigatórios" },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(novoPin)) {
      return NextResponse.json(
        { erro: "O novo PIN deve ter 4 dígitos" },
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

    if (!cliente.pin || cliente.pin !== pinAtual) {
      return NextResponse.json(
        { erro: "PIN atual inválido" },
        { status: 401 }
      );
    }

    const atualizado = await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        pin: novoPin,
        primeiroAcesso: false,
      },
      include: {
        compras: {
          orderBy: { data: "desc" },
        },
        pagamentos: {
          orderBy: { data: "desc" },
        },
      },
    });

    return NextResponse.json({
      sucesso: true,
      cliente: {
        id: atualizado.id,
        nome: atualizado.nome,
        telefone: atualizado.telefone,
        cpf: atualizado.cpf,
        bloqueado: atualizado.bloqueado,
        primeiroAcesso: atualizado.primeiroAcesso,
        compras: atualizado.compras,
        pagamentos: atualizado.pagamentos,
      },
    });
  } catch (error) {
    console.error("ERRO TROCAR PIN:", error);

    return NextResponse.json(
      { erro: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}