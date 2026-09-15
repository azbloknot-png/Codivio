/**
 * The single shape every language dictionary must implement. Using nested
 * objects (not flat "a.b.c" string keys) means a missing/misspelled key is
 * a TypeScript compile error, not a silent runtime fallback — this is the
 * "centralized, not scattered" structure the Phase 2.15 checkpoint asked
 * for, enforced by the type system rather than by convention alone.
 *
 * Interpolated strings are functions, not templates — no templating
 * library needed for two simple cases (a name and a year).
 */
export interface Translations {
  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    add: string;
    create: string;
    update: string;
    activate: string;
    deactivate: string;
    publish: string;
    unpublish: string;
    archive: string;
    search: string;
    filter: string;
    refresh: string;
    logout: string;
    loading: string;
    saving: string;
    viewAll: string;
    comingSoon: string;
    notConfigured: string;
    configured: string;
    enabled: string;
    disabled: string;
    active: string;
    inactive: string;
    notConnected: string;
    viewOnly: string;
    yes: string;
    no: string;
  };
  nav: {
    dashboard: string;
    pages: string;
    tools: string;
    usersCrm: string;
    blog: string;
    analytics: string;
    seo: string;
    searchConsole: string;
    advertising: string;
    affiliate: string;
    monetization: string;
    social: string;
    reports: string;
    systemHealth: string;
    settings: string;
    auditLog: string;
  };
  admin: {
    checkingSession: string;
    signIn: string;
    signingIn: string;
    adminSignIn: string;
    signInSubtitle: string;
    email: string;
    password: string;
    welcome: (email: string) => string;
    dashboardIntro: string;
    openMenu: string;
    closeMenu: string;
  };
  dashboard: {
    traffic: string;
    revenue: string;
    system: string;
    metrics: {
      visitors: string;
      uniqueVisitors: string;
      pageviews: string;
      sessions: string;
      newVsReturning: string;
      topCountries: string;
      devices: string;
      totalUsage: string;
      mostUsed: string;
      leastUsed: string;
      usageGrowth: string;
      errors: string;
      processingPerformance: string;
      totalUsers: string;
      newUsers: string;
      freeProBusiness: string;
      active: string;
      retention: string;
      churn: string;
      totalRevenue: string;
      subscriptionRevenue: string;
      premiumServices: string;
      affiliateRevenue: string;
      advertisingRevenue: string;
      revenuePerUser: string;
      impressions: string;
      clicks: string;
      ctr: string;
      rpm: string;
      slotPerformance: string;
      conversions: string;
      commission: string;
      roi: string;
      workerHealth: string;
      d1Health: string;
      storage: string;
      bandwidth: string;
      backups: string;
      apiHealth: string;
    };
  };
  comingSoon: {
    notConnectedBadge: string;
    modules: Record<
      | "usersCrm"
      | "blog"
      | "analytics"
      | "seo"
      | "searchConsole"
      | "advertising"
      | "affiliate"
      | "monetization"
      | "social"
      | "reports"
      | "systemHealth"
      | "auditLog",
      { description: string; categories: string[] }
    >;
  };
  settings: {
    introManage: string;
    introReadOnly: string;
    noSettingsForCategory: string;
    comingSoonForCategory: (category: string) => string;
    tabs: {
      general: string;
      branding: string;
      domain: string;
      email: string;
      analytics: string;
      searchConsole: string;
      seo: string;
      advertising: string;
      affiliate: string;
      social: string;
      payments: string;
      security: string;
      backups: string;
      system: string;
      language: string;
    };
    language: {
      title: string;
      description: string;
      fieldLabel: string;
    };
  };
  settingLabel: Record<
    | "general.site_name"
    | "general.site_description"
    | "general.default_language"
    | "system.maintenance_mode"
    | "google.analytics_configured"
    | "google.search_console_configured"
    | "advertising.adsense_configured"
    | "affiliate.enabled"
    | "security.registration_enabled",
    string
  >;
  contentAdmin: {
    newPage: string;
    editPage: string;
    noPagesYet: string;
    loadingPages: string;
    newTool: string;
    editTool: string;
    noToolsYet: string;
    loadingTools: string;
  };
  site: {
    navHome: string;
    navTools: string;
    navBlog: string;
    navFaq: string;
    navAbout: string;
    navContact: string;
    searchPlaceholder: string;
    siteDescription: string;
    skipLink: string;
  };
  hero: {
    eyebrow: string;
    headlineLine1: string;
    headlineLine2: string;
    subtitle: string;
    searchPlaceholder: string;
    trustFree: string;
    trustPrivacy: string;
    trustFast: string;
    adLabel: string;
    adNote: string;
  };
  section: {
    popularToolsEyebrow: string;
    popularTools: string;
    qrTools: string;
    pdfTools: string;
    imageOtherTools: string;
    blogEyebrow: string;
    blogHeading: string;
    readBlog: string;
  };
  footer: {
    allTools: string;
    imageToolsLink: string;
    companyHeading: string;
    informationHeading: string;
    privacy: string;
    terms: string;
    cookies: string;
    pricing: string;
    copyright: (year: number) => string;
  };
  /** Phase 3.13 — UI chrome labels for the tool-page content sections that
   * render Phase 3.4's content blueprint/Phase 3.6's internal-link data.
   * Per-tool content itself (intro/benefits/steps/FAQ) lives in
   * shared/seo/content.ts, already localized there — these are only the
   * section headings/aria-labels around it. */
  toolPage: {
    breadcrumbAriaLabel: string;
    aboutHeading: string;
    benefitsHeading: string;
    howItWorksHeading: string;
    useCasesHeading: string;
    faqHeading: string;
    relatedToolsHeading: string;
  };
  /** Phase 3.14 remediation (Finding #2) — all user-visible /pricing body
   * copy. Plan keys/entitlement keys are hardcoded literal unions here
   * (matching shared/monetization/types.ts's PLAN_KEYS/ENTITLEMENT_KEYS
   * exactly, verified by a test) rather than importing those types —
   * shared/i18n stays dependency-free of shared/monetization, matching its
   * existing role as the most foundational shared module. Plan
   * identifiers themselves (Free/Pro/Business/API) are intentionally NOT
   * translated — they stay as product-tier names in every language,
   * matching how they're used as literal `PlanKey`s elsewhere. */
  pricing: {
    eyebrow: string;
    heading: string;
    intro: string;
    priceAnnounced: string;
    upgradeButton: string;
    statusAvailable: string;
    statusPlanned: string;
    statusNotAvailable: string;
    planDescriptions: Record<"free" | "pro" | "business" | "api", string>;
    entitlementLabels: Record<
      | "basic_tool_access"
      | "advanced_tool_access"
      | "batch_processing"
      | "larger_file_size"
      | "faster_processing"
      | "priority_processing"
      | "storage"
      | "api_access"
      | "analytics"
      | "premium_tools"
      | "reduced_ads"
      | "higher_usage_limits",
      string
    >;
    faqHeading: string;
    faqBuyQuestion: string;
    faqBuyAnswer: string;
    faqPriceQuestion: string;
    faqPriceAnswer: string;
    faqFreeQuestion: string;
    faqFreeAnswer: string;
  };
}
