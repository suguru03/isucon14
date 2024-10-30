CREATE DATABASE IF NOT EXISTS isuride DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

DROP USER IF EXISTS 'isucon'@'%';
CREATE USER IF NOT EXISTS 'isucon'@'%' IDENTIFIED BY 'isucon';
GRANT ALL ON isuride.* TO 'isucon'@'%';

USE isuride;

DELIMITER //
CREATE FUNCTION IF NOT EXISTS ISU_NOW() RETURNS DATETIME(6)
  READS SQL DATA
BEGIN
  DECLARE base_time DATETIME(6);
  DECLARE time_elapsed_microseconds BIGINT;
  DECLARE accelerated_time BIGINT;

  -- 今日の0時を基準にする（マイクロ秒精度）
  SET base_time = CURDATE() + INTERVAL 0 MICROSECOND;

  -- 経過時間をマイクロ秒単位で計算する（現在時刻 - 今日の0時）
  SET time_elapsed_microseconds = TIMESTAMPDIFF(MICROSECOND, base_time, NOW(6));

  -- 2000倍に加速させる
  SET accelerated_time = time_elapsed_microseconds * 2000;

  -- 0時から加速した時間を加える（マイクロ秒単位）
  RETURN base_time + INTERVAL accelerated_time MICROSECOND;
END //
DELIMITER ;
