import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import ChatterBoard from './ChatterBoard';
import { siteConfig } from '@/siteConfig';
import { chattersData } from '@/data/content-data';

export const metadata = {
  title: "杂谈 | "+ siteConfig.title,
  description: "日常碎片与灵感记录",
};

export default function ChatterPage() {
  const chatters = chattersData
    .map(c => ({
      slug: c.slug,
      title: c.title || '',
      date: c.date || '未知时间',
      tags: c.tags || [],
      mood: c.mood || '',
      cover: c.cover || '',
      content: (c.content || '').replace(/^#+ .*\n/m, ''),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen relative pb-10">
      <Navbar />
      <PageTransition>
        <ChatterBoard chatters={chatters} />
      </PageTransition>
    </div>
  );
}