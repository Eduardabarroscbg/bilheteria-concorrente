import { criarBilheteria } from "./bilheteria.ts";
import { Evento } from "./dominio.ts";
import { criarPagamentoFalso } from "./pagamento.ts";
import { criarServidor } from "./servidor.ts";

const eventos = [
  new Evento(1, "Show principal", 100, 100),
  new Evento(2, "Peça de teatro", 80, 40),
  new Evento(3, "Stand-up", 60, 30),
];

const pagar = criarPagamentoFalso({ latenciaMs: 80, taxaDeFalha: 0.1 });
const bilheteria = criarBilheteria({
  eventos,
  pagar,
  limitePagamentoMs: 500,
});

criarServidor(bilheteria).listen(3000, () => {
  console.log("Bilheteria em http://localhost:3000");
});