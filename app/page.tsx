"use client";

import { useMemo, useState } from "react";

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
  cpf?: string | null;
  bloqueado: boolean;
  primeiroAcesso: boolean;
  compras: Compra[];
  pagamentos: Pagamento[];
};

type MesAgrupado = {
  chave: string;
  titulo: string;
  compras: Compra[];
  pagamentos: Pagamento[];
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function phoneDigits(value: string) {
  return onlyDigits(value).slice(0, 11);
}

function codeDigits(value: string) {
  return onlyDigits(value).slice(0, 4);
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

function formatMonthYear(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function monthKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function totalCompras(cliente: Cliente | null) {
  if (!cliente) return 0;
  return cliente.compras.reduce((acc, item) => acc + item.valor, 0);
}

function totalPagamentos(cliente: Cliente | null) {
  if (!cliente) return 0;
  return cliente.pagamentos.reduce((acc, item) => acc + item.valor, 0);
}

function totalAberto(cliente: Cliente | null) {
  return Math.max(totalCompras(cliente) - totalPagamentos(cliente), 0);
}

function totalMesCompras(mes: MesAgrupado) {
  return mes.compras.reduce((acc, item) => acc + item.valor, 0);
}

function totalMesPagamentos(mes: MesAgrupado) {
  return mes.pagamentos.reduce((acc, item) => acc + item.valor, 0);
}

function totalMesAberto(mes: MesAgrupado) {
  return Math.max(totalMesCompras(mes) - totalMesPagamentos(mes), 0);
}

function agruparPorMes(cliente: Cliente | null): MesAgrupado[] {
  if (!cliente) return [];

  const mapa = new Map<string, MesAgrupado>();

  for (const compra of cliente.compras) {
    const chave = monthKey(compra.data);

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        titulo: formatMonthYear(compra.data),
        compras: [],
        pagamentos: [],
      });
    }

    mapa.get(chave)!.compras.push(compra);
  }

  for (const pagamento of cliente.pagamentos) {
    const chave = monthKey(pagamento.data);

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        titulo: formatMonthYear(pagamento.data),
        compras: [],
        pagamentos: [],
      });
    }

    mapa.get(chave)!.pagamentos.push(pagamento);
  }

  return Array.from(mapa.values())
    .sort((a, b) => b.chave.localeCompare(a.chave))
    .map((mes) => ({
      ...mes,
      compras: [...mes.compras].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      ),
      pagamentos: [...mes.pagamentos].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      ),
    }));
}

