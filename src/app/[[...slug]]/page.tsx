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
import { useT } from '@/lib/i18n';

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
// Character table (Unicode codes are universal)
// ---------------------------------------------------------------------------

const CHAR_TABLE = [
  { code: 'U+200B', key: 'zws' as const, bits: '00' },
  { code: 'U+200C', key: 'zwnj' as const, bits: '01' },
  { code: 'U+200D', key: 'zwj' as const, bits: '10' },
  { code: 'U+FEFF', key: 'zwbsp' as const, bits: '11' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ZeroWidthLinkPage() {
  const { t } = useT();
  const params = useParams();
  const slug = (params.slug as string[] | undefined) ?? undefined;
  const pathSegment = slug
    ? decodeURIComponent(slug.join('/'))
    : '';

  // -- steps with i18n keys --
  const steps = useMemo(
    () => [
      { num: '01', title: t.step1Title, desc: t.step1Desc, Icon: Shield },
      { num: '02', title: t.step2Title, desc: t.step2Desc, Icon: Link2 },
      { num: '03', title: t.step3Title, desc: t.step3Desc, Icon: Zap },
    ],
    [t],
  );

  // -- derived route info --
  const routeMode = useMemo((): 'generator' | 'redirect' => {
    if (pathSegment && containsZeroWidthChars(pathSegment)) {
      try {
        decodeZeroWidth(pathSegment);
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
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
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

  // -- redirect timer --
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
      toast.error(t.toastInvalidUrl);
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
      toast.success(t.toastGenerated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Encoding failed');
    }
  }, [url, history, t]);

  const handleCopy = useCallback(async () => {
    const full = `${origin}/${encoded}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      toast.success(t.toastCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.toastCopyFailed);
    }
  }, [encoded, origin, t]);

  const handleCopyHistory = useCallback(async (item: HistoryItem) => {
    const full = `${origin}/${item.encodedPath}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedHistoryId(item.id);
      toast.success(t.toastCopied);
      setTimeout(() => setCopiedHistoryId(null), 2000);
    } catch {
      toast.error(t.toastCopyFailed);
    }
  }, [origin, t]);

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
    toast.success(t.toastHistoryCleared);
  }, [t]);

  // ===================================================================
  // Redirect screen
  // ===================================================================
  if (routeMode === 'redirect') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center px-6"
        >
          <motion.div
            className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <h1 className="text-2xl font-bold mb-3">{t.redirecting}</h1>
          <p className="text-muted-foreground font-mono text-sm max-w-md break-all mb-8">
            {decodedUrl}
          </p>
          <Button
            variant="outline"
            onClick={() => setIsRedirecting(false)}
          >
            {t.cancel}
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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      {/* ---- subtle grid background ---- */}
      <div className="fixed inset-0 pointer-events-none select-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[140px]" />
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
            <div className="inline-flex items-center gap-2 bg-muted border border-border rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-3.5 h-3.5 text-foreground" />
              <span className="text-muted-foreground text-xs font-medium tracking-wide">
                {t.badge}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              {t.title}
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              {t.description[0]}
              <br className="hidden sm:block" />
              {t.description[1]}{' '}
              <code className="bg-muted text-foreground px-2 py-0.5 rounded text-sm font-mono">
                /
              </code>{' '}
              {t.description[2]}
            </p>
          </motion.section>

          {/* ---- Generator Card ---- */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Card className="border-border backdrop-blur-sm mb-10">
              <CardContent className="p-5 sm:p-6">
                {/* Input row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder={t.inputPlaceholder}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className="flex-1 bg-background border-border focus:border-primary/50 font-mono text-sm h-11"
                  />
                  <Button
                    onClick={handleGenerate}
                    className="bg-foreground hover:bg-foreground/90 text-background font-medium px-6 h-11 min-w-[120px]"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {t.generate}
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
                          <Badge variant="outline" className="text-xs">
                            {t.result}
                          </Badge>
                          {encodingInfo && (
                            <span className="text-muted-foreground text-xs">
                              {t.charsToZwc(
                                encodingInfo.originalLength,
                                encodingInfo.encodedLength,
                              )}
                            </span>
                          )}
                        </div>

                        {/* visual URL box */}
                        <div className="bg-muted rounded-lg border border-border p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-muted-foreground text-xs">
                              {t.invisibleLinkLabel}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground h-7 text-xs gap-1"
                              onClick={() => setShowEncoded((v) => !v)}
                            >
                              {showEncoded ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                              {showEncoded ? t.hide : t.show}
                            </Button>
                          </div>

                          {/* what the link "looks like" */}
                          <div className="font-mono text-sm break-all leading-relaxed select-all">
                            <span className="text-muted-foreground">{origin}</span>
                            <span className="text-foreground">/</span>
                            <span
                              className="text-muted-foreground/50"
                            >
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
                                className="mt-2 text-xs text-muted-foreground font-mono break-all overflow-hidden"
                              >
                                {t.visualized(visualizeZeroWidth(encoded))}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* action buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCopy}
                            variant="outline"
                            className="flex-1 text-foreground"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 mr-2" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            {copied ? t.copied : t.copyLink}
                          </Button>
                          <Button
                            onClick={handleTest}
                            variant="outline"
                            className="text-foreground"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {t.test}
                          </Button>
                        </div>

                        {/* char usage breakdown */}
                        {encodingInfo && (
                          <div className="mt-4 grid grid-cols-4 gap-3">
                            {Object.entries(encodingInfo.charCount).map(
                              ([name, count]) => (
                                <div
                                  key={name}
                                  className="bg-muted rounded-lg p-3 border border-border text-center"
                                >
                                  <div className="text-foreground font-mono text-lg font-bold">
                                    {count}
                                  </div>
                                  <div className="text-muted-foreground text-[11px]">
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
            <h2 className="text-xl font-bold mb-6 text-center">{t.howItWorks}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {steps.map((s) => (
                <Card
                  key={s.num}
                  className="border-border hover:border-primary/30 transition-colors group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground group-hover:bg-muted-foreground/10 transition-colors">
                        <s.Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {s.num}
                      </span>
                    </div>
                    <h3 className="font-semibold mb-2">{s.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
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
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4">{t.charReference}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CHAR_TABLE.map((c) => (
                    <div
                      key={c.code}
                      className="bg-muted rounded-lg p-3 border border-border text-center"
                    >
                      <div className="text-foreground font-mono text-sm font-bold">
                        {c.code}
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {t[c.key]}
                      </div>
                      <div className="mt-2 inline-block px-2 py-0.5 bg-background rounded border border-border font-mono text-xs text-foreground">
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
                <h2 className="text-xl font-bold">{t.history}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive gap-1"
                  onClick={handleClearHistory}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t.clear}
                </Button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && handleLoadHistory(item)
                    }
                    className="flex items-center gap-3 border border-border rounded-lg p-3 hover:border-primary/30 transition-colors group cursor-pointer"
                    onClick={() => handleLoadHistory(item)}
                  >
                    <Link2 className="w-4 h-4 text-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">
                        {item.originalUrl}
                      </p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {new Date(item.createdAt).toLocaleString(t.dateLocale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyHistory(item);
                        }}
                        aria-label={t.copyHistory}
                      >
                        {copiedHistoryId === item.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(item.id);
                        }}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>

      {/* ---- Footer ---- */}
      <footer className="relative z-10 border-t border-border py-6 mt-auto">
        <p className="text-center text-muted-foreground text-sm">
          {t.footer}
        </p>
      </footer>

      <Toaster richColors position="top-center" />
    </div>
  );
}
