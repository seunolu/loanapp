import type { BrandTokens } from '../types';

export const acmeBrand: BrandTokens = {
  key: 'acme',
  appName: 'Acme Loans',
  tagline: 'Credit that moves at your pace.',
  colors: {
    primary: '#0F7B6C',
    accent: '#0A4A7A'
  },
  logo: require('../../../assets/brands/acme/logo.png'),
  splash: require('../../../assets/brands/acme/splash.png'),
  icon: require('../../../assets/brands/acme/icon.png'),
  supportEmail: 'support@acme-loans.example',
  website: 'https://acme-loans.example'
};
