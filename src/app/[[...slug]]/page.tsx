'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Link2,
  Shield,
  Zap,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toaster, toast } from 'sonner';
import {
  encodeUrl,
  decodeZeroWidth,
  containsZeroWidthChars,
  visualizeZeroWidth,
  getEncodingInfo,
} from '@/lib/zero-width';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryItem {
  id: string;
  originalUrl: string;
  encodedPath: string;
  createdAt: number;
}

const HISTORY_KEY = 'zwc-link-history';

function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 30)));
}

// ---------------------------------------------------------------------------
// Step indicator icons for "How it works"
// ---------------------------------------------------------------------------

const STEPS = [
  {
    num: '01',
    title: '编码',
    desc: '将目标 URL 转为 UTF-8 字节，再用 4 种零宽字符进行 Base-4 编码，每个字符携带 2 bit 信息。',
    Icon: Shield,
  },
  {
    num: '02',
    title: '嵌入',
    desc: '编码后的零宽字符序列被嵌入到 URL 路径中。它们不占任何可见空间，链接看起来就是根路径。',
    Icon: Link2,
  },
  {
    num: '03',
    title: '解码跳转',
    desc: '访问者打开链接后，前端自动检测路径中的零宽字符，实时解码还原原始 URL 并立即跳转。',
    Icon: Zap,
  },
];

