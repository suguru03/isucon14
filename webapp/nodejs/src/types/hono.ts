import type { Connection } from "mysql2/promise";
import type { Chair, Owner, User } from "./models.js";

export type Environment = {
  Variables: {
    dbConn: Connection;
    user: User;
    owner: Owner;
    chair: Chair;
  };
};
