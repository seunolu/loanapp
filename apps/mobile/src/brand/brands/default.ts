import type { BrandTokens } from '../types';

export const defaultBrand: BrandTokens = {
  key: 'default',
  appName: 'LoanApp Mobile',
  tagline: 'Borrow with confidence.',
  colors: {
    primary: '#0A4A7A',
    accent: '#0F7B6C'
  },
  logo: require('../../../assets/brands/default/logo.png'),
  splash: require('../../../assets/brands/default/splash.png'),
  icon: require('../../../assets/brands/default/icon.png'),
  supportEmail: 'support@loanapp.local',
  website: 'https://loanapp.example'
};