const CHAR_TABLE = [
  { code: 'U+200B', name: 'Zero Width Space', bits: '00' },
  { code: 'U+200C', name: 'ZW Non-Joiner', bits: '01' },
  { code: 'U+200D', name: 'ZW Joiner', bits: '10' },
  { code: 'U+FEFF', name: 'ZW No-Break', bits: '11' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ZeroWidthLinkPage() {
  const params = useParams();
  // Next.js decodes the path for us, but guard against double-encoding
  const slug = (params.slug as string[] | undefined) ?? undefined;
  // Next.js may pass percent-encoded characters; decode them so we can detect ZWCs
  const pathSegment = slug
    ? decodeURIComponent(slug.join('/'))
    : '';

  // -- derived route info (no effect needed) --
  const routeMode = useMemo((): 'generator' | 'redirect' => {
    if (pathSegment && containsZeroWidthChars(pathSegment)) {
      try {
        decodeZeroWidth(pathSegment); // validate
        return 'redirect';
      } catch {
        return 'generator';
      }
    }
    return 'generator';
  }, [pathSegment]);

  const decodedUrl = useMemo(() => {
    if (routeMode !== 'redirect' || !pathSegment) return '';
    try {
      return decodeZeroWidth(pathSegment);
    } catch {
      return '';
    }
  }, [routeMode, pathSegment]);

  // -- state --
  const [url, setUrl] = useState('');
  const [encoded, setEncoded] = useState('');
  const [copied, setCopied] = useState(false);
  const [showEncoded, setShowEncoded] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => getHistory());
  const [isRedirecting, setIsRedirecting] = useState(routeMode === 'redirect');
  const [encodingInfo, setEncodingInfo] = useState<
    ReturnType<typeof getEncodingInfo> | null
  >(null);
  const origin = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  // -- redirect timer (no setState) --
  useEffect(() => {
    if (routeMode === 'redirect' && isRedirecting && decodedUrl) {
      const timer = setTimeout(() => {
        window.location.href = decodedUrl;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [routeMode, isRedirecting, decodedUrl]);

  // -- actions --
  const handleGenerate = useCallback(() => {
    const raw = url.trim();
    if (!raw) {
      toast.error('请输入有效的 URL');
      return;
    }
    let normalized = raw;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }
    try {
      const enc = encodeUrl(normalized);
      setEncoded(enc);
      setEncodingInfo(getEncodingInfo(normalized));
      const item: HistoryItem = {
        id: Date.now().toString(36),
        originalUrl: normalized,
        encodedPath: enc,
        createdAt: Date.now(),
      };
      const next = [item, ...history].slice(0, 30);
      setHistory(next);
      saveHistory(next);
      toast.success('链接生成成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '编码失败');
    }
  }, [url, history]);

  const handleCopy = useCallback(async () => {
    const full = `${origin}/${encoded}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      toast.success('隐形链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动选中复制');
    }
  }, [encoded, origin]);

  const handleTest = useCallback(() => {
    window.open(`${origin}/${encoded}`, '_blank');
  }, [encoded, origin]);

  const handleLoadHistory = useCallback((item: HistoryItem) => {
    setUrl(item.originalUrl);
    setEncoded(item.encodedPath);
    setEncodingInfo(getEncodingInfo(item.originalUrl));
  }, []);

  const handleDeleteHistory = useCallback(
    (id: string) => {
      const next = history.filter((h) => h.id !== id);
      setHistory(next);
      saveHistory(next);
    },
    [history],
  );

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
    toast.success('历史记录已清空');
  }, []);

  // ===================================================================
  // Redirect screen
  // ===================================================================
  if (routeMode === 'redirect') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center relative overflow-hidden">
        {/* bg effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center px-6"
        >
          <motion.div
            className="w-16 h-16 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <h1 className="text-2xl font-bold mb-3">正在跳转</h1>
          <p className="text-emerald-400/80 font-mono text-sm max-w-md break-all mb-8">
            {decodedUrl}
          </p>
          <Button
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setIsRedirecting(false)}
          >
            取消跳转
          </Button>
        </motion.div>

        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ===================================================================
  // Generator page
  // ===================================================================
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden flex flex-col">
      {/* ---- animated background ---- */}
      <div className="fixed inset-0 pointer-events-none select-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/[0.07] rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-emerald-600/[0.07] rounded-full blur-[140px]" />
      </div>

      {/* ---- content ---- */}
      <main className="relative z-10 flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          {/* ---- Hero ---- */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium tracking-wide">
                零宽隐形链接生成器
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                看不见的链接
              </span>
            </h1>

            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              使用 UTF-8 零宽字符编码 URL，生成视觉上完全不可见的隐形短链接。
              <br className="hidden sm:block" />
              所有链接看起来都是{' '}
              <code className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-sm font-mono">
                /
              </code>
              ，但暗藏玄机。
            </p>
          </motion.section>

          {/* ---- Generator Card ---- */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Card className="bg-[#111111]/80 border-emerald-500/20 backdrop-blur-sm mb-10">
              <CardContent className="p-5 sm:p-6">
                {/* Input row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="输入目标 URL，例如 https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className="flex-1 bg-[#0a0a0a] border-emerald-500/20 focus:border-emerald-500/50 text-white placeholder:text-gray-600 font-mono text-sm h-11"
                  />
                  <Button
                    onClick={handleGenerate}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 h-11 min-w-[120px]"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    生成链接
                  </Button>
                </div>

                {/* ---- Encoded Output ---- */}
                <AnimatePresence>
                  {encoded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6">
                        {/* meta row */}
                        <div className="flex items-center gap-2 mb-3">
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-400 text-xs"
                          >
                            生成结果
                          </Badge>
                          {encodingInfo && (
                            <span className="text-gray-500 text-xs">
                              {encodingInfo.originalLength} 字符 →{' '}
                              {encodingInfo.encodedLength} 零宽字符
                            </span>
                          )}
                        </div>

                        {/* visual URL box */}
                        <div className="bg-[#0a0a0a] rounded-lg border border-emerald-500/20 p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-500 text-xs">
                              隐形链接（零宽字符不可见）
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-emerald-400 h-7 text-xs gap-1"
                              onClick={() => setShowEncoded((v) => !v)}
                            >
                              {showEncoded ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                              {showEncoded ? '隐藏编码' : '显示编码'}
                            </Button>
                          </div>

                          {/* what the link "looks like" */}
                          <div className="font-mono text-sm break-all leading-relaxed select-all">
                            <span className="text-gray-400">{origin}</span>
                            <span className="text-emerald-400">/</span>
                            <span
                              className="text-emerald-300/60"
                              title="此处包含不可见的零宽字符"
                            >
                              {/* invisible chars are here */}
                              {showEncoded
                                ? visualizeZeroWidth(encoded)
                                : '\u200B'.repeat(
                                    Math.min(encoded.length, 60),
                                  )}
                            </span>
                          </div>

                          <AnimatePresence>
                            {showEncoded && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 text-xs text-gray-600 font-mono break-all overflow-hidden"
                              >
                                可视化: {visualizeZeroWidth(encoded)}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* action buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCopy}
                            variant="outline"
                            className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 mr-2" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            {copied ? '已复制' : '复制隐形链接'}
                          </Button>
                          <Button
                            onClick={handleTest}
                            variant="outline"
                            className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            测试
                          </Button>
                        </div>

                        {/* char usage breakdown */}
                        {encodingInfo && (
                          <div className="mt-4 grid grid-cols-4 gap-3">
                            {Object.entries(encodingInfo.charCount).map(
                              ([name, count]) => (
                                <div
                                  key={name}
                                  className="bg-[#0a0a0a] rounded-lg p-3 border border-gray-800 text-center"
                                >
                                  <div className="text-emerald-400 font-mono text-lg font-bold">
                                    {count}
                                  </div>
                                  <div className="text-gray-500 text-[11px]">
                                    {name}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.section>

          {/* ---- How It Works ---- */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mb-10"
          >
            <h2 className="text-xl font-bold mb-6 text-center">工作原理</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STEPS.map((s) => (
                <Card
                  key={s.num}
                  className="bg-[#111111]/80 border-gray-800 hover:border-emerald-500/30 transition-colors group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                        <s.Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-emerald-400/60 font-mono">
                        {s.num}
                      </span>
                    </div>
                    <h3 className="font-semibold mb-2">{s.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {s.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ---- Character Reference ---- */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mb-10"
          >
            <Card className="bg-[#111111]/80 border-gray-800">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4">零宽字符参考表</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CHAR_TABLE.map((c) => (
                    <div
                      key={c.code}
                      className="bg-[#0a0a0a] rounded-lg p-3 border border-gray-800 text-center"
                    >
                      <div className="text-emerald-400 font-mono text-sm font-bold">
                        {c.code}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">{c.name}</div>
                      <div className="mt-2 inline-block px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 font-mono text-xs text-emerald-300">
                        {c.bits}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ---- History ---- */}
          {history.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">历史记录</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-red-400 gap-1"
                  onClick={handleClearHistory}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空
                </Button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {history.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && handleLoadHistory(item)
                    }
                    className="flex items-center gap-3 bg-[#111111]/80 border border-gray-800 rounded-lg p-3 hover:border-emerald-500/30 transition-colors group cursor-pointer"
                    onClick={() => handleLoadHistory(item)}
                  >
                    <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{item.originalUrl}</p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 h-8 w-8 p-0 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistory(item.id);
                      }}
                      aria-label="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>

      {/* ---- Footer ---- */}
      <footer className="relative z-10 border-t border-gray-800/50 py-6 mt-auto">
        <p className="text-center text-gray-600 text-sm">
          Zero-Width Link Generator · 使用零宽字符编码的隐形链接工具
        </p>
      </footer>

      <Toaster richColors position="top-center" />
    </div>
  );
}
