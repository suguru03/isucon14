USE isuride;

create table chair_models
(
  name  varchar(30) not null comment '椅子モデル名',
  speed integer     not null comment '移動速度',
  primary key (name)
)
  comment = '椅子モデルテーブル';

create table chairs
(
  id           varchar(26)  not null comment '椅子ID',
  owner_id     varchar(26)  not null comment 'プロバイダーID',
  name         varchar(30)  not null comment '椅子の名前',
  model        text         not null comment '椅子のモデル',
  is_active    tinyint(1)   not null comment '配椅子受付中かどうか',
  access_token varchar(255) not null comment 'アクセストークン',
  created_at   datetime(6)  not null comment '登録日時',
  updated_at   datetime(6)  not null comment '更新日時',
  primary key (id)
)
  comment = '椅子情報テーブル';

create table chair_locations
(
  id         varchar(26) not null,
  chair_id   varchar(26) not null comment '椅子ID',
  latitude   integer     not null comment '経度',
  longitude  integer     not null comment '緯度',
  created_at datetime(6) not null comment '登録日時',
  primary key (id)
)
  comment = '椅子の現在位置情報テーブル';

create table users
(
  id            varchar(26)  not null comment 'ユーザーID',
  username      varchar(30)  not null comment 'ユーザー名',
  firstname     varchar(30)  not null comment '本名(名前)',
  lastname      varchar(30)  not null comment '本名(名字)',
  date_of_birth varchar(30)  not null comment '生年月日',
  access_token  varchar(255) not null comment 'アクセストークン',
  created_at    datetime(6)  not null comment '登録日時',
  updated_at    datetime(6)  not null comment '更新日時',
  primary key (id),
  unique (username),
  unique (access_token)
)
  comment = '利用者情報テーブル';

create table payment_tokens
(
  user_id    varchar(26)  not null comment 'ユーザーID',
  token      varchar(255) not null comment '決済トークン',
  created_at datetime(6)  not null comment '登録日時',
  primary key (user_id)
)
  comment = '決済トークンテーブル';

create table ride_requests
(
  id                    varchar(26)                                                                        not null comment '配車/乗車リクエストID',
  user_id               varchar(26)                                                                        not null comment 'ユーザーID',
  chair_id              varchar(26)                                                                        null comment '割り当てられた椅子ID',
  status                enum ('MATCHING', 'DISPATCHING', 'DISPATCHED', 'CARRYING', 'ARRIVED', 'COMPLETED') not null comment '状態',
  pickup_latitude       integer                                                                            not null comment '配車位置(経度)',
  pickup_longitude      integer                                                                            not null comment '配車位置(緯度)',
  destination_latitude  integer                                                                            not null comment '目的地(経度)',
  destination_longitude integer                                                                            not null comment '目的地(緯度)',
  evaluation            integer                                                                            null comment '評価',
  requested_at          datetime(6)                                                                        not null comment '要求日時',
  matched_at            datetime(6)                                                                        null comment '椅子割り当て完了日時',
  dispatched_at         datetime(6)                                                                        null comment '配車到着日時',
  rode_at               datetime(6)                                                                        null comment '乗車日時',
  arrived_at            datetime(6)                                                                        null comment '目的地到着日時',
  updated_at            datetime(6)                                                                        not null comment '状態更新日時',
  primary key (id)
)
  comment = '配車/乗車リクエスト情報テーブル';

create table providers
(
  id           varchar(26)  not null comment 'オーナーID',
  name         varchar(30)  not null comment 'オーナー名',
  access_token varchar(255) not null comment 'アクセストークン',
  created_at   datetime(6)  not null comment '登録日時',
  updated_at   datetime(6)  not null comment '更新日時',
  primary key (id),
  unique (name),
  unique (access_token)
)
  comment = '椅子のオーナー情報テーブル';
