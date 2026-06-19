import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Locale detection by timezone
// ---------------------------------------------------------------------------

export type Locale = 'zh-CN' | 'zh-TW' | 'en';

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Shanghai') return 'zh-CN';
    if (
      tz === 'Asia/Hong_Kong' ||
      tz === 'Asia/Macau' ||
      tz === 'Asia/Taipei'
    ) {
      return 'zh-TW';
    }
  } catch {
    // fallback
  }
  return 'en';
}

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

type Dict = typeof dictionaries.en;

const dictionaries = {
  en: {
    badge: 'Zero-Width Link Generator',
    title: 'Invisible Links',
    description: [
      'Encode URLs using UTF-8 zero-width characters to create visually',
      'identical short links.',
      'Every link looks exactly like',
      'to the naked eye.',
    ],
    inputPlaceholder: 'Enter target URL, e.g. https://example.com',
    generate: 'Generate',
    result: 'Result',
    charsToZwc: (orig: number, enc: number) =>
      `${orig} chars \u2192 ${enc} zero-width chars`,
    invisibleLinkLabel: 'Invisible link (zero-width chars hidden)',
    show: 'Show',
    hide: 'Hide',
    visualized: (v: string) => `Visualized: ${v}`,
    copied: 'Copied',
    copyLink: 'Copy invisible link',
    test: 'Test',
    howItWorks: 'How It Works',
    charReference: 'Zero-Width Character Reference',
    history: 'History',
    clear: 'Clear',
    footer: 'Zero-Width Link Generator',
    redirecting: 'Redirecting',
    cancel: 'Cancel',
    toastGenerated: 'Link generated',
    toastCopied: 'Invisible link copied to clipboard',
    toastCopyFailed: 'Copy failed, please select and copy manually',
    toastHistoryCleared: 'History cleared',
    toastInvalidUrl: 'Please enter a valid URL',
    // steps
    step1Title: 'Encode',
    step1Desc: 'The target URL is converted to UTF-8 bytes, then encoded with 4 zero-width characters in Base-4. Each character carries 2 bits of information.',
    step2Title: 'Embed',
    step2Desc: 'The encoded zero-width character sequence is embedded into the URL path. It occupies no visible space, so the link looks identical to the root path.',
    step3Title: 'Decode & Redirect',
    step3Desc: 'When a visitor opens the link, the frontend automatically detects the zero-width characters, decodes the original URL, and redirects immediately.',
    // char table
    zws: 'Zero Width Space',
    zwnj: 'ZW Non-Joiner',
    zwj: 'ZW Joiner',
    zwbsp: 'ZW No-Break',
    // date locale
    dateLocale: 'en-US' as const,
  },
  'zh-CN': {
    badge: '\u96F6\u5BBD\u9690\u5F62\u94FE\u63A5\u751F\u6210\u5668',
    title: '\u770B\u4E0D\u89C1\u7684\u94FE\u63A5',
    description: [
      '\u4F7F\u7528 UTF-8 \u96F6\u5BBD\u5B57\u7B26\u7F16\u7801 URL\uFF0C\u751F\u6210\u89C6\u89C9\u4E0A\u5B8C\u5168\u4E0D\u53EF\u89C1\u7684\u9690\u5F62\u77ED\u94FE\u63A5\u3002',
      '\u6240\u6709\u94FE\u63A5\u770B\u8D77\u6765\u90FD\u662F',
      '\uFF0C\u4F46\u6697\u85CF\u7740\u76EE\u6807\u5730\u5740\u3002',
    ],
    inputPlaceholder: '\u8F93\u5165\u76EE\u6807 URL\uFF0C\u4F8B\u5982 https://example.com',
    generate: '\u751F\u6210\u94FE\u63A5',
    result: '\u751F\u6210\u7ED3\u679C',
    charsToZwc: (orig: number, enc: number) =>
      `${orig} \u5B57\u7B26 \u2192 ${enc} \u96F6\u5BBD\u5B57\u7B26`,
    invisibleLinkLabel: '\u9690\u5F62\u94FE\u63A5\uFF08\u96F6\u5BBD\u5B57\u7B26\u4E0D\u53EF\u89C1\uFF09',
    show: '\u663E\u793A',
    hide: '\u9690\u85CF',
    visualized: (v: string) => `\u53EF\u89C6\u5316: ${v}`,
    copied: '\u5DF2\u590D\u5236',
    copyLink: '\u590D\u5236\u9690\u5F62\u94FE\u63A5',
    test: '\u6D4B\u8BD5',
    howItWorks: '\u5DE5\u4F5C\u539F\u7406',
    charReference: '\u96F6\u5BBD\u5B57\u7B26\u53C2\u8003\u8868',
    history: '\u5386\u53F2\u8BB0\u5F55',
    clear: '\u6E05\u7A7A',
    footer: '\u96F6\u5BBD\u9690\u5F62\u94FE\u63A5\u751F\u6210\u5668',
    redirecting: '\u6B63\u5728\u8DF3\u8F6C',
    cancel: '\u53D6\u6D88\u8DF3\u8F6C',
    toastGenerated: '\u94FE\u63A5\u751F\u6210\u6210\u529F',
    toastCopied: '\u9690\u5F62\u94FE\u63A5\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F',
    toastCopyFailed: '\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u4E2D\u590D\u5236',
    toastHistoryCleared: '\u5386\u53F2\u8BB0\u5F55\u5DF2\u6E05\u7A7A',
    toastInvalidUrl: '\u8BF7\u8F93\u5165\u6709\u6548\u7684 URL',
    step1Title: '\u7F16\u7801',
    step1Desc: '\u5C06\u76EE\u6807 URL \u8F6C\u4E3A UTF-8 \u5B57\u8282\uFF0C\u518D\u7528 4 \u79CD\u96F6\u5BBD\u5B57\u7B26\u8FDB\u884C Base-4 \u7F16\u7801\uFF0C\u6BCF\u4E2A\u5B57\u7B26\u643A\u5E26 2 bit \u4FE1\u606F\u3002',
    step2Title: '\u5D4C\u5165',
    step2Desc: '\u7F16\u7801\u540E\u7684\u96F6\u5BBD\u5B57\u7B26\u5E8F\u5217\u88AB\u5D4C\u5165\u5230 URL \u8DEF\u5F84\u4E2D\u3002\u5B83\u4EEC\u4E0D\u5360\u4EFB\u4F55\u53EF\u89C1\u7A7A\u95F4\uFF0C\u94FE\u63A5\u770B\u8D77\u6765\u5C31\u662F\u6839\u8DEF\u5F84\u3002',
    step3Title: '\u89E3\u7801\u8DF3\u8F6C',
    step3Desc: '\u8BBF\u95EE\u8005\u6253\u5F00\u94FE\u63A5\u540E\uFF0C\u524D\u7AEF\u81EA\u52A8\u68C0\u6D4B\u8DEF\u5F84\u4E2D\u7684\u96F6\u5BBD\u5B57\u7B26\uFF0C\u5B9E\u65F6\u89E3\u7801\u8FD8\u539F\u539F\u59CB URL \u5E76\u7ACB\u5373\u8DF3\u8F6C\u3002',
    zws: '\u96F6\u5BBD\u7A7A\u683C',
    zwnj: '\u96F6\u5BBD\u975E\u8FDE\u63A5\u7B26',
    zwj: '\u96F6\u5BBD\u8FDE\u63A5\u7B26',
    zwbsp: '\u96F6\u5BBD\u4E0D\u65AD\u884C\u7A7A\u683C',
    dateLocale: 'zh-CN' as const,
  },
  'zh-TW': {
    badge: '\u96F6\u5BBD\u9690\u5F62\u9023\u7D50\u751F\u6210\u5668',
    title: '\u770B\u4E0D\u898B\u7684\u9023\u7D50',
    description: [
      '\u4F7F\u7528 UTF-8 \u96F6\u5BBD\u5B57\u5143\u7DE8\u78BC URL\uFF0C\u7522\u751F\u8996\u89BA\u4E0A\u5B8C\u5168\u4E0D\u53EF\u898B\u7684\u9690\u5F62\u77ED\u9023\u7D50\u3002',
      '\u6240\u6709\u9023\u7D50\u770B\u8D77\u4F86\u90FD\u662F',
      '\uFF0C\u4F46\u96B1\u85CF\u8457\u76EE\u6A19\u5730\u5740\u3002',
    ],
    inputPlaceholder: '\u8F38\u5165\u76EE\u6A19 URL\uFF0C\u4F8B\u5982 https://example.com',
    generate: '\u7522\u751F\u9023\u7D50',
    result: '\u7522\u751F\u7D50\u679C',
    charsToZwc: (orig: number, enc: number) =>
      `${orig} \u5B57\u5143 \u2192 ${enc} \u96F6\u5BBD\u5B57\u5143`,
    invisibleLinkLabel: '\u9690\u5F62\u9023\u7D50\uFF08\u96F6\u5BBD\u5B57\u5143\u4E0D\u53EF\u898B\uFF09',
    show: '\u986F\u793A',
    hide: '\u96B1\u85CF',
    visualized: (v: string) => `\u53EF\u8996\u5316: ${v}`,
    copied: '\u5DF2\u8907\u88FD',
    copyLink: '\u8907\u88FD\u9690\u5F62\u9023\u7D50',
    test: '\u6E2C\u8A66',
    howItWorks: '\u904B\u4F5C\u539F\u7406',
    charReference: '\u96F6\u5BBD\u5B57\u5143\u53C3\u8003\u8868',
    history: '\u6B77\u53F2\u8A18\u9304',
    clear: '\u6E05\u7A7A',
    footer: '\u96F6\u5BBD\u9690\u5F62\u9023\u7D50\u751F\u6210\u5668',
    redirecting: '\u6B63\u5728\u8DF3\u8F49',
    cancel: '\u53D6\u6D88\u8DF3\u8F49',
    toastGenerated: '\u9023\u7D50\u7522\u751F\u6210\u529F',
    toastCopied: '\u9690\u5F62\u9023\u7D50\u5DF2\u8907\u88FD\u5230\u526A\u8CBC\u677F',
    toastCopyFailed: '\u8907\u88FD\u5931\u6557\uFF0C\u8ACB\u624B\u52D5\u9078\u4E2D\u8907\u88FD',
    toastHistoryCleared: '\u6B77\u53F2\u8A18\u9304\u5DF2\u6E05\u7A7A',
    toastInvalidUrl: '\u8ACB\u8F38\u5165\u6709\u6548\u7684 URL',
    step1Title: '\u7DE8\u78BC',
    step1Desc: '\u5C07\u76EE\u6A19 URL \u8F49\u70BA UTF-8 \u4F4D\u5143\u7D44\uFF0C\u518D\u7528 4 \u7A2E\u96F6\u5BBD\u5B57\u5143\u9032\u884C Base-4 \u7DE8\u78BC\uFF0C\u6BCF\u500B\u5B57\u5143\u643A\u5E36 2 bit \u8CC7\u8A0A\u3002',
    step2Title: '\u5D4C\u5165',
    step2Desc: '\u7DE8\u78BC\u5F8C\u7684\u96F6\u5BBD\u5B57\u5143\u5E8F\u5217\u88AB\u5D4C\u5165\u5230 URL \u8DEF\u5F91\u4E2D\u3002\u5B83\u5011\u4E0D\u5360\u4EFB\u4F55\u53EF\u898B\u7A7A\u9593\uFF0C\u9023\u7D50\u770B\u8D77\u4F86\u5C31\u662F\u6839\u8DEF\u5F91\u3002',
    step3Title: '\u89E3\u78BC\u8DF3\u8F49',
    step3Desc: '\u8A2A\u555E\u8005\u6253\u958B\u9023\u7D50\u5F8C\uFF0C\u524D\u7AEF\u81EA\u52D5\u6AA2\u6E2C\u8DEF\u5F91\u4E2D\u7684\u96F6\u5BBD\u5B57\u5143\uFF0C\u5373\u6642\u89E3\u78BC\u9084\u539F\u539F\u59CB URL \u4E26\u7ACB\u5373\u8DF3\u8F49\u3002',
    zws: '\u96F6\u5BBD\u7A7A\u683C',
    zwnj: '\u96F6\u5BBD\u975E\u9023\u7D50\u7B26',
    zwj: '\u96F6\u5BBD\u9023\u7D50\u7B26',
    zwbsp: '\u96F6\u5BBD\u4E0D\u65B7\u884C\u7A7A\u683C',
    dateLocale: 'zh-TW' as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useT() {
  const locale = useMemo(() => detectLocale(), []);
  const dict = useMemo((): Dict => dictionaries[locale], [locale]);
  return { t: dict, locale };
}
