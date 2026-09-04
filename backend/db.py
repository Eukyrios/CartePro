class Database(object):

    def __init__(self):

        db_url = {
            'drivername': 'mysql+pymysql',
            'host': DB_HOST,
            'username': DB_USER,
            'password': DB_PASS,
            'port': DB_PORT
        }
        self.engine = create_engine(URL(**db_url), echo=False, strategy='threadlocal')
        self.connection = self.engine.connect()
        self.metadata = MetaData(bind=self.engine)
    def __enter__(self):
        return self
    def __exit__(self):
        self.connection.close()
