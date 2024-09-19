
CREATE DATABASE IF NOT EXISTS isucon DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE isucon;

create table drivers
(
  id         varchar(26) not null comment 'ドライバーID',
  username   varchar(30) not null comment 'ユーザー名',
  firstname  varchar(30) not null comment '本名(名前)',
  lastname   varchar(30) not null comment '本名(名字)',
  car_model  text        not null comment '車種',
  car_no     varchar(30) not null comment 'カーナンバー',
  is_active  tinyint(1)  not null comment '配車受付中かどうか',
  created_at timestamp   not null comment '登録日時',
  updated_at timestamp   not null comment '更新日時',
  primary key (id)
)
  comment = 'ドライバー情報テーブル';

create table driver_locations
(
  driver_id  varchar(26) not null comment 'ドライバーID',
  latitude   double      not null comment '経度',
  longitude  double      not null comment '緯度',
  updated_at timestamp   not null comment '更新日時',
  primary key (driver_id),
  constraint driver_locations_drivers_id_fk
    foreign key (driver_id) references drivers (id)
      on update cascade on delete cascade
)
  comment = 'ドライバーの現在位置情報テーブル';

create table users
(
  id         varchar(26) not null comment 'ユーザーID',
  username   varchar(30) not null comment 'ユーザー名',
  firstname  varchar(30) not null comment '本名(名前)',
  lastname   varchar(30) not null comment '本名(名字)',
  access_token varchar(255) not null comment 'アクセストークン',
  created_at timestamp   not null comment '登録日時' default current_timestamp,
  updated_at timestamp   not null comment '更新日時' default current_timestamp on update current_timestamp,
  primary key (id),
  unique (username),
  unique (access_token)
)
  comment = '利用者情報テーブル';

create table inquiries
(
  id         varchar(26) not null comment '問い合わせID',
  user_id    varchar(26) not null comment 'ユーザーID',
  subject    text        not null comment '件名',
  body       text        not null comment '本文',
  created_at timestamp   not null comment '問い合わせ日時',
  primary key (id),
  constraint inquiries_users_id_fk
    foreign key (user_id) references users (id)
)
  comment = '問い合わせテーブル';

create table ride_requests
(
  id                    varchar(26)                                                                                    not null comment '配車/乗車リクエストID',
  user_id               varchar(26)                                                                                    not null comment 'ユーザーID',
  driver_id             varchar(26)                                                                                    null comment '割り当てられたドライバーID',
  status                enum ('MATCHING', 'DISPATCHING', 'DISPATCHED', 'CARRYING', 'ARRIVED', 'COMPLETED', 'CANCELED') not null comment '状態',
  pickup_latitude       double                                                                                         not null comment '配車位置(経度)',
  pickup_longitude      double                                                                                         not null comment '配車位置(緯度)',
  destination_latitude  double                                                                                         not null comment '目的地(経度)',
  destination_longitude double                                                                                         not null comment '目的地(緯度)',
  evaluation            int                                                                                            null comment 'ドライブ評価',
  requested_at          timestamp                                                                                      not null comment '要求日時' default current_timestamp,
  matched_at            timestamp                                                                                      null comment 'ドライバー割り当て完了日時',
  dispatched_at         timestamp                                                                                      null comment '配車到着日時',
  rode_at               timestamp                                                                                      null comment '乗車日時',
  arrived_at            timestamp                                                                                      null comment '目的地到着日時',
  updated_at            timestamp                                                                                      not null comment '状態更新日時' default current_timestamp on update current_timestamp,
  primary key (id),
  constraint ride_requests_drivers_id_fk
    foreign key (driver_id) references drivers (id),
  constraint ride_requests_users_id_fk
    foreign key (user_id) references users (id)
)
  comment = '配車/乗車リクエスト情報テーブル';