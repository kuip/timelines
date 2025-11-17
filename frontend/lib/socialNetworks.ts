export const SOCIAL_NETWORKS = [
  { name: 'X.com', icon: '𝕏', url: 'https://x.com', domain: 'x.com', color: '#000000' },
  { name: 'Facebook', icon: 'f', url: 'https://facebook.com', domain: 'facebook.com', color: '#1877F2' },
  { name: 'YouTube', icon: '▶', url: 'https://youtube.com', domain: 'youtube.com', color: '#FF0000' },
  { name: 'Wikipedia', icon: 'W', url: 'https://wikipedia.org', domain: 'wikipedia.org', color: '#000000' },
  { name: 'Wikidata', icon: '◨', url: 'https://wikidata.org', domain: 'wikidata.org', color: '#006699' },
  { name: 'Discord', icon: '💬', url: 'https://discord.com', domain: 'discord.com', color: '#5865F2' },
  { name: 'Reddit', icon: '●', url: 'https://reddit.com', domain: 'reddit.com', color: '#FF4500' },
  { name: 'Email', icon: '✉', url: 'mailto:', domain: 'mailto:', color: '#666666' },
  { name: 'GitHub', icon: '⚙', url: 'https://github.com', domain: 'github.com', color: '#181717' },
  { name: 'LinkedIn', icon: 'in', url: 'https://linkedin.com', domain: 'linkedin.com', color: '#0A66C2' },
  { name: 'Telegram', icon: '✈', url: 'https://telegram.org', domain: 'telegram.org', color: '#26A5E4' },
  { name: 'Quora', icon: 'Q', url: 'https://quora.com', domain: 'quora.com', color: '#B92B27' },
];

export function getIconForUrl(url: string): string {
  const lowerUrl = url.toLowerCase();

  for (const network of SOCIAL_NETWORKS) {
    const domain = network.domain.toLowerCase().replace('https://', '').replace('http://', '');
    if (lowerUrl.includes(domain)) {
      return network.icon;
    }
  }

  // Default icon for unknown sources
  return '📖';
}
