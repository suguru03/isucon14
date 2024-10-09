import type { RequestStatus } from "~/apiClient/apiSchemas";

export type RequestProps<
  requestStatus extends RequestStatus | "IDLE",
  extraProps = NonNullable<object>,
> = { status: requestStatus } & extraProps;
