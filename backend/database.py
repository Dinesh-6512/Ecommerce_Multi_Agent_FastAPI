from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# REPLACE 'your_password' with your actual PostgreSQL password
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres:Dinesh%4065@localhost/ecommerce"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
