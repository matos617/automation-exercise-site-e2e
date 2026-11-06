// Page Object do módulo sorteado (SEM expect interno)

// Login Page Object

// https://alisonmelo.github.io/tioalison-pe-t4-fap26/projetos-base/01-sistema-login/loja.html

import { type Locator, type Page } from '@playwright/test';

const URL_LOJA =
  'https://alisonmelo.github.io/tioalison-pe-t4-fap26/projetos-base/01-sistema-login/loja.html';

/*
 * Page Object da vitrine (Catálogo, Busca & Filtros).
 * Regra: aqui só existem localizadores, ações e leituras. Nenhum `expect`.
 */
export class CatalogoPage {
  readonly page: Page;

  // Filtros
  readonly campoBusca: Locator;
  readonly filtroCategoria: Locator;
  readonly campoPrecoMaximo: Locator;

  // Resultado
  readonly resumo: Locator;
  readonly cards: Locator;
  readonly estadoVazio: Locator;
  readonly carregando: Locator;

  constructor(page: Page) {
    this.page = page;

    this.campoBusca = page.locator('#searchInput');
    this.filtroCategoria = page.locator('#categoryFilter');
    this.campoPrecoMaximo = page.locator('#maxPrice');

    this.resumo = page.locator('#resultsSummary');
    this.cards = page.locator('#productGrid .product-card');
    this.estadoVazio = page.locator('#productGrid .empty-state');
    this.carregando = page.locator('#productGrid .loading-state');
  }

  // ---------- Navegação e espera ----------

  async goto(): Promise<void> {
    await this.page.goto(URL_LOJA);
  }

  /**
   * Espera a vitrine terminar de carregar. O site mostra "Carregando vitrine..."
   * enquanto consulta a API (hospedada no Render, que pode demorar no 1º acesso).
   */
  async aguardarCatalogo(): Promise<void> {
    await this.carregando.waitFor({ state: 'detached', timeout: 60_000 });
  }

  // ---------- Ações ----------

  async buscar(termo: string): Promise<void> {
    await this.campoBusca.fill(termo);
    await this.aguardarCatalogo();
  }

  async filtrarPorCategoria(categoria: string): Promise<void> {
    await this.filtroCategoria.selectOption({ label: categoria });
    await this.aguardarCatalogo();
  }

  async limitarPreco(valor: number): Promise<void> {
    await this.campoPrecoMaximo.fill(String(valor));
    await this.aguardarCatalogo();
  }

  /**
   * Volta os filtros ao padrão. Cada filtro dispara uma consulta própria à API,
   * então limpamos um de cada vez e esperamos a resposta de cada um. Se limpasse
   * os três de uma vez, a espera terminaria na 1ª resposta e o teste leria uma
   * lista desatualizada.
   */
  async limparFiltros(): Promise<void> {
    if ((await this.campoBusca.inputValue()) !== '') {
      await this.buscar('');
    }
    if ((await this.filtroCategoria.inputValue()) !== '') {
      await this.filtrarPorCategoria('Todas');
    }
    if ((await this.campoPrecoMaximo.inputValue()) !== '') {
      await this.campoPrecoMaximo.fill('');
      await this.aguardarCatalogo();
    }
  }

  // ---------- Leituras (devolvem dados; quem confere é o teste) ----------

  cardPorNome(nome: string): Locator {
    return this.cards
      .filter({ has: this.page.getByRole('heading', { name: nome, exact: true }) })
      .first();
  }

  async obterNomes(): Promise<string[]> {
    return this.cards.locator('h3').allTextContents();
  }

  async obterCategoriasDosCards(): Promise<string[]> {
    return this.cards.locator('.product-category').allTextContents();
  }

  /** Converte "R$ 1.234,56" em 1234.56 */
  async obterPrecos(): Promise<number[]> {
    const textos = await this.cards.locator('.product-bottom strong').allTextContents();
    return textos.map((t) => Number(t.replace(/[^\d,]/g, '').replace(',', '.')));
  }

  /** Categorias disponíveis no select (ignora a opção "Todas"). */
  async obterCategorias(): Promise<string[]> {
    const opcoes = this.filtroCategoria.locator('option:not([value=""])');
    await opcoes.first().waitFor({ state: 'attached' });
    return opcoes.allTextContents();
  }
}