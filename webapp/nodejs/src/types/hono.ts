import type mysql from "mysql2/promise";
import type { Chair, Owner, User } from "./models.js";

export type Environment = {
  Variables: {
    dbConn: mysql.Connection;
    user: User;
    owner: Owner;
    chair: Chair;
  };
};
