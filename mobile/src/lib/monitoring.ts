type MonitoringUser = {
  id: string;
  email?: string | null;
  username?: string | null;
};

type MonitoringTags = Record<string, string | number | boolean | null | undefined>;
type MonitoringExtras = Record<string, unknown>;

export const initMonitoring = () => {};

export const wrapAppWithMonitoring = <T,>(AppComponent: T): T => AppComponent;

export const setMonitoringUser = (_user: MonitoringUser | null) => {};

export const captureMonitoringMessage = (
  code: string,
  message: string,
  tags?: MonitoringTags,
  extra?: MonitoringExtras
) => {};

export const captureMonitoringException = (
  error: unknown,
  tags?: MonitoringTags,
  extra?: MonitoringExtras
) => {};
