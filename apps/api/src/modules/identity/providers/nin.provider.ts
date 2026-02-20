import { Injectable } from '@nestjs/common';

export const NIN_PROVIDER = Symbol('NIN_PROVIDER');

export type NinVerificationResult = {
  fullName: string;
  dob: string;
};

export interface NinProvider {
  verify(nin: string): Promise<NinVerificationResult>;
}

@Injectable()
export class StubNinProvider implements NinProvider {
  async verify(_nin: string): Promise<NinVerificationResult> {
    throw new Error('NIN verification provider is not configured.');
  }
}
