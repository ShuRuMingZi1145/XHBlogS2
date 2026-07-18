import Link from 'next/link';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import { siteConfig } from '../../siteConfig';
import { postsData } from '../../data/content-data';

export const metadata = {
  title: "文章 | " + siteConfig.title,
  description: "博客文章列表",
};

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function PostsPage() {
  const posts = [...postsData]
    .map(p => ({
      slug: p.slug,
      title: p.title || '',
      date: p.date || '',
      formattedDate: formatDate(p.date || ''),
      description: p.description || (p.content || '').substring(0, 120),
      cover: p.cover || siteConfig.defaultPostCover,
      tags: p.tags || [],
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen relative pb-10">
      <Navbar />
      <PageTransition>
        <main className="w-[95%] md:w-[90%] max-w-4xl mx-auto mt-24 md:mt-28 relative z-10">
          <div className="mb-10">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-3">文章</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              共 {posts.length} 篇
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {posts.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                <p className="text-lg font-medium">暂无文章</p>
              </div>
            ) : (
              posts.map((post, index) => (
                <Link
                  key={post.slug}
                  href={`/posts/${post.slug}`}
                  className="group block bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-[32px] border border-white/40 dark:border-white/10 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]"
                >
                  <div className="flex flex-col md:flex-row">
                    {post.cover && (
                      <div className="md:w-56 h-48 md:h-auto flex-shrink-0 overflow-hidden">
                        <img
                          src={post.cover}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium mb-2">
                        <span>{post.formattedDate}</span>
                        {post.tags.length > 0 && (
                          <span className="flex gap-1.5">
                            {post.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold">
                                #{tag}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {post.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
