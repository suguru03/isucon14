import { RequestStatus } from "~/apiClient/apiSchemas";
export type RequestStatusWithIdle = RequestStatus | "IDLE";

export type RequestProps<
  requestStatus extends RequestStatusWithIdle,
  extraProps = NonNullable<object>,
> = { status: requestStatus } & extraProps;

