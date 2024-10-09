import type { ClientRequestStatus } from "~/routes/client/userProvider";
import type { ReactNode } from "react";

export type RequestComponentProps<
  requestStatus extends ClientRequestStatus,
  extraProps = {},
> = ({ status }: { status: requestStatus } & extraProps) => ReactNode;
