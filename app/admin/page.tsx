"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Compra = {
  id: number;
  data: string;
  descricao: string;
  valor: number;
};

type Pagamento = {
  id: number;
  data: string;
  valor: number;
};

type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  cpf: string | null;
  bloqueado: boolean;
  pin: string | null;
  primeiroAcesso: boolean;
  compras: Compra[];
  pagamentos: Pagamento[];
};

type ItemCompra = {
  descricao: string;
  valorUnitario: string;
  quantidade: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function brl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function totalCompras(cliente: Cliente) {
  return cliente.compras.reduce((acc, item) => acc + item.valor, 0);
}

function totalPagamentos(cliente: Cliente) {
  return cliente.pagamentos.reduce((acc, item) => acc + item.valor, 0);
}

function totalAberto(cliente: Cliente) {
  return Math.max(totalCompras(cliente) - totalPagamentos(cliente), 0);
}

function pinMascarado(pin: string | null) {
  if (!pin) return "Não definido";
  return "*".repeat(pin.length);
}

function valorNumero(value: string) {
  return Number(String(value).replace(",", "."));
}

async function getResponseData(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export default function AdminPage() {
  const [carregando, setCarregando] = useState(true);
  const [adminLogado, setAdminLogado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [clienteIdSelecionado, setClienteIdSelecionado] = useState<number | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoCpf, setNovoCpf] = useState("");

  const [editarNome, setEditarNome] = useState("");
  const [editarTelefone, setEditarTelefone] = useState("");
  const [editarCpf, setEditarCpf] = useState("");

  const [itensCompra, setItensCompra] = useState<ItemCompra[]>([
    { descricao: "", valorUnitario: "", quantidade: "1" },
  ]);
  const [dataCompra, setDataCompra] = useState("");

  const [valorPagamento, setValorPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");

  const [senhaAtualAdmin, setSenhaAtualAdmin] = useState("");
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState("");

  const clienteSelecionado =
    clientes.find((cliente) => cliente.id === clienteIdSelecionado) ?? null;

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return clientes;

    return clientes.filter((cliente) => {
      return (
        cliente.nome.toLowerCase().includes(termo) ||
        cliente.telefone.includes(onlyDigits(termo)) ||
        (cliente.cpf ?? "").toLowerCase().includes(termo)
      );
    });
  }, [busca, clientes]);

  function selecionarCliente(cliente: Cliente) {
    setClienteIdSelecionado(cliente.id);
    setEditarNome(cliente.nome);
    setEditarTelefone(cliente.telefone);
    setEditarCpf(cliente.cpf ?? "");
  }

  function voltarParaLista() {
    setClienteIdSelecionado(null);
    setEditarNome("");
    setEditarTelefone("");
    setEditarCpf("");
    setItensCompra([{ descricao: "", valorUnitario: "", quantidade: "1" }]);
    setDataCompra("");
    setValorPagamento("");
    setDataPagamento("");
    setErro("");
    setMensagem("");
  }

  function limparMensagens() {
    setMensagem("");
    setErro("");
  }

  function adicionarItemCompra() {
    setItensCompra((prev) => [
      ...prev,
      { descricao: "", valorUnitario: "", quantidade: "1" },
    ]);
  }

  function removerItemCompra(index: number) {
    setItensCompra((prev) => prev.filter((_, i) => i !== index));
  }

  function atualizarItemCompra(
    index: number,
    campo: "descricao" | "valorUnitario" | "quantidade",
    valor: string
  ) {
    setItensCompra((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  }

  function totalItemCompra(item: ItemCompra) {
    const valor = valorNumero(item.valorUnitario);
    const quantidade = Number(item.quantidade);
    if (Number.isNaN(valor) || Number.isNaN(quantidade)) return 0;
    return valor * quantidade;
  }

  function totalCompraAtual() {
    return itensCompra.reduce((acc, item) => acc + totalItemCompra(item), 0);
  }

  function descricaoResumoCompra() {
    return itensCompra
      .map((item) => item.descricao.trim())
      .filter(Boolean)
      .join(", ");
  }

  async function carregarClientes() {
    try {
      setErro("");

      const res = await fetch("/api/admin/clientes", {
        cache: "no-store",
      });

      if (res.status === 401) {
        setAdminLogado(false);
        setClientes([]);
        setClienteIdSelecionado(null);
        return;
      }

      const data = await getResponseData(res);

      if (!res.ok) {
        throw new Error(data.erro || "Erro ao carregar clientes");
      }

      const lista = (data.clientes ?? []) as Cliente[];
      setClientes(lista);
      setAdminLogado(true);

      if (!clienteIdSelecionado) return;

      const atualizado = lista.find((item) => item.id === clienteIdSelecionado);
      if (atualizado) {
        selecionarCliente(atualizado);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar clientes");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    limparMensagens();

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario,
          senha,
        }),
      });

      const data = await getResponseData(res);

      if (!res.ok) {
        throw new Error(data.erro || "Erro no login");
      }

      setAdminLogado(true);
      setMensagem("Login realizado com sucesso.");
      setSenha("");

      await carregarClientes();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro no login");
    }
  }

  async function handleLogout() {
    limparMensagens();

    try {
      await fetch("/api/admin/login", {
        method: "DELETE",
      });
    } finally {
      setAdminLogado(false);
      setClientes([]);
      setClienteIdSelecionado(null);
      setMensagem("Sessão encerrada.");
    }
  }

  async function handleCriarCliente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    limparMensagens();

    try {
      const res = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: novoNome,
          telefone: novoTelefone,
          cpf: novoCpf,
        }),
      });

      const data = await getResponseData(res);

      if (!res.ok) {
        throw new Error(data.erro || "Erro ao criar cliente");
      }

      setMensagem(data.mensagem || "Cliente criado com sucesso.");
      setNovoNome("");
      setNovoTelefone("");
      setNovoCpf("");

      await carregarClientes();

      if (data.cliente) {
        selecionarCliente(data.cliente);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao criar cliente");
    }
  }

  async function atualizarCliente(body: Record<string, unknown>, successMessage: string) {
    if (!clienteSelecionado) return;

    limparMensagens();

    try {
      const res = await fetch(`/api/admin/clientes/${clienteSelecionado.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await getResponseData(res);

      if (!res.ok) {
        throw new Error(data.erro || "Erro ao atualizar cliente");
      }

      if (data.cliente) {
        setClientes((prev) =>
          prev.map((item) => (item.id === data.cliente.id ? data.cliente : item))
        );
        selecionarCliente(data.cliente);
      }

      setMensagem(data.mensagem || successMessage);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao atualizar cliente");
    }
  }

  async function handleSalvarDadosCliente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    await atualizarCliente(
      {
        tipo: "dados",
        nome: editarNome,
        telefone: editarTelefone,
        cpf: editarCpf,
      },
      "Dados do cliente atualizados."
    );
  }

  async function handleBloqueio() {
    if (!clienteSelecionado) return;

    await atualizarCliente(
      {
        tipo: "status",
        bloqueado: !clienteSelecionado.bloqueado,
      },
      clienteSelecionado.bloqueado
        ? "Cliente liberado com sucesso."
        : "Cliente bloqueado com sucesso."
    );
  }

  async function handleResetPin() {
    if (!clienteSelecionado) return;

    await atualizarCliente(
      {
        tipo: "resetPin",
      },
      "PIN redefinido."
    );
  }

  async function handleAdicionarCompra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const itensValidos = itensCompra.filter(
      (item) =>
        item.descricao.trim() !== "" &&
        valorNumero(item.valorUnitario) > 0 &&
        Number(item.quantidade) > 0
    );

    if (itensValidos.length === 0) {
      setErro("Adicione pelo menos um item válido na compra.");
      return;
    }

    await atualizarCliente(
      {
        tipo: "compra",
        descricao: itensValidos
          .map((item) => item.descricao.trim())
          .join(", "),
        valor: itensValidos.reduce((acc, item) => acc + totalItemCompra(item), 0),
        data: dataCompra || undefined,
      },
      "Compra lançada com sucesso."
    );

    setItensCompra([{ descricao: "", valorUnitario: "", quantidade: "1" }]);
    setDataCompra("");
  }

  async function handleAdicionarPagamento(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    await atualizarCliente(
      {
        tipo: "pagamento",
        valor: Number(valorPagamento.replace(",", ".")),
        data: dataPagamento || undefined,
      },
      "Pagamento lançado com sucesso."
    );

    setValorPagamento("");
    setDataPagamento("");
  }

  async function handleAlterarSenhaAdmin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    limparMensagens();

    try {
      const res = await fetch("/api/admin/senha", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senhaAtual: senhaAtualAdmin,
          novaSenha: novaSenhaAdmin,
        }),
      });

      const data = await getResponseData(res);

      if (!res.ok) {
        throw new Error(data.erro || "Erro ao alterar senha");
      }

      setSenhaAtualAdmin("");
      setNovaSenhaAdmin("");
      setMensagem("Senha do administrador alterada com sucesso.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao alterar senha");
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none text-slate-900 placeholder:text-slate-500";
  const inputClassLg =
    "w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 outline-none text-slate-900 placeholder:text-slate-500";

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          Carregando painel...
        </div>
      </div>
    );
  }

  if (!adminLogado) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Painel do administrador</h1>
            <p className="mt-2 text-slate-600">
              Entre com usuário e senha para gerenciar clientes, fiados e pagamentos.
            </p>
          </div>

          {erro && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {mensagem && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {mensagem}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="mb-2 block text-sm text-slate-700">Usuário</label>
              <input
                className={inputClassLg}
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                placeholder="Digite seu usuário"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-700">Senha</label>
              <input
                type="password"
                className={inputClassLg}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                placeholder="Digite sua senha"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-4 font-medium text-white"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Painel do administrador</h1>
              <p className="mt-2 text-slate-600">
                Cadastro de clientes, lançamentos de compras, pagamentos, bloqueio e troca de senha.
              </p>
            </div>

            {clienteSelecionado ? (
              <button
                onClick={voltarParaLista}
                className="rounded-2xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                Voltar para clientes
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="rounded-2xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                Sair
              </button>
            )}
          </div>
        </header>

        {erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {mensagem}
          </div>
        )}

        {!clienteSelecionado ? (
          <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Novo cliente</h2>
                <p className="mt-1 text-sm text-slate-600">
                  O PIN inicial será os 4 últimos dígitos do telefone e o cliente será obrigado a trocar no primeiro acesso.
                </p>

                <form className="mt-4 space-y-3" onSubmit={handleCriarCliente}>
                  <input
                    className={inputClass}
                    placeholder="Nome completo"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                  />

                  <input
                    className={inputClass}
                    placeholder="Telefone com DDD"
                    inputMode="numeric"
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(onlyDigits(e.target.value).slice(0, 11))}
                  />

                  <input
                    className={inputClass}
                    placeholder="CPF (opcional)"
                    value={novoCpf}
                    onChange={(e) => setNovoCpf(e.target.value)}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white"
                  >
                    Cadastrar cliente
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Senha do administrador</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Usuário atual: <span className="font-semibold">admconveniencia</span>
                </p>

                <form className="mt-4 space-y-3" onSubmit={handleAlterarSenhaAdmin}>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Senha atual"
                    value={senhaAtualAdmin}
                    onChange={(e) => setSenhaAtualAdmin(e.target.value)}
                  />

                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Nova senha"
                    value={novaSenhaAdmin}
                    onChange={(e) => setNovaSenhaAdmin(e.target.value)}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white"
                  >
                    Alterar senha
                  </button>
                </form>
              </div>
            </aside>

            <main className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>

              <input
                className={`${inputClass} mt-4`}
                placeholder="Pesquisar por nome, telefone ou CPF"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />

              <div className="mt-5 space-y-4">
                {clientesFiltrados.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Nenhum cliente encontrado.
                  </div>
                )}

                {clientesFiltrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => selecionarCliente(cliente)}
                    className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl font-bold text-slate-900">{cliente.nome}</div>
                        <div className="mt-1 text-slate-600">{cliente.telefone}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-slate-500">Em aberto</div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">
                          {brl(totalAberto(cliente))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </main>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{clienteSelecionado.nome}</h2>
                  <p className="mt-2 text-slate-600">{clienteSelecionado.telefone}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-sm text-slate-600">Compras</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {brl(totalCompras(clienteSelecionado))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-sm text-slate-600">Pagamentos</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {brl(totalPagamentos(clienteSelecionado))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-sm text-slate-600">Em aberto</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {brl(totalAberto(clienteSelecionado))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-sm text-slate-600">Status</div>
                    <div
                      className={
                        clienteSelecionado.bloqueado
                          ? "mt-1 font-semibold text-red-700"
                          : "mt-1 font-semibold text-emerald-700"
                      }
                    >
                      {clienteSelecionado.bloqueado ? "Bloqueado" : "Liberado"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={handleBloqueio}
                  className={[
                    "rounded-2xl px-4 py-3 font-medium text-white",
                    clienteSelecionado.bloqueado ? "bg-emerald-600" : "bg-red-600",
                  ].join(" ")}
                >
                  {clienteSelecionado.bloqueado ? "Desbloquear cliente" : "Bloquear cliente"}
                </button>

                <button
                  onClick={handleResetPin}
                  className="rounded-2xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Resetar PIN para os 4 últimos dígitos
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Editar cadastro</h3>

                <form className="mt-4 space-y-3" onSubmit={handleSalvarDadosCliente}>
                  <input
                    className={inputClass}
                    placeholder="Nome"
                    value={editarNome}
                    onChange={(e) => setEditarNome(e.target.value)}
                  />

                  <input
                    className={inputClass}
                    placeholder="Telefone"
                    inputMode="numeric"
                    value={editarTelefone}
                    onChange={(e) => setEditarTelefone(onlyDigits(e.target.value).slice(0, 11))}
                  />

                  <input
                    className={inputClass}
                    placeholder="CPF"
                    value={editarCpf}
                    onChange={(e) => setEditarCpf(e.target.value)}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white"
                  >
                    Salvar dados
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-slate-900">Lançar compra</h3>

                  <button
                    type="button"
                    onClick={adicionarItemCompra}
                    className="rounded-2xl border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    + Adicionar item
                  </button>
                </div>

                <form className="mt-4 space-y-4" onSubmit={handleAdicionarCompra}>
                  {itensCompra.map((item, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">Item {index + 1}</div>

                        {itensCompra.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removerItemCompra(index)}
                            className="rounded-xl border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3">
                        <input
                          className={inputClass}
                          placeholder="Descrição do produto"
                          value={item.descricao}
                          onChange={(e) =>
                            atualizarItemCompra(index, "descricao", e.target.value)
                          }
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            className={inputClass}
                            placeholder="Valor unitário"
                            inputMode="decimal"
                            value={item.valorUnitario}
                            onChange={(e) =>
                              atualizarItemCompra(index, "valorUnitario", e.target.value)
                            }
                          />

                          <input
                            className={inputClass}
                            placeholder="Quantidade"
                            inputMode="numeric"
                            value={item.quantidade}
                            onChange={(e) =>
                              atualizarItemCompra(
                                index,
                                "quantidade",
                                onlyDigits(e.target.value) || ""
                              )
                            }
                          />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <span className="font-medium">Total do item:</span>{" "}
                          {brl(totalItemCompra(item))}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm text-slate-600">Resumo que o cliente verá</div>
                    <div className="mt-2 font-medium text-slate-900">
                      {descricaoResumoCompra() || "Nenhum item informado"}
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900">
                      Total da compra: {brl(totalCompraAtual())}
                    </div>
                  </div>

                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={dataCompra}
                    onChange={(e) => setDataCompra(e.target.value)}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white"
                  >
                    Salvar compra
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Lançar pagamento</h3>

                <form className="mt-4 space-y-3" onSubmit={handleAdicionarPagamento}>
                  <input
                    className={inputClass}
                    placeholder="Valor do pagamento"
                    inputMode="decimal"
                    value={valorPagamento}
                    onChange={(e) => setValorPagamento(e.target.value)}
                  />

                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-medium text-white"
                  >
                    Salvar pagamento
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Configuração do primeiro acesso</h3>
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <div>
                    <span className="font-semibold">PIN atual:</span>{" "}
                    {pinMascarado(clienteSelecionado.pin)}
                  </div>
                  <div className="mt-2">
                    <span className="font-semibold">Primeiro acesso:</span>{" "}
                    {clienteSelecionado.primeiroAcesso ? "Sim" : "Não"}
                  </div>
                  <div className="mt-2 text-slate-600">
                    Quando o PIN for resetado, o cliente será obrigado a trocar a senha no próximo login.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Compras</h3>

                <div className="mt-4 space-y-3">
                  {clienteSelecionado.compras.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Nenhuma compra lançada.
                    </div>
                  )}

                  {clienteSelecionado.compras.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">{item.descricao}</div>
                          <div className="mt-1 text-sm text-slate-600">{formatDate(item.data)}</div>
                        </div>
                        <div className="font-semibold text-slate-900">{brl(item.valor)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Pagamentos</h3>

                <div className="mt-4 space-y-3">
                  {clienteSelecionado.pagamentos.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Nenhum pagamento lançado.
                    </div>
                  )}

                  {clienteSelecionado.pagamentos.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-emerald-800">Pagamento recebido</div>
                          <div className="mt-1 text-sm text-emerald-700">{formatDate(item.data)}</div>
                        </div>
                        <div className="font-semibold text-emerald-800">{brl(item.valor)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}