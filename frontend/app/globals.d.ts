/**
 * ビルド時に置換する
 */
declare const __API_BASE_URL__: string;

declare const __INITIAL_DATA__:
  | {
      owners: {
        id: string;
        name: string;
        token: string;
      }[];
      simulatorChairs: {
        id: string;
        owner_id: string;
        name: string;
        model: string;
        token: string;
      }[];
    }
  | undefined;
