// CT E2E externo: Practice Software Testing, Toolshop v5.0 (https://practicesoftwaretesting.com)
// CT-EXT-E2E-01: cliente cadastrado compra um produto e paga com cartão de crédito.
// CT-EXT-E2E-02 a 15: catálogo e buscas, sem login. Felizes: busca, filtro, ordenação. Tristes: sem resultado, busca vazia/só espaços, XSS, SQL injection, produto inexistente.

import { test, expect, type Page } from '@playwright/test';

// O Toolshop marca os elementos com `data-test` (e não `data-testid`).
// Com isso, getByTestId('email') encontra <input data-test="email">.
test.use({ testIdAttribute: 'data-test' });

const URL_SITE = 'https://practicesoftwaretesting.com';

// Conta pública de demonstração do próprio site (não é segredo).
const CLIENTE = {
  email: 'customer@practicesoftwaretesting.com',
  senha: 'welcome01',
  nome: 'Jane Doe',
};

const PRODUTO = 'Combination Pliers';

const ENDERECO = {
  pais: 'Brazil', // o campo é uma lista (select); o texto precisa ser igual ao da opção
  cep: '53000-000',
  numero: '123',
  rua: 'Rua das Flores',
  cidade: 'Olinda',
  estado: 'PE',
};

// Cartão fictício no formato que o formulário aceita. A validade é calculada
// para ficar sempre no futuro, assim o teste não "vence" com o passar do tempo.
const CARTAO = {
  numero: '1111-1111-1111-1111',
  validade: `12/${new Date().getFullYear() + 2}`,
  cvv: '123',
  titular: 'Jane Doe',
};

test.describe('Toolshop (site externo)', () => {
  test('CT-EXT-E2E-01: [Feliz] cliente compra um produto e paga com cartão de crédito', async ({
    page,
  }) => {
    await test.step('1. Entrar com uma conta de cliente', async () => {
      await page.goto(URL_SITE);
      await page.getByTestId('nav-sign-in').click();

      await page.getByTestId('email').fill(CLIENTE.email);
      await page.getByTestId('password').fill(CLIENTE.senha);
      await page.getByTestId('login-submit').click();

      await expect(page).toHaveURL(/\/account/);
      await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
    });

    let precoUnitario = '';

    await test.step('2. Buscar o produto e abrir a página dele', async () => {
      await page.goto(URL_SITE);
      await page.getByTestId('search-query').fill(PRODUTO);
      await page.getByTestId('search-submit').click();

      await page.getByRole('link', { name: PRODUTO }).first().click();

      await expect(page).toHaveTitle(new RegExp(PRODUTO));
      await expect(page.getByRole('heading', { name: PRODUTO })).toBeVisible();

      precoUnitario = (await page.getByTestId('unit-price').innerText()).trim();
    });

    await test.step('3. Adicionar ao carrinho', async () => {
      await page.getByTestId('add-to-cart').click();

      await expect(page.getByTestId('nav-cart')).toHaveText('1');
    });

    await test.step('4. Conferir o carrinho (produto e preço)', async () => {
      await page.getByTestId('nav-cart').click();

      await expect(page).toHaveURL(/\/checkout/);
      const linhaDoProduto = page.getByRole('row', { name: new RegExp(PRODUTO) });
      await expect(linhaDoProduto).toBeVisible();
      await expect(linhaDoProduto).toContainText(precoUnitario);

      await page.getByTestId('proceed-1').click();
    });

    await test.step('5. Confirmar o login e informar o endereço de cobrança', async () => {
      await expect(page.getByText(/you are already logged in/i)).toBeVisible();
      await page.getByTestId('proceed-2').click();

      // Ordem da tela: país, CEP e número vêm primeiro (o site usa os três para
      // sugerir o resto do endereço); depois rua, cidade e estado.
      await page.getByRole('combobox', { name: 'Country' }).selectOption({ label: ENDERECO.pais });
      await page.getByRole('textbox', { name: 'Postal code' }).fill(ENDERECO.cep);
      await page.getByRole('textbox', { name: 'House number' }).fill(ENDERECO.numero);
      await page.getByRole('textbox', { name: 'Street' }).fill(ENDERECO.rua);
      await page.getByRole('textbox', { name: 'City' }).fill(ENDERECO.cidade);
      await page.getByRole('textbox', { name: 'State' }).fill(ENDERECO.estado);

      // O botão fica desabilitado até o formulário estar válido; o clique espera isso.
      await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    });

    await test.step('6. Pagar com cartão de crédito', async () => {
      await page.getByTestId('payment-method').selectOption('credit-card');

      await page.getByTestId('credit_card_number').fill(CARTAO.numero);
      await page.getByTestId('expiration_date').fill(CARTAO.validade);
      await page.getByTestId('cvv').fill(CARTAO.cvv);
      await page.getByTestId('card_holder_name').fill(CARTAO.titular);

      await page.getByTestId('finish').click();
      await expect(page.getByText('Payment was successful')).toBeVisible();
    });

    await test.step('7. Finalizar o pedido e conferir a fatura', async () => {
      await page.getByTestId('finish').click();

      await expect(
        page.getByText(/Thanks for your order! Your invoice number is INV-\d+/),
      ).toBeVisible();
    });
  });
});
// ---------------------------------------------------------------------------
// Catálogo e Buscas (usuário anônimo, não precisa de login)
// ---------------------------------------------------------------------------

