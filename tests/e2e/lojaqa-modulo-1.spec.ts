// Testes de API da Loja QA ({ request })

import { test, expect } from '../../fixtures/auth.fixture';

// Cada cenário é uma etapa do mesmo teste para reutilizar a mesma página.
const buscasSemResultado = [
  { descricao: 'texto aleatório', termo: 'zzzxxxqqq' },
  { descricao: 'só números longos', termo: '123456789012345' },
  { descricao: 'produto inexistente', termo: 'produto-que-nao-existe' },
];

test('Catálogo, Busca & Filtros', async ({ catalogoPage }) => {
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

  // Valor de fronteira: "preço máximo" deveria incluir o produto cujo preço é IGUAL ao limite.
  await test.step('preço máximo inclui o produto com preço igual ao limite', async () => {
    const nomes = await catalogoPage.obterNomes();
    const precos = await catalogoPage.obterPrecos();
    const indiceMaisBarato = precos.indexOf(Math.min(...precos));

    await catalogoPage.limitarPreco(precos[indiceMaisBarato]);

    await expect(catalogoPage.cardPorNome(nomes[indiceMaisBarato])).toBeVisible();
  });
});