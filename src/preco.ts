import type { Ingresso, Pessoa, TipoIngresso } from "./tipos.ts";

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

// Fábrica: fecha o preço base e devolve o valor conforme o tipo do ingresso.
export const valorDoIngresso =
  (precoBase: number) =>
  (tipo: TipoIngresso): number =>
    tipo === "meia" ? arredondar(precoBase / 2) : precoBase;

// Fábrica: fecha o percentual e devolve o valor já com a taxa, em 2 casas.
export const aplicarTaxa =
  (percentual: number) =>
  (valor: number): number =>
    arredondar(valor * (1 + percentual));

export const montarIngressos = (
  precoBase: number,
  pessoas: readonly Pessoa[],
  temDireitoAMeia: (pessoa: Pessoa) => boolean,
): Ingresso[] => {
  const valorDe = valorDoIngresso(precoBase);
  return pessoas.map((pessoa) => {
    const tipo: TipoIngresso = temDireitoAMeia(pessoa) ? "meia" : "inteira";
    return {
      nome: pessoa.nome,
      poltrona: pessoa.poltrona,
      tipo,
      valor: valorDe(tipo),
    };
  });
};

export const calcularTotal = (ingressos: readonly Ingresso[]): number =>
  aplicarTaxa(0.1)(ingressos.reduce((soma, ingresso) => soma + ingresso.valor, 0));