async function getResponseData(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

function MonthCard({ mes }: { mes: MesAgrupado }) {
  const comprasTotal = totalMesCompras(mes);
  const pagamentosTotal = totalMesPagamentos(mes);
  const abertoTotal = totalMesAberto(mes);

  return (
    <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <summary className="list-none cursor-pointer">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold capitalize text-slate-900">{mes.titulo}</h2>
            <p className="mt-1 text-slate-600">
              Compras, pagamentos e saldo do mês.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-100 p-4">
              <div className="text-sm text-slate-600">Compras</div>
              <div className="mt-1 font-semibold text-slate-900">{brl(comprasTotal)}</div>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <div className="text-sm text-slate-600">Pagamentos</div>
              <div className="mt-1 font-semibold text-slate-900">{brl(pagamentosTotal)}</div>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <div className="text-sm text-slate-600">Saldo do mês</div>
              <div
                className={
                  abertoTotal > 0
                    ? "mt-1 font-semibold text-red-700"
                    : "mt-1 font-semibold text-emerald-700"
                }
              >
                {brl(abertoTotal)}
              </div>
            </div>
          </div>
        </div>
      </summary>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xl font-bold text-slate-900">Compras</h3>

          <div className="space-y-3">
            {mes.compras.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma compra neste mês.
              </div>
            )}

            {mes.compras.map((item) => (
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

        <div>
          <h3 className="mb-3 text-xl font-bold text-slate-900">Pagamentos</h3>

          <div className="space-y-3">
            {mes.pagamentos.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhum pagamento neste mês.
              </div>
            )}

            {mes.pagamentos.map((item) => (
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
    </details>
  );
}

export default function Home() {
  const [etapa, setEtapa] = useState<"telefone" | "codigo" | "trocar-pin" | "extrato" | "bloqueado">("telefone");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [confirmarNovoPin, setConfirmarNovoPin] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [clienteLogado, setClienteLogado] = useState<Cliente | null>(null);

  const mesesAgrupados = useMemo(() => agruparPorMes(clienteLogado), [clienteLogado]);

  const podeAvancarTelefone = telefone.length === 11;
  const podeConfirmarCodigo = codigo.length === 4 && !carregando;
  const podeTrocarPin =
    novoPin.length === 4 &&
    confirmarNovoPin.length === 4 &&
    novoPin === confirmarNovoPin &&
    !carregando;

  async function handleLogin() {
    if (!podeConfirmarCodigo) return;

    try {
      setErro("");
      setMensagem("");
      setCarregando(true);

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefone,
          pin: codigo,
        }),
      });

      const data = await getResponseData(res);

      if (!res.ok) {
        throw new Error(data.erro || "Erro ao entrar");
      }

      const cliente = data.cliente as Cliente;

      setClienteLogado(cliente);

      if (cliente.primeiroAcesso) {
        setEtapa("trocar-pin");
        return;
      }

      setEtapa(cliente.bloqueado ? "bloqueado" : "extrato");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao entrar");
    } finally {
      setCarregando(false);
    }
  }

  async function handleTrocarPin() {
    if (!podeTrocarPin) return;

    try {
      setErro("");
      setMensagem("");
      setCarregando(true);

      const res = await fetch("/api/trocar-pin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefone,
          pinAtual: codigo,
          novoPin,
        }),
      });

      const data = await getResponseData(res);

      if (!res.ok) {
        throw new Error(data.erro || "Erro ao trocar PIN");
      }

      const cliente = data.cliente as Cliente;
      setClienteLogado(cliente);
      setMensagem("PIN alterado com sucesso.");
      setEtapa(cliente.bloqueado ? "bloqueado" : "extrato");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao trocar PIN");
    } finally {
      setCarregando(false);
    }
  }

  function sair() {
    setTelefone("");
    setCodigo("");
    setNovoPin("");
    setConfirmarNovoPin("");
    setErro("");
    setMensagem("");
    setClienteLogado(null);
    setEtapa("telefone");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-6">
      <div className="mx-auto max-w-5xl">
        {(etapa === "telefone" || etapa === "codigo" || etapa === "trocar-pin") && (
          <section className="mx-auto mt-8 max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold">Área do cliente</h1>
              <p className="mt-2 text-slate-600">
                Consulte seu fiado com segurança usando telefone e código.
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

            {etapa === "telefone" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Telefone com DDD
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-lg outline-none text-slate-900 placeholder:text-slate-500"
                    placeholder="Ex.: 62999991234"
                    value={telefone}
                    onChange={(e) => {
                      setTelefone(phoneDigits(e.target.value));
                      setErro("");
                    }}
                    inputMode="numeric"
                  />
                </div>

                <button
                  disabled={!podeAvancarTelefone}
                  onClick={() => {
                    setCodigo("");
                    setErro("");
                    setEtapa("codigo");
                  }}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-4 font-medium text-white disabled:opacity-40"
                >
                  Continuar
                </button>
              </div>
            )}

            {etapa === "codigo" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Número informado:{" "}
                  <span className="font-semibold text-slate-900">{telefone}</span>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Código de 4 dígitos
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none text-slate-900 placeholder:text-slate-500"
                    placeholder="0000"
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(codeDigits(e.target.value));
                      setErro("");
                    }}
                    inputMode="numeric"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setErro("");
                      setEtapa("telefone");
                    }}
                    className="rounded-2xl border border-slate-300 px-4 py-4 font-medium"
                  >
                    Voltar
                  </button>

                  <button
                    disabled={!podeConfirmarCodigo}
                    onClick={handleLogin}
                    className="rounded-2xl bg-slate-900 px-4 py-4 font-medium text-white disabled:opacity-40"
                  >
                    {carregando ? "Entrando..." : "Entrar"}
                  </button>
                </div>
              </div>
            )}

            {etapa === "trocar-pin" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No seu primeiro acesso, é obrigatório criar um novo PIN.
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Novo PIN de 4 dígitos
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none text-slate-900 placeholder:text-slate-500"
                    placeholder="0000"
                    value={novoPin}
                    onChange={(e) => {
                      setNovoPin(codeDigits(e.target.value));
                      setErro("");
                    }}
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Confirmar novo PIN
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none text-slate-900 placeholder:text-slate-500"
                    placeholder="0000"
                    value={confirmarNovoPin}
                    onChange={(e) => {
                      setConfirmarNovoPin(codeDigits(e.target.value));
                      setErro("");
                    }}
                    inputMode="numeric"
                  />
                </div>

                <button
                  disabled={!podeTrocarPin}
                  onClick={handleTrocarPin}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-4 font-medium text-white disabled:opacity-40"
                >
                  {carregando ? "Salvando..." : "Salvar novo PIN"}
                </button>
              </div>
            )}
          </section>
        )}

        {etapa === "extrato" && clienteLogado && (
          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Meu fiado</h1>
                <p className="mt-2 text-slate-600">
                  Consulte aqui suas compras, pagamentos e saldo em aberto.
                </p>
              </div>

              <button
                onClick={sair}
                className="rounded-2xl border border-slate-300 px-4 py-3 font-medium"
              >
                Sair
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold">{clienteLogado.nome}</div>
                  <div className="mt-1 text-slate-600">{clienteLogado.telefone}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-slate-500">Total em aberto</div>
                  <div
                    className={
                      totalAberto(clienteLogado) > 0
                        ? "text-3xl font-bold text-red-700"
                        : "text-3xl font-bold text-emerald-700"
                    }
                  >
                    {brl(totalAberto(clienteLogado))}
                  </div>
                </div>
              </div>
            </div>

            {mesesAgrupados.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div className="space-y-5">
                {mesesAgrupados.map((mes) => (
                  <MonthCard key={mes.chave} mes={mes} />
                ))}
              </div>
            )}
          </section>
        )}

        {etapa === "bloqueado" && clienteLogado && (
          <section className="space-y-5 rounded-3xl border border-red-200 bg-white p-6 shadow-sm md:p-8">
            <div className="text-center">
              <div className="mb-4 inline-flex rounded-full bg-red-100 px-4 py-2 font-medium text-red-700">
                Cadastro bloqueado
              </div>
              <h1 className="text-3xl font-bold">{clienteLogado.nome}</h1>
              <p className="mx-auto mt-3 max-w-xl text-slate-600">
                Seu cadastro está temporariamente bloqueado. Para mais informações,
                fale com o comércio.
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-red-700">Status</div>
                  <div className="mt-1 text-xl font-bold text-red-700">
                    Bloqueado
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-red-700">Saldo devedor</div>
                  <div className="text-3xl font-bold text-red-700">
                    {brl(totalAberto(clienteLogado))}
                  </div>
                </div>
              </div>
            </div>

            {mesesAgrupados.length === 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div className="space-y-5">
                {mesesAgrupados.map((mes) => (
                  <MonthCard key={mes.chave} mes={mes} />
                ))}
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={sair}
                className="rounded-2xl border border-slate-300 px-4 py-3 font-medium"
              >
                Sair
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}