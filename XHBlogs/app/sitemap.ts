import { siteConfig } from '../siteConfig';
import { chattersData, postsData } from '../data/content-data';

const BASE_URL = 'https://www.srmz.cn';
const buildDate = new Date(siteConfig.buildDate);

export default function sitemap() {
  const staticPages = [
    { url: '/', priority: 1.0, changeFrequency: 'weekly' as const },
    { url: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { url: '/moments', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/chatter', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/posts', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/friends', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/projects', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/photowall', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/music', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/timeline', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/tree', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  const chatterPages = chattersData.map(c => ({
    url: `/chatter/${c.slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
    lastModified: c.date ? new Date(c.date) : buildDate,
  }));

  const postPages = postsData.map(p => ({
    url: `/posts/${p.slug}`,
    priority: 0.9,
    changeFrequency: 'monthly' as const,
    lastModified: p.date ? new Date(p.date) : buildDate,
  }));

  const allPages = [...staticPages, ...chatterPages, ...postPages];

  return allPages.map(page => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.lastModified || buildDate,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
