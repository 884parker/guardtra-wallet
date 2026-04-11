import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { NETWORKS, setActiveNetwork, getActiveNetwork, txUrl, addressUrl } from '@/lib/network-config';

/**
 * Fetches the user's selected network from AppConfig.
 * Defaults to 'sepolia' if not set.
 * Also updates the global network state.
 */
export function useNetwork() {
  const { data: networkId, isLoading } = useQuery({
    queryKey: ['active-network'],
    queryFn: async () => {
      const res = await base44.entities.AppConfig.filter({ key: 'active_network' });
      const id = res[0]?.value || 'sepolia';
      setActiveNetwork(id);
      return id;
    },
    staleTime: 60000,
    initialData: 'sepolia',
  });

  const net = NETWORKS[networkId] || NETWORKS.sepolia;

  return {
    networkId,
    network: net,
    isTestnet: net.isTestnet,
    isMainnet: !net.isTestnet,
    explorerUrl: net.explorerUrl,
    explorerName: net.explorerName,
    networkName: net.name,
    txUrl,
    addressUrl,
    isLoading,
  };
}
