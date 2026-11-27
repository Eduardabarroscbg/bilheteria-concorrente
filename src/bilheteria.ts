import { DadosInvalidosErro, NaoEncontradoErro, PagamentoErro, type Evento } from "./dominio.ts";
import { calcularTotal, montarIngressos } from "./preco.ts";
import { direitoAMeia } from "./regras.ts";
import type { Comprovante, ConfigBilheteria, EventoInfo, Pedido } from "./tipos.ts";

// O Promise.race devolve quem terminar primeiro: a cobrança ou o relógio.
function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error("tempo esgotado")), ms);
  });
  // O finally desliga o relógio quando a cobrança termina antes.
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

export class Bilheteria {
  #eventos: Evento[];
  #pagar: ConfigBilheteria["pagar"];
  #limitePagamentoMs: number;
  #proximoReservaId = 1;

  constructor(config: ConfigBilheteria) {
    this.#eventos = config.eventos;
    this.#pagar = config.pagar;
    this.#limitePagamentoMs = config.limitePagamentoMs;
  }

  listarEventos(): EventoInfo[] {
    return this.#eventos.map((evento) => evento.info());
  }

  async reservar(pedido: Pedido): Promise<Comprovante> {
    if (!pedido?.ingressos || pedido.ingressos.length === 0) {
      throw new DadosInvalidosErro("pedido sem ingressos");
    }

    const evento = this.#eventos.find((item) => item.id === pedido.eventoId);
    if (!evento) {
      throw new NaoEncontradoErro("evento não encontrado");
    }

    const poltronas = pedido.ingressos.map((pessoa) => pessoa.poltrona);
    // Marca antes do await: enquanto este pedido espera o pagamento,
    // outro pedido da mesma poltrona já encontra a cadeira ocupada.
    evento.reservar(poltronas);

    const ingressos = montarIngressos(evento.preco, pedido.ingressos, direitoAMeia);
    const total = calcularTotal(ingressos);

    try {
      await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs);
    } catch {
      evento.liberar(poltronas);
      throw new PagamentoErro("pagamento não aprovado");
    }

    const reservaId = this.#proximoReservaId;
    this.#proximoReservaId += 1;

    return {
      reservaId,
      eventoId: pedido.eventoId,
      ingressos,
      total,
    };
  }
}

export function criarBilheteria(config: ConfigBilheteria): Bilheteria {
  return new Bilheteria(config);
}