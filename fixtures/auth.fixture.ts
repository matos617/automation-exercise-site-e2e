// Fixture autenticada ou setup de sessão

import { test as base } from '@playwright/test';
import { CatalogoPage } from '../pages/modulo-1-page';

type CatalogoFixtures = {
  catalogoPage: CatalogoPage;
};

/**
 * Fixture do catálogo: entrega a vitrine já aberta e carregada.
 * Não há login: a vitrine é pública, então não precisa de fixture de sessão.
 */
export const test = base.extend<CatalogoFixtures>({
  catalogoPage: async ({ page }, use) => {
    const catalogoPage = new CatalogoPage(page);
    await catalogoPage.goto();
    await catalogoPage.aguardarCatalogo();
    await use(catalogoPage);
  },
});

export { expect } from '@playwright/test';