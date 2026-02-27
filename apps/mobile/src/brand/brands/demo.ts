import type { BrandTokens } from '../types';

export const demoBrand: BrandTokens = {
  key: 'demo',
  appName: 'LoanApp Demo',
  tagline: 'Test lending flows safely.',
  colors: {
    primary: '#0A4A7A',
    accent: '#2B6CB0'
  },
  logo: require('../../../assets/brands/demo/logo.png'),
  splash: require('../../../assets/brands/demo/splash.png'),
  icon: require('../../../assets/brands/demo/icon.png'),
  supportEmail: 'demo-support@loanapp.local',
  website: 'https://demo.loanapp.example'
};
