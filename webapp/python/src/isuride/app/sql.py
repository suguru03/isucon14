import sqlalchemy

# TODO: 環境変数からホスト名などを読むようにする
engine = sqlalchemy.create_engine("mysql+pymysql://isucon:isucon@localhost/isuride")
