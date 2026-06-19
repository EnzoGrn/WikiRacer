import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://wikiracer.enzogarnier.fr', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://wikiracer.enzogarnier.fr/daily', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://wikiracer.enzogarnier.fr/daily/archive', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];
}