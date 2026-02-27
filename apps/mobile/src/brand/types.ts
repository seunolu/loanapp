export type BrandKey = 'default' | 'demo' | 'acme';

export type BrandTokens = {
  key: BrandKey;
  appName: string;
  tagline: string;
  colors: {
    primary: string;
    accent: string;
  };
  logo: number;
  splash: number;
  icon: number;
  supportEmail: string;
  website: string;
};
