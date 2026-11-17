# Loja QA + Toolshop: automação de testes E2E com Playwright e TypeScript

Atividade Avaliativa Prática: **Banca ao Vivo de Testes E2E & API**
Disciplina: Teste de Software com Playwright · Prof. Alison Melo · Turma FAP 2026 · Aponti

| | |
|---|---|
| **Módulo sorteado** | 01: Catálogo & Busca em Tempo Real (Loja QA) |
| **Integrantes** | [Nome do integrante A] (testes E2E) · [Nome do integrante B] (testes de API) |
| **Apresentação** | 17/11/2026, 08h30 |
| **Stack** | Playwright · TypeScript · Page Object Model · Fixtures |

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Sites sob teste](#2-sites-sob-teste)
3. [Estrutura do repositório](#3-estrutura-do-repositório)
4. [Como executar](#4-como-executar)
5. [Arquitetura e boas práticas](#5-arquitetura-e-boas-práticas)
6. [Casos de teste E2E](#6-casos-de-teste-e2e)
7. [Erros encontrados](#7-erros-encontrados)
8. [Resultados](#8-resultados)
9. [Testes de API](#9-testes-de-api)
10. [Lições aprendidas](#10-lições-aprendidas)

---

## 1. Visão geral

O repositório reúne a automação apresentada na banca:

- **Testes E2E do módulo 01 da Loja QA** (interface gráfica, sem login ou cadastro): 13 casos de teste, que viram 15 testes no relatório porque a busca sem resultado é data-driven.
- **1 caso de teste E2E em um site de mercado** (Toolshop): compra completa, do login à fatura.
- **Testes de API** da Loja QA e de um serviço externo (ver [seção 9](#9-testes-de-api)).

As regras da banca foram seguidas: o módulo de Login não é foco de nenhum teste da Loja QA, os E2E rodam com `--headed`, o Page Object não tem `expect` e não há `waitForTimeout`.

---

## 2. Sites sob teste

### 2.1 Loja QA: módulo 01, Catálogo & Busca em Tempo Real

| | |
|---|---|
| **Vitrine** | https://alisonmelo.github.io/tioalison-pe-t4-fap26/projetos-base/01-sistema-login/loja.html |
| **API consumida** | `https://api-qa-fap2026.onrender.com/api` (hospedada no Render; o primeiro acesso pode demorar) |
| **Arquivos do site** | `loja.html` e `loja.js` |

**O que a vitrine faz** (conforme o código de `loja.js`):

- **Busca:** o campo "Buscar" (nome, categoria ou ID do produto) dispara `GET /products?search=...` a cada digitação. O texto é aparado com `trim()` antes de ser enviado.
- **Filtro de categoria:** a lista é carregada de `GET /products/categories`; escolher uma categoria envia `category=...`.
- **Preço máximo:** campo numérico que envia `maxPrice=...`. O front-end filtra de novo a lista recebida em `renderProducts`.
- **Resumo:** exibe `N produto(s) encontrado(s)` (ou `Carregando...` na primeira carga).
- **Estados da grade:** `Carregando vitrine...` durante cada consulta; `Nenhum produto encontrado para os filtros atuais.` quando a lista vem vazia; `A vitrine está temporariamente indisponível.` se a API falhar.
- **Card de produto:** imagem (ou "TECH"), selo com o ID (`PRD-xxxxx`), categoria, loja do vendedor, nome, código, descrição, preço em R$, estoque e o botão "Adicionar ao carrinho" ("Fora de estoque" quando acaba). Visitantes sem login veem o botão de compra; lojistas e administradores veem apenas o modo de visualização.

**Escopo do módulo na atividade:** busca com debounce, cards com preços e loja, e mensagem de busca vazia (empty state). Escopo de API: `GET /api/products?search=Teclado`, validando busca parcial.

### 2.2 Toolshop: site de mercado (desafio extra)

| | |
|---|---|
| **Site** | https://practicesoftwaretesting.com (Practice Software Testing, Toolshop) |
| **O que é** | Loja de ferramentas de demonstração, criada para treinar teste de software e automação (Angular) |
| **Conta usada** | Conta pública de demonstração do próprio site: `customer@practicesoftwaretesting.com` / `welcome01` |

**Fluxo automatizado:** login → busca por "Combination Pliers" → página do produto → carrinho → login confirmado e endereço de cobrança → pagamento com cartão de crédito → confirmação do pedido com número da fatura (`INV-...`).

---

## 3. Estrutura do repositório

```
lojaqa-automacao-banca/
├── pages/
│   └── modulo-1-page.ts              # Page Object do módulo 1 (SEM expect)
├── fixtures/
│   └── auth.fixture.ts               # Fixture catalogoPage: abre e aguarda a vitrine
├── tests/
│   └── e2e/
│       ├── lojaqa-modulo-1.spec.ts   # 13 CTs E2E da Loja QA (15 testes)
│       └── externo-e2e.spec.ts       # 1 CT E2E no Toolshop
├── presentation/
│   └── apresentacao-slides.pdf
├── playwright.config.ts
├── package.json
└── README.md
```

---

## 4. Como executar

Pré-requisito: Node.js (versão LTS).

```bash
npm install
npx playwright install
```

| O que rodar | Comando |
|---|---|
| E2E da Loja QA, com o navegador à vista | `npx playwright test tests/e2e/lojaqa-modulo-1.spec.ts --headed` |
| E2E do Toolshop, com o navegador à vista | `npx playwright test tests/e2e/externo-e2e.spec.ts --headed` |
| Todos os E2E | `npx playwright test tests/e2e` |
| Só alguns casos (por ID) | `npx playwright test tests/e2e/lojaqa-modulo-1.spec.ts --headed -g "CT-E2E-(03\|06a\|10\|13)"` |
| Abrir o relatório HTML | `npx playwright show-report` |

Para deixar as ações mais lentas e fáceis de acompanhar na apresentação, defina `SLOW_MO` (em milissegundos):

```bash
# macOS / Linux / Git Bash
SLOW_MO=300 npx playwright test tests/e2e/lojaqa-modulo-1.spec.ts --headed

# PowerShell
$env:SLOW_MO=300; npx playwright test tests/e2e/lojaqa-modulo-1.spec.ts --headed
```

> A API da Loja QA fica no Render e pode levar até cerca de 1 minuto para "acordar" no primeiro acesso. Abra a vitrine no navegador alguns minutos antes de rodar os testes.

---

## 5. Arquitetura e boas práticas

- **Page Object sem asserções.** `CatalogoPage` só tem localizadores, ações (`buscar`, `filtrarPorCategoria`, `limitarPreco`, `limparFiltros`) e leituras (`obterNomes`, `obterPrecos`, `obterCategoriasDosCards`, `obterLojasDosCards`). Quem confere o resultado é o teste.
- **Fixture do catálogo.** `catalogoPage` entrega a vitrine aberta e carregada, e confere que há ao menos um produto; se a API estiver fora do ar, o erro aponta para o ambiente e não para o teste. Não existe fixture de sessão porque a vitrine é pública e o módulo de Login é proibido nesta banca.
- **Seletores semânticos.** `getByRole` (`searchbox`, `combobox`, `spinbutton`, `article`, `heading`), `getByText` e `getByTitle`. Só a categoria do card usa CSS (`.product-category`), porque o HTML não oferece role nem texto fixo. No Toolshop, `getByTestId` com `testIdAttribute: 'data-test'` e `getByRole` nas telas em que o nome acessível é confiável.
- **Sem `waitForTimeout`.** A espera é por estado: `aguardarCatalogo()` aguarda o texto "Carregando vitrine..." sair do DOM após cada ação. Nas verificações, usamos asserções web-first (`toBeVisible`, `toHaveText`, `toHaveCount`), que repetem até passar; as comparações de listas só acontecem depois que a vitrine terminou de carregar.
- **Data-driven.** A busca sem resultado roda com três massas (texto aleatório, números longos e produto inexistente); cada uma vira um teste no relatório.
- **Testes independentes.** Cada teste recebe a vitrine do zero pela fixture.
- **Defeito registrado como falha esperada.** O CT-E2E-13 usa `test.fail()` com a descrição do bug: o relatório fica verde e, no dia em que o defeito for corrigido, o teste avisa que passou.
- **Configuração para a banca (`playwright.config.ts`).** Timeout de 90 s (API no Render), um worker (um navegador só no `--headed`), trace/vídeo/print apenas em falha e `SLOW_MO` opcional.
- **TypeScript tipado**, sem `any` explícito.

---

## 6. Casos de teste E2E

Matriz completa, com dados de entrada, em [`docs/matriz-de-testes.md`](docs/matriz-de-testes.md).

### 6.1 Loja QA: módulo 01 (`tests/e2e/lojaqa-modulo-1.spec.ts`)

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-E2E-01 | Abrir a vitrine | Há produtos listados e o resumo mostra `N produto(s) encontrado(s)` com N igual ao número de cards |
| CT-E2E-02 | Conteúdo dos cards | Cada card mostra nome, categoria, preço em R$ (maior que zero) e loja |
| CT-E2E-03 | Busca por nome completo | O produto procurado aparece |
| CT-E2E-04 | Busca parcial (começo do nome) | O produto aparece mesmo com parte do nome |
| CT-E2E-05 | Espaços antes e depois do termo | A busca ignora os espaços e o produto aparece |
| CT-E2E-06a | Busca sem resultado: texto aleatório (`zzzxxxqqq`) | Mensagem "Nenhum produto encontrado para os filtros atuais." e resumo `0 produto(s) encontrado(s)` |
| CT-E2E-06b | Busca sem resultado: só números longos (`123456789012345`) | Mesma mensagem e resumo zerado |
| CT-E2E-06c | Busca sem resultado: produto inexistente (`produto-que-nao-existe`) | Mesma mensagem e resumo zerado |
| CT-E2E-07 | Limpar a busca | A lista completa volta, com o mesmo total de antes |
| CT-E2E-08 | Filtro de categoria | Só aparecem produtos da categoria escolhida |
| CT-E2E-09 | Preço máximo (valor da mediana dos preços) | Nenhum produto acima do limite e resumo coerente com a lista |
| CT-E2E-10 | Caminho feliz: busca + categoria + preço máximo | O produto continua visível, tudo respeita os filtros, e limpar os filtros restaura a lista |
| CT-E2E-11 | Caminho negativo: produto buscado em outra categoria | O produto não aparece |
| CT-E2E-12 | Caminho negativo: preço máximo R$ 1 | Mensagem de vazio e resumo `0 produto(s) encontrado(s)` |
| CT-E2E-13 | **Fronteira:** preço máximo igual ao preço do produto mais barato | O produto deve aparecer (o limite é inclusivo). **Falha hoje: BUG-01** |

### 6.2 Toolshop (`tests/e2e/externo-e2e.spec.ts`)

**CT-EXT-E2E-01: cliente compra um produto e paga com cartão de crédito**

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Entrar com a conta de cliente | Vai para `/account` e exibe o título "My account" |
| 2 | Buscar "Combination Pliers" e abrir o produto | Título da página e cabeçalho com o nome do produto; preço lido da página |
| 3 | Adicionar ao carrinho | O contador do carrinho mostra 1 |
| 4 | Abrir o carrinho | A linha do produto aparece com o mesmo preço da página do produto |
| 5 | Avançar, confirmar o login e preencher o endereço | Mensagem de que já está logado; país, CEP, número, rua, cidade e estado aceitos |
| 6 | Pagar com cartão de crédito | Mensagem "Payment was successful" |
| 7 | Finalizar o pedido | "Thanks for your order! Your invoice number is INV-..." |

---

## 7. Erros encontrados

### BUG-01: o filtro "Preço máximo" exclui o produto cujo preço é igual ao limite

| | |
|---|---|
| **Módulo** | 01: Catálogo & Busca (Loja QA) |
| **Tipo** | Valor de fronteira |
| **Severidade sugerida** | Média: o filtro devolve um resultado errado, mas há contorno (digitar um valor um pouco maior) |
| **Teste que captura** | CT-E2E-13 (marcado com `test.fail()`) |

**Passos para reproduzir**

1. Abrir a vitrine e anotar o preço do produto mais barato (por exemplo, R$ X).
2. Digitar exatamente esse valor em "Preço máximo".

**Resultado esperado:** o produto mais barato continua na lista, porque "preço máximo" deve incluir o valor limite (`<=`).
**Resultado obtido:** o produto some da lista e o resumo conta um produto a menos.

**Causa provável** (`loja.js`, função `renderProducts`): o filtro do front-end compara com `<` estrito.

```js
productsToRender = productsToRender.filter(p => p.price < maxPriceVal);
```

---

## 8. Resultados

**Resultado esperado de uma execução completa dos E2E:** 16 testes aprovados no relatório (15 da Loja QA, sendo o CT-E2E-13 uma falha esperada registrada com `test.fail()`, e 1 do Toolshop).

---

## 9. Testes de API

> [Seção a ser completada pela dupla com os casos de `tests/api/` (Loja QA: `GET /api/products?search=Teclado` com busca parcial; e 1 CT de API em um serviço externo), incluindo os comandos de execução e os prints de status code e JSON no console](https://github.com/joaoalberto61/toolshop-automacao-banca/tree/main).

---

## 10. Lições aprendidas

- **Esperar por estado, não por tempo.** Observar o "Carregando vitrine..." sumir deixou os testes estáveis mesmo com a API lenta no primeiro acesso.
- **Page Object sem `expect`** mantém a leitura dos testes limpa e deixa claro o que cada teste confere.
- **Valores de fronteira revelam defeitos reais:** o BUG-01 só apareceu ao testar o preço exatamente igual ao limite.
- **Sites de mercado mudam.** O layout do Toolshop era diferente do descrito em tutoriais; o `error-context.md` que o Playwright gera na falha mostrou a tela real, e localizadores por role/label tornaram o teste mais resistente.
- **Falha esperada documentada** (`test.fail()`) mantém o relatório verde sem esconder o defeito.
