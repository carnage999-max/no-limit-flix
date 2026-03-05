type MonitoringUser = {
  id: string;
  email?: string | null;
  username?: string | null;
};

type MonitoringTags = Record<string, string | number | boolean | null | undefined>;
type MonitoringExtras = Record<string, unknown>;

let sentryModule: any | null | undefined;
let initialized = false;

const loadSentry = () => {
  if (sentryModule !== undefined) return sentryModule;
  try {
    const dynamicRequire = (0, eval)('require');
    sentryModule = dynamicRequire('@sentry/react-native');
  } catch {
    sentryModule = null;
  }
  return sentryModule;
};

export const initMonitoring = () => {
  if (initialized) return;
  initialized = true;

  const Sentry = loadSentry();
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!Sentry || !dsn) return;

  Sentry.init({
    dsn,
    enableNative: true,
    enableNativeCrashHandling: true,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.0,
    attachStacktrace: true,
  });
};

export const wrapAppWithMonitoring = <T,>(AppComponent: T): T => {
  const Sentry = loadSentry();
  if (!Sentry?.wrap) return AppComponent;
  return Sentry.wrap(AppComponent);
};

export const setMonitoringUser = (user: MonitoringUser | null) => {
  const Sentry = loadSentry();
  if (!Sentry?.setUser) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
    username: user.username || undefined,
  });
};

export const captureMonitoringMessage = (
  code: string,
  message: string,
  tags?: MonitoringTags,
  extra?: MonitoringExtras
) => {
  const Sentry = loadSentry();
  if (!Sentry?.withScope) return;
  Sentry.withScope((scope: any) => {
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        if (value !== undefined) scope.setTag(key, String(value));
      });
    }
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value as any);
      });
    }
    scope.setLevel('warning');
    Sentry.captureMessage(`[${code}] ${message}`);
  });
};

export const captureMonitoringException = (
  error: unknown,
  tags?: MonitoringTags,
  extra?: MonitoringExtras
) => {
  const Sentry = loadSentry();
  if (!Sentry?.withScope) return;
  Sentry.withScope((scope: any) => {
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        if (value !== undefined) scope.setTag(key, String(value));
      });
    }
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value as any);
      });
    }
    Sentry.captureException(error);
  });
};