// Lê o texto de todos os cards da listagem já carregados (ignora cards ainda vazios).
async function nomesNaListagem(page: Page): Promise<string[]> {
  const nomes = await page.getByTestId('product-name').allInnerTexts();
  return nomes.map((n) => n.trim()).filter(Boolean);
}

async function precosNaListagem(page: Page): Promise<number[]> {
  const textos = await page.getByTestId('product-price').allInnerTexts();
  return textos
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => parseFloat(t.replace(/[^0-9.]/g, '')));
}

// Os cards aparecem antes dos dados chegarem; espera haver ao menos um nome com texto.
async function aguardarListagem(page: Page) {
  await expect(page.getByTestId('product-name').filter({ hasText: /\S/ }).first()).toBeVisible();
}

test.describe('Toolshop (site externo) - Catálogo e Buscas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL_SITE);
    await aguardarListagem(page);
  });

  test('CT-EXT-E2E-02: [Feliz] busca por nome mostra apenas produtos correspondentes', async ({ page }) => {
    await page.getByTestId('search-query').fill('pliers');
    await page.getByTestId('search-submit').click();

    await expect(page.getByTestId('search-caption')).toContainText('Searched for: pliers');

    await expect(async () => {
      const nomes = await nomesNaListagem(page);
      expect(nomes.length).toBeGreaterThan(0);
      for (const nome of nomes) {
        expect(nome.toLowerCase()).toContain('pliers');
      }
    }).toPass();
  });

  test('CT-EXT-E2E-03: [Triste] busca por termo inexistente mostra mensagem de nenhum produto', async ({
    page,
  }) => {
    await page.getByTestId('search-query').fill('zzzxxxqqq');
    await page.getByTestId('search-submit').click();

    await expect(page.getByTestId('search-caption')).toContainText('Searched for: zzzxxxqqq');
    await expect(page.getByText(/no products found/i)).toBeVisible();
    await expect(page.getByTestId('product-name')).toHaveCount(0);
  });

  test('CT-EXT-E2E-04: [Feliz] abrir um produto a partir do resultado da busca', async ({ page }) => {
    await page.getByTestId('search-query').fill(PRODUTO);
    await page.getByTestId('search-submit').click();

    await page.getByRole('link', { name: PRODUTO }).first().click();

    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByRole('heading', { name: PRODUTO })).toBeVisible();
    await expect(page.getByTestId('unit-price')).toBeVisible();
    await expect(page.getByTestId('add-to-cart')).toBeVisible();
  });

  test('CT-EXT-E2E-05: [Feliz] filtrar por categoria (Hammer) mostra apenas martelos', async ({ page }) => {
    await page.getByLabel('Hammer', { exact: true }).check();

    await expect(async () => {
      const nomes = await nomesNaListagem(page);
      expect(nomes.length).toBeGreaterThan(0);
      for (const nome of nomes) {
        expect(nome.toLowerCase()).toContain('hammer');
      }
    }).toPass();

    // Um produto de outra categoria não pode aparecer.
    await expect(page.getByTestId('product-name').filter({ hasText: PRODUTO })).toHaveCount(0);
  });

  test('CT-EXT-E2E-06: [Feliz] remover o filtro de categoria volta a listar outros produtos', async ({
    page,
  }) => {
    const filtro = page.getByLabel('Hammer', { exact: true });

    await filtro.check();
    await expect(async () => {
      const nomes = await nomesNaListagem(page);
      expect(nomes.length).toBeGreaterThan(0);
      expect(nomes.every((n) => /hammer/i.test(n))).toBe(true);
    }).toPass();

    await filtro.uncheck();
    await expect(async () => {
      const nomes = await nomesNaListagem(page);
      expect(nomes.some((n) => !/hammer/i.test(n))).toBe(true);
    }).toPass();
  });

  test('CT-EXT-E2E-07: [Feliz] ordenar por nome (A-Z) deixa a listagem em ordem alfabética', async ({
    page,
  }) => {
    await page.getByTestId('sort').selectOption('name,asc');

    await expect(async () => {
      const nomes = (await nomesNaListagem(page)).map((n) => n.toLowerCase());
      expect(nomes.length).toBeGreaterThan(1);
      expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b)));
    }).toPass();
  });

  test('CT-EXT-E2E-08: [Feliz] ordenar por preço crescente', async ({ page }) => {
    await page.getByTestId('sort').selectOption('price,asc');

    await expect(async () => {
      const precos = await precosNaListagem(page);
      expect(precos.length).toBeGreaterThan(1);
      expect(precos).toEqual([...precos].sort((a, b) => a - b));
    }).toPass();
  });

  test('CT-EXT-E2E-09: [Feliz] ordenar por preço decrescente', async ({ page }) => {
    await page.getByTestId('sort').selectOption('price,desc');

    await expect(async () => {
      const precos = await precosNaListagem(page);
      expect(precos.length).toBeGreaterThan(1);
      expect(precos).toEqual([...precos].sort((a, b) => b - a));
    }).toPass();
  });

  test('CT-EXT-E2E-10: [Feliz] filtro por categoria combinado com ordenação por preço', async ({ page }) => {
    await page.getByLabel('Hammer', { exact: true }).check();
    await page.getByTestId('sort').selectOption('price,asc');

    await expect(async () => {
      const nomes = await nomesNaListagem(page);
      const precos = await precosNaListagem(page);
      expect(nomes.length).toBeGreaterThan(0);
      expect(nomes.every((n) => /hammer/i.test(n))).toBe(true);
      expect(precos).toEqual([...precos].sort((a, b) => a - b));
    }).toPass();
  });

  // -------------------------------------------------------------------------
  // Caminhos tristes: entradas inválidas ou hostis de propósito.
  // O sistema deve reagir sem quebrar, sem executar código e sem vazar resultados.
  // -------------------------------------------------------------------------

  test('CT-EXT-E2E-11: [Triste] busca vazia não quebra a página', async ({ page }) => {
    await page.getByTestId('search-query').fill('');
    await page.getByTestId('search-submit').click();

    // Aceita os dois comportamentos legítimos: voltar a listar produtos ou avisar que não há resultado.
    await expect(
      page.getByTestId('product-name').or(page.getByText(/no products found/i)).first(),
    ).toBeVisible();
    await expect(page.getByTestId('search-query')).toBeVisible();
  });

  test('CT-EXT-E2E-12: [Triste] busca só com espaços não quebra a página', async ({
    page,
  }) => {
    await page.getByTestId('search-query').fill('     ');
    await page.getByTestId('search-submit').click();

    await expect(
      page.getByTestId('product-name').or(page.getByText(/no products found/i)).first(),
    ).toBeVisible();
    await expect(page.getByTestId('search-query')).toBeVisible();
  });

  test('CT-EXT-E2E-13: [Triste] tentativa de XSS na busca é tratada como texto', async ({
    page,
  }) => {
    let dialogAberto = false;
    page.on('dialog', async (dialog) => {
      dialogAberto = true;
      await dialog.dismiss();
    });

    const termo = '<script>alert(1)</script>';
    await page.getByTestId('search-query').fill(termo);
    await page.getByTestId('search-submit').click();

    await expect(page.getByText(/no products found/i)).toBeVisible();
    await expect(page.getByTestId('search-caption')).toContainText(termo);
    expect(dialogAberto).toBe(false);
  });

  test('CT-EXT-E2E-14: [Triste] tentativa de SQL injection na busca não lista tudo', async ({
    page,
  }) => {
    await page.getByTestId('search-query').fill("' OR 1=1 --");
    await page.getByTestId('search-submit').click();

    await expect(page.getByText(/no products found/i)).toBeVisible();
    await expect(page.getByTestId('product-name')).toHaveCount(0);
  });

  test('CT-EXT-E2E-15: [Triste] produto inexistente na URL não mostra página de produto', async ({
    page,
  }) => {
    await page.goto(`${URL_SITE}/product/00000000000000000000000000`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('add-to-cart')).toHaveCount(0);
    await expect(page.getByTestId('unit-price')).toHaveCount(0);
  });
});
