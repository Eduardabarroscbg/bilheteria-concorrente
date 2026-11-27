export abstract class ErroDeNegocio extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

export class DadosInvalidosErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 400);
  }
}

export class NaoEncontradoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 404);
  }
}

export class PoltronaOcupadaErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 409);
  }
}

export class PagamentoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 502);
  }
}

// O evento guarda as poltronas vendidas num campo privado.
// Quem está fora lê `disponivel`, mas não altera a lista.
export class Evento {
  readonly id: number;
  readonly nome: string;
  readonly preco: number;
  readonly capacidade: number;
  #vendidas: number[] = [];

  constructor(id: number, nome: string, preco: number, capacidade: number) {
    this.id = id;
    this.nome = nome;
    this.preco = preco;
    this.capacidade = capacidade;
  }

  get disponivel(): number {
    return this.capacidade - this.#vendidas.length;
  }

  reservar(poltronas: number[]): void {
    if (poltronas.length === 0) {
      throw new DadosInvalidosErro("pedido sem poltronas");
    }

    const vistas = new Set<number>();
    for (const poltrona of poltronas) {
      if (!Number.isInteger(poltrona) || poltrona < 1 || poltrona > this.capacidade || vistas.has(poltrona)) {
        throw new DadosInvalidosErro("poltrona inválida");
      }
      vistas.add(poltrona);
    }

    for (const poltrona of poltronas) {
      if (this.#vendidas.includes(poltrona)) {
        throw new PoltronaOcupadaErro("poltrona já vendida");
      }
    }

    for (const poltrona of poltronas) {
      this.#vendidas.push(poltrona);
    }
  }

  liberar(poltronas: number[]): void {
    for (const poltrona of poltronas) {
      if (!this.#vendidas.includes(poltrona)) {
        throw new DadosInvalidosErro("poltrona não estava vendida");
      }
    }
    this.#vendidas = this.#vendidas.filter((poltrona) => !poltronas.includes(poltrona));
  }

  info() {
    return {
      id: this.id,
      nome: this.nome,
      preco: this.preco,
      capacidade: this.capacidade,
      disponivel: this.disponivel,
    };
  }
}