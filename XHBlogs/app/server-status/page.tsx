"use client";

import { useEffect, useState, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';

interface ServerData {
  timestamp: number;
  quicklook: any;
  mem: any;
  load: any;
  fs: any[];
  network: any[];
  processlist: any[];
}

const DEFAULT_DATA: ServerData = {
  timestamp: 0,
  quicklook: null,
  mem: null,
  load: null,
  fs: [],
  network: [],
  processlist: [],
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes)) return '-';
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

function formatSpeed(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes)) return '-';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' MB/s';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB/s';
  return bytes + ' B/s';
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const safe = Math.min(100, Math.max(0, percent || 0));
  return (
    <div className="w-full h-3 rounded-full bg-slate-200/60 dark:bg-slate-700/50 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

function StatCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-slate-200/40 dark:shadow-black/20 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function ServerStatusPage() {
  const [data, setData] = useState<ServerData>(DEFAULT_DATA);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('加载中...');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/server-status', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setData(json);
      setError(false);
      setLastUpdate(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    } catch (e) {
      console.error('获取服务器状态失败:', e);
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const cpuPercent = data.quicklook?.cpu ?? 0;
  const memPercent = data.mem?.percent ?? data.quicklook?.mem ?? 0;
  const memUsed = formatBytes(data.mem?.used);
  const memTotal = formatBytes(data.mem?.total);
  const disk = data.fs && data.fs.length > 0 ? data.fs[0] : null;
  const diskPercent = disk?.percent ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950 transition-colors duration-500">
      <Navbar />
      <PageTransition>
        <main className="w-[90%] max-w-6xl mx-auto pt-28 pb-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                🖥️ 服务器状态
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                数据来源：Glances · 每 5 秒自动刷新 · 最后更新 {lastUpdate}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${error ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {error ? '连接异常' : '在线'}
              </span>
            </div>
          </div>

          {error ? (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 text-center">
              <p className="text-red-500 font-bold">😿 无法获取服务器状态，请确认 Glances 服务是否运行中</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* CPU */}
                <StatCard title="CPU" icon="⚙️">
                  <div className="text-4xl font-black text-slate-800 dark:text-white mb-3">
                    {typeof cpuPercent === 'number' ? cpuPercent.toFixed(1) : '-'}
                    <span className="text-lg text-slate-400">%</span>
                  </div>
                  <ProgressBar percent={cpuPercent} color="bg-indigo-500" />
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {data.quicklook?.cpu_name || '未知 CPU'}
                  </p>
                </StatCard>

                {/* 内存 */}
                <StatCard title="内存" icon="🧠">
                  <div className="text-4xl font-black text-slate-800 dark:text-white mb-3">
                    {typeof memPercent === 'number' ? memPercent.toFixed(1) : '-'}
                    <span className="text-lg text-slate-400">%</span>
                  </div>
                  <ProgressBar percent={memPercent} color="bg-sky-500" />
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    已用 {memUsed} / 总计 {memTotal}
                  </p>
                </StatCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 负载 */}
                <StatCard title="系统负载" icon="📊">
                  <div className="space-y-2">
                    {[
                      ['1 分钟', data.load?.min1],
                      ['5 分钟', data.load?.min5],
                      ['15 分钟', data.load?.min15],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">{label}</span>
                        <span className="font-black text-slate-700 dark:text-slate-200">
                          {typeof val === 'number' ? val.toFixed(2) : '-'}
                        </span>
                      </div>
                    ))}
                    <p className="text-xs text-slate-400 pt-1">核心数：{data.load?.cpucore ?? '-'}</p>
                  </div>
                </StatCard>

                {/* 磁盘 */}
                <StatCard title="磁盘" icon="💾">
                  <div className="text-4xl font-black text-slate-800 dark:text-white mb-3">
                    {typeof diskPercent === 'number' ? diskPercent.toFixed(1) : '-'}
                    <span className="text-lg text-slate-400">%</span>
                  </div>
                  <ProgressBar percent={diskPercent} color="bg-emerald-500" />
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {disk ? `${disk.mnt_point} · ${formatBytes(disk.used)} / ${formatBytes(disk.size)}` : '-'}
                  </p>
                </StatCard>

                {/* 网络 */}
                <StatCard title="网络" icon="🌐">
                  <div className="space-y-2">
                    {data.network
                      ?.filter((n: any) => n.interface_name !== 'lo')
                      .slice(0, 2)
                      .map((n: any) => (
                        <div key={n.interface_name} className="text-sm">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-600 dark:text-slate-300">{n.interface_name}</span>
                            <span className="text-slate-400 text-xs">↓{formatSpeed(n.bytes_recv_rate_per_sec)}</span>
                          </div>
                          <div className="text-right text-slate-400 text-xs">↑{formatSpeed(n.bytes_sent_rate_per_sec)}</div>
                        </div>
                      ))}
                    {(!data.network || data.network.filter((n: any) => n.interface_name !== 'lo').length === 0) && (
                      <p className="text-sm text-slate-400">暂无数据</p>
                    )}
                  </div>
                </StatCard>
              </div>

              {/* 进程排行 */}
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🚀</span>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-wider">进程排行 TOP 10</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-slate-200/60 dark:border-slate-600/40">
                        <th className="py-2 pr-4">PID</th>
                        <th className="py-2 pr-4">进程名</th>
                        <th className="py-2 pr-4">CPU%</th>
                        <th className="py-2 pr-4">内存%</th>
                        <th className="py-2">内存占用</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.processlist.map((p: any) => (
                        <tr key={p.pid} className="border-b border-slate-100/60 dark:border-slate-700/30">
                          <td className="py-2 pr-4 font-mono text-slate-500">{p.pid}</td>
                          <td className="py-2 pr-4 font-bold text-slate-700 dark:text-slate-200 truncate max-w-[220px]">
                            {p.name || p.cmdline || '-'}
                          </td>
                          <td className="py-2 pr-4 text-indigo-600 dark:text-indigo-400 font-bold">
                            {typeof p.cpu_percent === 'number' ? p.cpu_percent.toFixed(1) : '-'}
                          </td>
                          <td className="py-2 pr-4 text-sky-600 dark:text-sky-400 font-bold">
                            {typeof p.memory_percent === 'number' ? p.memory_percent.toFixed(1) : '-'}
                          </td>
                          <td className="py-2 text-slate-500">{formatBytes(p.memory_info?.rss)}</td>
                        </tr>
                      ))}
                      {data.processlist.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">暂无数据</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-slate-400">
                本页面每 5 秒自动刷新，数据由 Glances 实时采集
              </p>
            </>
          )}
        </main>
      </PageTransition>
    </div>
  );
}
