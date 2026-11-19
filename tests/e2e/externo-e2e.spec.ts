// CT E2E externo: Practice Software Testing, Toolshop (https://practicesoftwaretesting.com)
// Cenário: Catálogo e Buscas, o mesmo tema do módulo 01 da Loja QA. Não precisa de login.
// CT-EXT-E2E-01: busca parcial, página do produto e busca sem resultado.

import { test, expect } from '@playwright/test';

// O Toolshop marca os elementos com `data-test` (e não `data-testid`).
// Com isso, getByTestId('search-query') encontra <input data-test="search-query">.
test.use({ testIdAttribute: 'data-test' });

const URL_SITE = 'https://practicesoftwaretesting.com';

const PRODUTO = 'Combination Pliers';
const BUSCA_PARCIAL = 'Combination'; // só o começo do nome do produto
const BUSCA_SEM_RESULTADO = 'zzzxxxqqq';

test.describe('Toolshop (site externo): Catálogo e Buscas', () => {
  test('CT-EXT-E2E-01: busca parcial, página do produto e busca sem resultado', async ({
    page,
  }) => {
    const nomesDosCards = page.getByTestId('product-name');
    const campoBusca = page.getByTestId('search-query');
    const botaoBuscar = page.getByTestId('search-submit');

    let totalNoCatalogo = 0;

    await test.step('1. Abrir o catálogo e conferir que há produtos', async () => {
      await page.goto(URL_SITE);

      // Os cards aparecem antes dos dados: espera o primeiro nome ter texto de verdade.
      await expect(nomesDosCards.first()).toHaveText(/\S/);

      totalNoCatalogo = await nomesDosCards.count();
      expect(totalNoCatalogo).toBeGreaterThan(1);
    });

    await test.step('2. Buscar por parte do nome: a lista é filtrada e o produto aparece', async () => {
      await campoBusca.fill(BUSCA_PARCIAL);
      await botaoBuscar.click();

      // A busca filtrou: sobram menos cards do que no catálogo inteiro.
      await expect.poll(() => nomesDosCards.count()).toBeLessThan(totalNoCatalogo);
      await expect(page.getByRole('link', { name: PRODUTO }).first()).toBeVisible();
    });

    await test.step('3. Abrir o produto e conferir os dados da página', async () => {
      await page.getByRole('link', { name: PRODUTO }).first().click();

      await expect(page).toHaveTitle(new RegExp(PRODUTO));
      await expect(page.getByRole('heading', { name: PRODUTO })).toBeVisible();
      await expect(page.getByTestId('unit-price')).toHaveText(/\d+\.\d{2}/);
      await expect(page.getByTestId('add-to-cart')).toBeEnabled();
    });

    await test.step('4. Buscar algo que não existe: aparece a mensagem de vazio', async () => {
      await page.goto(URL_SITE);
      await campoBusca.fill(BUSCA_SEM_RESULTADO);
      await botaoBuscar.click();

      await expect(page.getByText(/no products found/i)).toBeVisible();
      await expect(nomesDosCards).toHaveCount(0);
    });
  });
});
