// Testes E2E da Loja QA: Catálogo, Busca & Filtros (sem login ou cadastro)

import { test, expect } from '../../fixtures/auth.fixture';

// Data-driven: cada item vira um teste separado no relatório
const buscasSemResultado = [
  { descricao: 'texto aleatório', termo: 'zzzxxxqqq' },
  { descricao: 'só números longos', termo: '123456789012345' },
  { descricao: 'produto inexistente', termo: 'produto-que-nao-existe' },
];

// Cada teste é independente
test.describe('Catálogo, Busca & Filtros', () => {
  test('exibe produtos e o resumo ao abrir a vitrine', async ({ catalogoPage }) => {
    await expect(catalogoPage.cards.first()).toBeVisible();

    const quantidade = await catalogoPage.cards.count();
    await expect(catalogoPage.resumo).toHaveText(`${quantidade} produto(s) encontrado(s)`);
  });

  test('busca por nome retorna o produto procurado', async ({ catalogoPage }) => {
    const [nome] = await catalogoPage.obterNomes();

    await catalogoPage.buscar(nome);

    await expect(catalogoPage.cardPorNome(nome)).toBeVisible();
  });

  for (const { descricao, termo } of buscasSemResultado) {
    test(`busca sem resultado: ${descricao}`, async ({ catalogoPage }) => {
      await catalogoPage.buscar(termo);

      await expect(catalogoPage.estadoVazio).toHaveText(
        'Nenhum produto encontrado para os filtros atuais.',
      );
      await expect(catalogoPage.resumo).toHaveText('0 produto(s) encontrado(s)');
    });
  }

  test('limpar a busca restaura a lista completa', async ({ catalogoPage }) => {
    const totalProdutos = await catalogoPage.cards.count();

    await catalogoPage.buscar('zzzxxxqqq');
    await expect(catalogoPage.estadoVazio).toBeVisible();

    await catalogoPage.limparFiltros();
    await expect(catalogoPage.cards).toHaveCount(totalProdutos);
  });

  test('filtro de categoria mostra só produtos da categoria escolhida', async ({ catalogoPage }) => {
    const [categoria] = await catalogoPage.obterCategorias();

    await catalogoPage.filtrarPorCategoria(categoria);

    const categoriasDosCards = await catalogoPage.obterCategoriasDosCards();
    expect(categoriasDosCards.length).toBeGreaterThan(0);
    for (const categoriaDoCard of categoriasDosCards) {
      expect(categoriaDoCard).toBe(categoria);
    }
  });

  test('preço máximo não exibe produtos acima do limite', async ({ catalogoPage }) => {
    const precos = await catalogoPage.obterPrecos();
    const ordenados = [...precos].sort((a, b) => a - b);
    const limite = ordenados[Math.floor(ordenados.length / 2)];

    await catalogoPage.limitarPreco(limite);

    const precosFiltrados = await catalogoPage.obterPrecos();
    for (const preco of precosFiltrados) {
      expect(preco).toBeLessThanOrEqual(limite);
    }
  });

  test('caminho feliz: busca + categoria + preço máximo juntos encontram o produto', async ({
    catalogoPage,
  }) => {
    const totalProdutos = await catalogoPage.cards.count();
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

  test('caminho negativo: produto buscado numa categoria que não é a dele não aparece', async ({
    catalogoPage,
  }) => {
    const [nome] = await catalogoPage.obterNomes();
    const [categoriaDoProduto] = await catalogoPage.obterCategoriasDosCards();
    const categorias = await catalogoPage.obterCategorias();
    const outraCategoria = categorias.find((categoria) => categoria !== categoriaDoProduto);
    if (!outraCategoria) throw new Error('O teste precisa de pelo menos 2 categorias na vitrine.');

    await catalogoPage.buscar(nome);
    await catalogoPage.filtrarPorCategoria(outraCategoria);

    await expect(catalogoPage.cardPorNome(nome)).toBeHidden();
  });

  test('caminho negativo: preço máximo menor que qualquer produto não retorna resultado', async ({
    catalogoPage,
  }) => {
    // Nenhum produto da loja custa até R$ 1.
    await catalogoPage.limitarPreco(1);

    await expect(catalogoPage.estadoVazio).toHaveText(
      'Nenhum produto encontrado para os filtros atuais.',
    );
    await expect(catalogoPage.resumo).toHaveText('0 produto(s) encontrado(s)');
  });

  // Valor de fronteira: "preço máximo" deveria incluir o produto cujo preço é IGUAL ao limite.
  // Falha hoje por um bug do site (usa "<" em vez de "<="). Esse é o defeito encontrado.
  test('BUG: preço máximo inclui o produto com preço igual ao limite', async ({ catalogoPage }) => {
    // test.fail(); // descomente para marcar como bug conhecido e deixar o relatório verde

    const nomes = await catalogoPage.obterNomes();
    const precos = await catalogoPage.obterPrecos();
    const indiceMaisBarato = precos.indexOf(Math.min(...precos));

    await catalogoPage.limitarPreco(precos[indiceMaisBarato]);

    await expect(catalogoPage.cardPorNome(nomes[indiceMaisBarato])).toBeVisible();
  });
});