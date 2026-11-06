// Testes E2E da Loja QA: Catálogo, Busca & Filtros (sem login ou cadastro)

import { test, expect } from '../../fixtures/auth.fixture';

// Cada cenário é uma etapa do mesmo teste para reutilizar a mesma página.
const buscasSemResultado = [
  { descricao: 'texto aleatório', termo: 'zzzxxxqqq' },
  { descricao: 'só números longos', termo: '123456789012345' },
  { descricao: 'produto inexistente', termo: 'produto-que-nao-existe' },
];

test('Catálogo, Busca & Filtros', async ({ catalogoPage }) => {
  // Todas as etapas dividem o mesmo tempo limite (padrão: 30s) e a API do Render é lenta.
  test.setTimeout(120_000);

  const totalProdutos = await catalogoPage.cards.count();

  await test.step('exibe produtos e o resumo ao abrir a vitrine', async () => {
    await expect(catalogoPage.cards.first()).toBeVisible();

    const quantidade = await catalogoPage.cards.count();
    await expect(catalogoPage.resumo).toHaveText(`${quantidade} produto(s) encontrado(s)`);
  });

  await test.step('busca por nome retorna o produto procurado', async () => {
    const [nome] = await catalogoPage.obterNomes();

    await catalogoPage.buscar(nome);

    await expect(catalogoPage.cardPorNome(nome)).toBeVisible();
    await catalogoPage.limparFiltros();
  });

  for (const { descricao, termo } of buscasSemResultado) {
    await test.step(`busca sem resultado: ${descricao}`, async () => {
      await catalogoPage.buscar(termo);

      await expect(catalogoPage.estadoVazio).toHaveText(
        'Nenhum produto encontrado para os filtros atuais.',
      );
      await expect(catalogoPage.resumo).toHaveText('0 produto(s) encontrado(s)');
    });
  }

  await test.step('limpar a busca restaura a lista completa', async () => {
    await catalogoPage.limparFiltros();
    await expect(catalogoPage.cards).toHaveCount(totalProdutos);
  });

  await test.step('filtro de categoria mostra só produtos da categoria escolhida', async () => {
    const [categoria] = await catalogoPage.obterCategorias();

    await catalogoPage.filtrarPorCategoria(categoria);

    const categoriasDosCards = await catalogoPage.obterCategoriasDosCards();
    expect(categoriasDosCards.length).toBeGreaterThan(0);
    for (const categoriaDoCard of categoriasDosCards) {
      expect(categoriaDoCard).toBe(categoria);
    }
    await catalogoPage.limparFiltros();
  });

  await test.step('preço máximo não exibe produtos acima do limite', async () => {
    const precos = await catalogoPage.obterPrecos();
    const ordenados = [...precos].sort((a, b) => a - b);
    const limite = ordenados[Math.floor(ordenados.length / 2)];

    await catalogoPage.limitarPreco(limite);

    const precosFiltrados = await catalogoPage.obterPrecos();
    for (const preco of precosFiltrados) {
      expect(preco).toBeLessThanOrEqual(limite);
    }
    await catalogoPage.limparFiltros();
  });

  // As etapas abaixo ficam ANTES da fronteira: ela falha de propósito (bug do "<") e,
  // num teste único, a primeira falha interrompe as etapas seguintes.

  await test.step('caminho feliz: busca + categoria + preço máximo juntos encontram o produto', async () => {
    const [nome] = await catalogoPage.obterNomes();
    const [categoria] = await catalogoPage.obterCategoriasDosCards();
    const [preco] = await catalogoPage.obterPrecos();
    const limite = Math.ceil(preco) + 1; // folga: não depende do "<" vs "<=" do preço máximo

    await catalogoPage.buscar(nome);
    await catalogoPage.filtrarPorCategoria(categoria);
    await catalogoPage.limitarPreco(limite);

    await expect(catalogoPage.cardPorNome(nome)).toBeVisible();
    for (const categoriaDoCard of await catalogoPage.obterCategoriasDosCards()) {
      expect(categoriaDoCard).toBe(categoria);
    }
    for (const precoDoCard of await catalogoPage.obterPrecos()) {
      expect(precoDoCard).toBeLessThanOrEqual(limite);
    }
    const quantidade = await catalogoPage.cards.count();
    await expect(catalogoPage.resumo).toHaveText(`${quantidade} produto(s) encontrado(s)`);

    await catalogoPage.limparFiltros();
    await expect(catalogoPage.cards).toHaveCount(totalProdutos);
  });

  await test.step('caminho negativo: produto buscado numa categoria que não é a dele não aparece', async () => {
    const [nome] = await catalogoPage.obterNomes();
    const [categoriaDoProduto] = await catalogoPage.obterCategoriasDosCards();
    const categorias = await catalogoPage.obterCategorias();
    const outraCategoria = categorias.find((categoria) => categoria !== categoriaDoProduto);
    if (!outraCategoria) throw new Error('O teste precisa de pelo menos 2 categorias na vitrine.');

    await catalogoPage.buscar(nome);
    await catalogoPage.filtrarPorCategoria(outraCategoria);

    await expect(catalogoPage.cardPorNome(nome)).toBeHidden();
    await catalogoPage.limparFiltros();
  });

  await test.step('caminho negativo: preço máximo menor que qualquer produto não retorna resultado', async () => {
    // Nenhum produto da loja custa até R$ 1.
    await catalogoPage.limitarPreco(1);

    await expect(catalogoPage.estadoVazio).toHaveText(
      'Nenhum produto encontrado para os filtros atuais.',
    );
    await expect(catalogoPage.resumo).toHaveText('0 produto(s) encontrado(s)');

    await catalogoPage.limparFiltros();
    await expect(catalogoPage.cards).toHaveCount(totalProdutos);
  });

  // Valor de fronteira: "preço máximo" deveria incluir o produto cujo preço é IGUAL ao limite.
  await test.step('preço máximo inclui o produto com preço igual ao limite', async () => {
    const nomes = await catalogoPage.obterNomes();
    const precos = await catalogoPage.obterPrecos();
    const indiceMaisBarato = precos.indexOf(Math.min(...precos));

    await catalogoPage.limitarPreco(precos[indiceMaisBarato]);

    await expect(catalogoPage.cardPorNome(nomes[indiceMaisBarato])).toBeVisible();
  });
});