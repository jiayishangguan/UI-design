export function getIpfsGatewayUrl(value?: string | null) {
  const source = value?.trim();
  if (!source) return null;

  if (source.startsWith("http://") || source.startsWith("https://")) {
    return source;
  }

  if (source.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${source.slice("ipfs://".length)}`;
  }

  return `https://gateway.pinata.cloud/ipfs/${source}`;
}
