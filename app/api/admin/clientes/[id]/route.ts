import prisma from "@/lib/prisma";
import {
  getAdminFromRequest,
  onlyDigits,
  pinPadraoPorTelefone,
} from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminFromRequest(req);

    if (!admin) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const clienteId = Number(id);

    if (!clienteId) {
      return NextResponse.json(
        { erro: "Cliente inválido" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const tipo = String(body?.tipo ?? "");

    const clienteAtual = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!clienteAtual) {
      return NextResponse.json(
        { erro: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (tipo === "dados") {
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

      const conflito = await prisma.cliente.findFirst({
        where: {
          telefone,
          NOT: { id: clienteId },
        },
      });

      if (conflito) {
        return NextResponse.json(
          { erro: "Outro cliente já usa esse telefone" },
          { status: 400 }
        );
      }

      const cliente = await prisma.cliente.update({
        where: { id: clienteId },
        data: {
          nome,
          telefone,
          cpf,
        },
        include: {
          compras: { orderBy: { data: "desc" } },
          pagamentos: { orderBy: { data: "desc" } },
        },
      });

      return NextResponse.json({ sucesso: true, cliente });
    }

    if (tipo === "status") {
      const bloqueado = Boolean(body?.bloqueado);

      const cliente = await prisma.cliente.update({
        where: { id: clienteId },
        data: { bloqueado },
        include: {
          compras: { orderBy: { data: "desc" } },
          pagamentos: { orderBy: { data: "desc" } },
        },
      });

      return NextResponse.json({ sucesso: true, cliente });
    }

    if (tipo === "compra") {
      const descricao = String(body?.descricao ?? "").trim();
      const valor = Number(body?.valor ?? 0);
      const data = body?.data ? new Date(body.data) : new Date();

      if (!descricao || !valor || Number.isNaN(valor) || valor <= 0) {
        return NextResponse.json(
          { erro: "Descrição e valor válido são obrigatórios" },
          { status: 400 }
        );
      }

      await prisma.compra.create({
        data: {
          clienteId,
          descricao,
          valor,
          data,
        },
      });

      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        include: {
          compras: { orderBy: { data: "desc" } },
          pagamentos: { orderBy: { data: "desc" } },
        },
      });

      return NextResponse.json({ sucesso: true, cliente });
    }

    if (tipo === "pagamento") {
      const valor = Number(body?.valor ?? 0);
      const data = body?.data ? new Date(body.data) : new Date();

      if (!valor || Number.isNaN(valor) || valor <= 0) {
        return NextResponse.json(
          { erro: "Valor de pagamento inválido" },
          { status: 400 }
        );
      }

      await prisma.pagamento.create({
        data: {
          clienteId,
          valor,
          data,
        },
      });

      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        include: {
          compras: { orderBy: { data: "desc" } },
          pagamentos: { orderBy: { data: "desc" } },
        },
      });

      return NextResponse.json({ sucesso: true, cliente });
    }

    if (tipo === "resetPin") {
      const pin = pinPadraoPorTelefone(clienteAtual.telefone);

      const cliente = await prisma.cliente.update({
        where: { id: clienteId },
        data: {
          pin,
          primeiroAcesso: true,
        },
        include: {
          compras: { orderBy: { data: "desc" } },
          pagamentos: { orderBy: { data: "desc" } },
        },
      });

      return NextResponse.json({
        sucesso: true,
        mensagem: `PIN redefinido para ${pin}`,
        cliente,
      });
    }

    return NextResponse.json(
      { erro: "Tipo de operação inválido" },
      { status: 400 }
    );
  } catch (error) {
    console.error("ERRO PATCH CLIENTE:", error);
    return NextResponse.json(
      { erro: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}