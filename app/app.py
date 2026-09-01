from flask import Flask, request, jsonify
import psycopg2
import os

app = Flask(__name__)

DB_HOST = os.environ.get("DB_HOST", "db")
DB_NAME = os.environ.get("DB_NAME", "taskdb")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASS", "postgres")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

@app.route('/tasks', methods=['GET'])
def get_tasks():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT id, description FROM tasks;')
    tasks = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tasks)

@app.route('/tasks', methods=['POST'])
def add_task():
    data = request.get_json()
    description = data.get('description', '')
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('INSERT INTO tasks (description) VALUES (%s);', (description,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'Task added!'}), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5432)