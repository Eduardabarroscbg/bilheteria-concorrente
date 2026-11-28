# Bilheteria concorrente

Projeto final de Paradigmas de Linguagens de Programação. Enunciado completo no Blackboard.

Os arquivos de `src/` que vocês escrevem já existem, vazios; o `tipos.ts` e o `servidor.ts` vêm prontos. O que vai em cada um está no passo
indicado do enunciado:

| Arquivo                                    | Passo do enunciado                      |
| :----------------------------------------- | :-------------------------------------- |
| `src/tipos.ts` (pronto)                    | 1: os tipos                             |
| `src/regras.ts`                            | 2: meia-entrada                         |
| `src/preco.ts`                             | 3: preço (funcional)                    |
| `src/dominio.ts`                           | 4: evento e erros (orientado a objetos) |
| `src/bilheteria.ts`                        | 5: a venda, onde a concorrência aparece |
| `src/servidor.ts` (pronto) e `src/main.ts` | 6: ligar o servidor                     |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`: a correção usa os originais.

Para começar, sigam o `GUIA.md`. Depois dele, os comandos são:

```bash
npm install
npm test          # correção automática: mostra os pontos
npm start         # serviço em http://localhost:3000
npm run bench     # com o serviço no ar: 200 pedidos simultâneos no evento 1, dois por poltrona
```

Exemplo de pedido:

```bash
curl -X POST localhost:3000/reservas -H 'Content-Type: application/json' \
  -d '{"eventoId":1,"ingressos":[{"nome":"Ana","idade":20,"estudante":true,"pcd":false,"poltrona":7}]}'
```

---

## Preencham (avaliado no vídeo)

**Link do vídeo:**

### Integrantes

| Nome | Usuário do GitHub |  
| Maria Eduarda da Costa Barros Gonçalves | Eduardabarroscbg |

### Decisões

1. **Concorrência.** Como vocês garantem que duas pessoas não ficam com a mesma poltrona? Onde estava o
   `await` perigoso?

   A venda marca as poltronas em `evento.reservar` antes de qualquer `await`. No Node, cada `reservar` corre até o primeiro `await` sem ser interrompido, então a checagem e a marcação da poltrona acontecem juntas. O `await` perigoso é o da operadora, em `comTempoLimite(this.#pagar(total), ...)`. Se a poltrona só fosse marcada depois desse `await`, dois pedidos da mesma cadeira passariam os dois na cobrança e os dois receberiam o ingresso. Do jeito que está, o segundo pedido encontra a poltrona já vendida, recebe `PoltronaOcupadaErro` (409) e não é cobrado. Se o pagamento falha ou estoura o tempo, `evento.liberar` devolve as poltronas e o cliente recebe `PagamentoErro` (502).

2. **OO.** O que o `Evento` esconde e por quê? Por que o `reservar` é tudo ou nada? Por que os erros são uma hierarquia de classes?

   O `Evento` esconde a lista `#vendidas`. Quem está fora lê `disponivel` (um getter) e chama `reservar`, `liberar` e `info`, mas não consegue acrescentar ou apagar poltrona na lista. Isso impede uma venda furar a regra e marcar cadeira sem passar pela validação. O `reservar` é tudo ou nada porque um pedido é de uma família: ou todas as poltronas da lista são marcadas, ou nenhuma. A conferência (lista vazia, fora da capacidade, repetida, já vendida) acontece antes de qualquer `push`. Os erros herdam de `ErroDeNegocio`, que guarda o `status` HTTP. Cada filha só recebe a mensagem e fixa o seu código (`400`, `404`, `409`, `502`). O servidor trata qualquer `ErroDeNegocio` com `erro.status`, sem um `if` por tipo de falha.

3. **Funcional.** O que ganhamos com `preco.ts` puro? Como vocês testariam ele sem subir o servidor?

   `valorDoIngresso` e `aplicarTaxa` são fábricas: recebem o preço ou o percentual e devolvem uma função. `montarIngressos` usa `map` e `calcularTotal` usa `reduce` e chama `aplicarTaxa(0.1)`. Nenhuma delas altera a lista recebida nem depende de evento, pagamento ou servidor. A mesma entrada produz a mesma saída, e o teste pode trocar a regra da meia passando outra função. Dá para testar no próprio Node, sem HTTP: `valorDoIngresso(80)("meia")` vale `40`, `aplicarTaxa(0.1)(100)` vale `110`, e `calcularTotal` de ingressos de `50` e `100` vale `165`.

4. **Se fosse em outro paradigma.** Escolham uma das partes e expliquem como ficaria em outro
   paradigma, e se ficaria melhor ou pior.

   O preço, se fosse orientado a objetos, viraria uma classe `CalculadoraDePreco` com o preço base no construtor e métodos `valor` e `total`. Funcionaria, mas a regra da meia ficaria presa na classe, ou exigiria uma estratégia injetada só para o teste trocar o critério. Nas funções puras essa troca é o terceiro argumento de `montarIngressos`. Para esta parte o funcional fica melhor: não há estado para proteger, e o cálculo se lê como uma transformação da lista de pessoas em ingressos e depois num total.

5. **Concorrente × paralelo.** O Node roda o JavaScript numa linha só: os pedidos de vocês são
   concorrentes, não paralelos. O que mudaria se a venda rodasse em vários núcleos ao mesmo tempo?

   Hoje os pedidos se intercalam nos `await`: enquanto um espera a operadora, o processo atende o outro, mas só um trecho de JavaScript roda por vez. Por isso a marcação da poltrona, que é síncrona, não precisa de trava. Em vários núcleos, dois núcleos poderiam ler a mesma poltrona livre ao mesmo tempo e os dois vender. A lista `#vendidas` precisaria de uma trava (ou de uma operação atômica) em volta do `reservar` e do `liberar`. O ganho seria pequeno neste problema, porque o tempo está na espera da operadora, que o processo único já sobrepõe. O custo seria a corrida e o risco de esquecer a trava.

### Resultados do bench

| Cenário            | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :----------------- | ------: | ---------: | -------: | ---------------: | -----------------: |
| Padrão (`main.ts`) |     200 |        225 |       94 |              100 |                  6 |

O bench ocupa as poltronas do evento 1: para rodar de novo, parem o `npm start` (Ctrl+C) e subam outra
vez.

O que os números mostram:

O evento 1 tem 100 poltronas e o bench manda 200 pedidos, dois para cada poltrona. Os 100 de status 409 são o segundo pedido de cada cadeira: a poltrona já tinha sido marcada pelo primeiro, antes do pagamento. Os 94 de status 201 são vendas aprovadas. Os 6 de status 502 são a operadora falsa recusando a cobrança (a taxa configurada é 10%, então o número oscila em torno de 10). Essas 6 poltronas voltaram para a venda: depois do bench, `disponivel` do evento 1 ficou em 6. Ninguém foi cobrado por uma poltrona que já tinha dono, e a abertura inteira levou 225 ms porque os pagamentos esperam juntos, não um atrás do outro.