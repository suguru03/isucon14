export const MessageTypes = {
  ClientReady: "isuride.client.ready",
  SimulatorConfing: "isuride.simulator.config",
} as const;

export type Message = {
  ClientReady: {
    type: typeof MessageTypes.ClientReady;
    payload: { ready?: boolean };
  };
  SimulatorConfing: {
    type: typeof MessageTypes.SimulatorConfing;
    payload: {
      ghostChairEnabled?: boolean;
    };
  };
};

export const sendClientReady = (
  target: Window,
  payload: NonNullable<Message["ClientReady"]["payload"]>,
) => {
  target.postMessage({ type: MessageTypes.ClientReady, payload }, "*");
};

export const sendSimulatorConfig = (
  target: Window,
  payload: NonNullable<Message["SimulatorConfing"]["payload"]>,
) => {
  target.postMessage({ type: MessageTypes.SimulatorConfing, payload }, "*");
};
