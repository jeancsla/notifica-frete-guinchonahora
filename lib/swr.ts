import type { SWRConfiguration } from "swr";

export const swrDefaults: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateIfStale: true,
  dedupingInterval: 10000,
  focusThrottleInterval: 15000,
  keepPreviousData: true,
  shouldRetryOnError: true,
  errorRetryCount: 2,
  errorRetryInterval: 2000,
};
