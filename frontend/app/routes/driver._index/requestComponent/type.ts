import type { RequestStatusWithIdle } from "~/routes/client/userProvider";

export type RequestProps<
  requestStatus extends RequestStatusWithIdle,
  extraProps = NonNullable<object>,
> = { status: requestStatus } & extraProps;
