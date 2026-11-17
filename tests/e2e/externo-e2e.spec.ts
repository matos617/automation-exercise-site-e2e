// CT E2E externo: Practice Software Testing, Toolshop v5.0 (https://practicesoftwaretesting.com)
// CT-EXT-E2E-01: cliente cadastrado compra um produto e paga com cartão de crédito.

import { test, expect } from '@playwright/test';

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
  test('CT-EXT-E2E-01: cliente compra um produto e paga com cartão de crédito', async ({
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