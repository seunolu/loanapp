import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../providers/auth-provider';
import { useTenant } from '../../tenant/tenant-context';
import { fetchAvailableLoanProducts } from './loanProducts.api';

export function useAvailableLoanProducts() {
  const { status } = useAuth();
  const { tenantSlug } = useTenant();

  return useQuery({
    queryKey: ['loan-products', tenantSlug || 'default', 'available'],
    queryFn: fetchAvailableLoanProducts,
    enabled: status === 'authenticated',
    staleTime: 60_000
  });
}

