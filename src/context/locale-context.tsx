"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Locale = "ID" | "EN" | "JA" | "KO" | "ZH" | "AR" | "ES";
export type Currency = "IDR" | "USD" | "JPY" | "KRW" | "CNY" | "SAR" | "EUR";

export interface LocaleInfo {
  code: Locale;
  label: string;
  nativeLabel: string;
  flag: string;
  defaultCurrency: Currency;
  dir?: "ltr" | "rtl";
}

export interface CurrencyInfo {
  code: Currency;
  label: string;
  symbol: string;
  rateAgainstIdr: number; // 1 Unit = X IDR
}

export const LOCALES: Record<Locale, LocaleInfo> = {
  ID: { code: "ID", label: "Indonesia", nativeLabel: "Bahasa Indonesia", flag: "🇮🇩", defaultCurrency: "IDR" },
  EN: { code: "EN", label: "English", nativeLabel: "English", flag: "🇺🇸", defaultCurrency: "USD" },
  JA: { code: "JA", label: "Japanese", nativeLabel: "日本語", flag: "🇯🇵", defaultCurrency: "JPY" },
  KO: { code: "KO", label: "Korean", nativeLabel: "한국어", flag: "🇰🇷", defaultCurrency: "KRW" },
  ZH: { code: "ZH", label: "Mandarin", nativeLabel: "中文", flag: "🇨🇳", defaultCurrency: "CNY" },
  AR: { code: "AR", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦", defaultCurrency: "SAR", dir: "rtl" },
  ES: { code: "ES", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸", defaultCurrency: "EUR" },
};

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  IDR: { code: "IDR", label: "Indonesian Rupiah", symbol: "Rp", rateAgainstIdr: 1 },
  USD: { code: "USD", label: "US Dollar", symbol: "$", rateAgainstIdr: 16000 },
  JPY: { code: "JPY", label: "Japanese Yen", symbol: "¥", rateAgainstIdr: 105 },
  KRW: { code: "KRW", label: "Korean Won", symbol: "₩", rateAgainstIdr: 11.5 },
  CNY: { code: "CNY", label: "Chinese Yuan", symbol: "¥", rateAgainstIdr: 2200 },
  SAR: { code: "SAR", label: "Saudi Riyal", symbol: "﷼", rateAgainstIdr: 4250 },
  EUR: { code: "EUR", label: "Euro", symbol: "€", rateAgainstIdr: 17200 },
};

export const DEFAULT_CURRENCY_FOR_LOCALE: Record<Locale, Currency> = {
  ID: "IDR",
  EN: "USD",
  JA: "JPY",
  KO: "KRW",
  ZH: "CNY",
  AR: "SAR",
  ES: "EUR",
};

export const SUPPORTED_LANGUAGES = Object.values(LOCALES).map((loc) => ({
  code: loc.code,
  name: loc.nativeLabel,
  flag: loc.flag,
}));

export const SUPPORTED_CURRENCIES = Object.values(CURRENCIES).map((c) => ({
  code: c.code,
  name: c.label,
  symbol: c.symbol,
  rateAgainstIdr: c.rateAgainstIdr,
}));

export const DICTIONARY: Record<Locale, Record<string, string>> = {
  ID: {
    nav_home: "Beranda",
    nav_community: "Komunitas",
    nav_forum: "Forum Diskusi",
    nav_news: "Warta & Berita",
    nav_leaderboard: "Papan Peringkat",
    nav_arena: "Arena & Mabar",
    nav_lfg: "Cari Teman Mabar (LFG)",
    nav_tournaments: "Turnamen & Bagan",
    nav_hall_of_winners: "Hall of Winners",
    nav_marketplace: "Marketplace",
    nav_guild: "Guild",
    nav_donate: "Treasury & Donasi",
    nav_rules: "Aturan & Kasta",
    nav_admin: "Dashboard Admin",
    nav_profile: "Profil & Pengaturan",
    nav_messages: "Pesan Pribadi",
    nav_logout: "Keluar",
    nav_login: "Masuk via Discord",
    common_party: "Party Mabar",
    common_tournament: "Turnamen",
    common_prizepool: "Total Hadiah",
    common_rank: "Kasta & Reputasi",
    common_currency: "Mata Uang",
    common_language: "Pilih Bahasa",
    common_regional: "Preferensi Regional",
    common_share: "Bagikan",
    common_follow: "Ikuti",
    common_following: "Mengikuti",
    common_chat_pm: "Kirim Pesan (PM)",
  },
  EN: {
    nav_home: "Home",
    nav_community: "Community",
    nav_forum: "Discussion Forum",
    nav_news: "News & Dispatch",
    nav_leaderboard: "Leaderboard",
    nav_arena: "Arena & Squad",
    nav_lfg: "Find Teammates (LFG)",
    nav_tournaments: "Tournaments & Brackets",
    nav_hall_of_winners: "Hall of Winners",
    nav_marketplace: "Marketplace",
    nav_guild: "Guild",
    nav_donate: "Treasury & Donate",
    nav_rules: "Rules & Castes",
    nav_admin: "Admin Command",
    nav_profile: "Profile & Settings",
    nav_messages: "Private Messages",
    nav_logout: "Log Out",
    nav_login: "Login with Discord",
    common_party: "Squad Party",
    common_tournament: "Tournament",
    common_prizepool: "Prize Pool",
    common_rank: "Caste & Reputation",
    common_currency: "Currency",
    common_language: "Select Language",
    common_regional: "Regional Preferences",
    common_share: "Share",
    common_follow: "Follow",
    common_following: "Following",
    common_chat_pm: "Send PM",
  },
  JA: {
    nav_home: "ホーム",
    nav_community: "コミュニティ",
    nav_forum: "フォーラム掲示板",
    nav_news: "ギルドニュース",
    nav_leaderboard: "ランキング",
    nav_arena: "アリーナ＆募集",
    nav_lfg: "パーティー募集 (LFG)",
    nav_tournaments: "大会＆トーナメント表",
    nav_hall_of_winners: "栄誉の殿堂",
    nav_marketplace: "取引所",
    nav_guild: "ギルド",
    nav_donate: "国庫＆支援",
    nav_rules: "階級＆規則",
    nav_admin: "管理者コンソール",
    nav_profile: "プロフィール設定",
    nav_messages: "個人メッセージ",
    nav_logout: "ログアウト",
    nav_login: "Discordでログイン",
    common_party: "パーティー",
    common_tournament: "大会",
    common_prizepool: "賞金総額",
    common_rank: "階級と評判",
    common_currency: "通貨",
    common_language: "言語選択",
    common_regional: "地域設定",
    common_share: "共有",
    common_follow: "フォロー",
    common_following: "フォロー中",
    common_chat_pm: "メッセージ送信",
  },
  KO: {
    nav_home: "홈",
    nav_community: "커뮤니티",
    nav_forum: "토론 포럼",
    nav_news: "길드 소식",
    nav_leaderboard: "리더보드",
    nav_arena: "아레나 & 파티",
    nav_lfg: "파티원 찾기 (LFG)",
    nav_tournaments: "토너먼트 대진표",
    nav_hall_of_winners: "명예의 전당",
    nav_marketplace: "거래소",
    nav_guild: "길드",
    nav_donate: "금고 & 후원",
    nav_rules: "규칙 & 계급",
    nav_admin: "관리자 콘솔",
    nav_profile: "프로필 설정",
    nav_messages: "개인 메시지",
    nav_logout: "로그아웃",
    nav_login: "Discord로 로그인",
    common_party: "파티",
    common_tournament: "대회",
    common_prizepool: "총 상금",
    common_rank: "계급 및 명성",
    common_currency: "통화",
    common_language: "언어 선택",
    common_regional: "지역 설정",
    common_share: "공유",
    common_follow: "팔로우",
    common_following: "팔로잉",
    common_chat_pm: "쪽지 보내기",
  },
  ZH: {
    nav_home: "主页",
    nav_community: "公会社区",
    nav_forum: "交流论坛",
    nav_news: "公会快讯",
    nav_leaderboard: "排行榜",
    nav_arena: "竞技场与组队",
    nav_lfg: "组队发车 (LFG)",
    nav_tournaments: "赛事与对阵表",
    nav_hall_of_winners: "名人堂",
    nav_marketplace: "交易行与担保",
    nav_guild: "公会",
    nav_donate: "金库与赞助",
    nav_rules: "公会法则与阶级",
    nav_admin: "管理控制台",
    nav_profile: "个人设置",
    nav_messages: "私信消息",
    nav_logout: "退出登录",
    nav_login: "通过 Discord 登录",
    common_party: "组队小队",
    common_tournament: "官方赛事",
    common_prizepool: "总奖金池",
    common_rank: "声望与阶级",
    common_currency: "显示币种",
    common_language: "选择语言",
    common_regional: "偏好设置",
    common_share: "分享",
    common_follow: "关注",
    common_following: "已关注",
    common_chat_pm: "发送私信",
  },
  AR: {
    nav_home: "الرئيسية",
    nav_community: "المجتمع",
    nav_forum: "منتدى النقاش",
    nav_news: "أخبار النقابة",
    nav_leaderboard: "لوحة المتصدرين",
    nav_arena: "الساحة والفرق",
    nav_lfg: "البحث عن فريق (LFG)",
    nav_tournaments: "البطولات والمواجهات",
    nav_hall_of_winners: "قاعة الأبطال",
    nav_marketplace: "السوق والضمان",
    nav_guild: "النقابة",
    nav_donate: "الخزينة والدعم",
    nav_rules: "القوانين والرتب",
    nav_admin: "لوحة الإدارة",
    nav_profile: "الملف الشخصي",
    nav_messages: "الرسائل الخاصة",
    nav_logout: "تسجيل الخروج",
    nav_login: "دخول عبر ديسكورد",
    common_party: "الفريق",
    common_tournament: "البطولة",
    common_prizepool: "مجموع الجوائز",
    common_rank: "الرتبة والسمعة",
    common_currency: "العملة",
    common_language: "اختر اللغة",
    common_regional: "التفضيلات الإقليمية",
    common_share: "مشاركة",
    common_follow: "متابعة",
    common_following: "تتابع",
    common_chat_pm: "رسالة خاصة",
  },
  ES: {
    nav_home: "Inicio",
    nav_community: "Comunidad",
    nav_forum: "Foro de Discusión",
    nav_news: "Noticias del Gremio",
    nav_leaderboard: "Clasificación",
    nav_arena: "Arena & Escuadrón",
    nav_lfg: "Buscar Grupo (LFG)",
    nav_tournaments: "Torneos & Cuadros",
    nav_hall_of_winners: "Salón de la Fama",
    nav_marketplace: "Mercado & Fideicomiso",
    nav_guild: "Gremio",
    nav_donate: "Tesorería & Donaciones",
    nav_rules: "Reglas & Rangos",
    nav_admin: "Panel de Admin",
    nav_profile: "Perfil & Ajustes",
    nav_messages: "Mensajes Privados",
    nav_logout: "Cerrar Sesión",
    nav_login: "Iniciar con Discord",
    common_party: "Grupo / Party",
    common_tournament: "Torneo",
    common_prizepool: "Bolsa de Premios",
    common_rank: "Rango & Reputación",
    common_currency: "Moneda",
    common_language: "Seleccionar Idioma",
    common_regional: "Preferencias Regionales",
    common_share: "Compartir",
    common_follow: "Seguir",
    common_following: "Siguiendo",
    common_chat_pm: "Enviar Mensaje",
  },
};

interface LocaleContextType {
  locale: Locale;
  currency: Currency;
  setLocale: (loc: Locale, autoSyncCurrency?: boolean) => void;
  setCurrency: (cur: Currency) => void;
  formatPrice: (amountIdr: number, targetCurrency?: Currency) => string;
  convertPrice: (amountIdr: number, targetCurrency?: Currency) => number;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_LOCALE_KEY = "loghorizon_user_locale";
const STORAGE_CURRENCY_KEY = "loghorizon_user_currency";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ID");
  const [currency, setCurrencyState] = useState<Currency>("IDR");

  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem(STORAGE_LOCALE_KEY) as Locale | null;
      if (savedLocale && LOCALES[savedLocale]) {
        setLocaleState(savedLocale);
      }
      const savedCurrency = localStorage.getItem(STORAGE_CURRENCY_KEY) as Currency | null;
      if (savedCurrency && CURRENCIES[savedCurrency]) {
        setCurrencyState(savedCurrency);
      }
    } catch {
      // Storage access may be restricted
    }
  }, []);

  // 1-Click Auto-Sync: changing language auto-updates the matching default currency
  const setLocale = (newLocale: Locale, autoSyncCurrency = true) => {
    setLocaleState(newLocale);
    const matchingCurrency = autoSyncCurrency
      ? DEFAULT_CURRENCY_FOR_LOCALE[newLocale] || "IDR"
      : currency;

    if (autoSyncCurrency) {
      setCurrencyState(matchingCurrency);
    }

    try {
      localStorage.setItem(STORAGE_LOCALE_KEY, newLocale);
      if (autoSyncCurrency) {
        localStorage.setItem(STORAGE_CURRENCY_KEY, matchingCurrency);
      }
      if (LOCALES[newLocale]?.dir === "rtl") {
        document.documentElement.setAttribute("dir", "rtl");
      } else {
        document.documentElement.removeAttribute("dir");
      }
    } catch {
      // Ignore
    }
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem(STORAGE_CURRENCY_KEY, newCurrency);
    } catch {
      // Ignore
    }
  };

  const convertPrice = (amountIdr: number, targetCurrency?: Currency): number => {
    const cur = targetCurrency || currency;
    const curInfo = CURRENCIES[cur] || CURRENCIES.IDR;
    if (curInfo.rateAgainstIdr <= 0) return amountIdr;
    return amountIdr / curInfo.rateAgainstIdr;
  };

  const formatPrice = (amountIdr: number, targetCurrency?: Currency): string => {
    const cur = targetCurrency || currency;
    const converted = convertPrice(amountIdr, cur);

    try {
      switch (cur) {
        case "IDR":
          return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(amountIdr);
        case "USD":
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: converted % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          }).format(converted);
        case "JPY":
          return new Intl.NumberFormat("ja-JP", {
            style: "currency",
            currency: "JPY",
            maximumFractionDigits: 0,
          }).format(converted);
        case "KRW":
          return new Intl.NumberFormat("ko-KR", {
            style: "currency",
            currency: "KRW",
            maximumFractionDigits: 0,
          }).format(converted);
        case "CNY":
          return new Intl.NumberFormat("zh-CN", {
            style: "currency",
            currency: "CNY",
            minimumFractionDigits: converted % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          }).format(converted);
        case "SAR":
          return `${CURRENCIES.SAR.symbol} ${Math.round(converted).toLocaleString("ar-SA")}`;
        case "EUR":
          return new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: converted % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          }).format(converted);
        default:
          return `Rp ${amountIdr.toLocaleString("id-ID")}`;
      }
    } catch {
      return `${CURRENCIES[cur]?.symbol || "Rp"} ${Math.round(converted).toLocaleString()}`;
    }
  };

  const t = (key: string, fallback?: string): string => {
    const dict = DICTIONARY[locale] || DICTIONARY.ID;
    return dict[key] || DICTIONARY.ID[key] || fallback || key;
  };

  const value = useMemo(
    () => ({
      locale,
      currency,
      setLocale,
      setCurrency,
      formatPrice,
      convertPrice,
      t,
    }),
    [locale, currency]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

export function PriceDisplay({
  amountIdr,
  className = "",
  targetCurrency,
  fallback,
}: {
  amountIdr: number | null | undefined;
  className?: string;
  targetCurrency?: Currency;
  fallback?: string;
}) {
  const { formatPrice, currency } = useLocale();
  if (amountIdr === null || amountIdr === undefined) {
    if (fallback) return <span className={`inline-block ${className}`}>{fallback}</span>;
  }
  const safeAmount = Number(amountIdr) || 0;
  const formatted = formatPrice(safeAmount, targetCurrency);

  return (
    <span className={`inline-block ${className}`} title={`Nilai konversi berdasarkan kurs ${targetCurrency || currency}`}>
      {formatted}
    </span>
  );
}
