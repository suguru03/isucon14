import type { ClientRequestStatus } from "~/routes/client/userProvider";

export type RequestProps<
  requestStatus extends ClientRequestStatus,
  extraProps = NonNullable<object>,
> = { status: requestStatus } & extraProps;
