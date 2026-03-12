from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)  # Allow access from HTML running in browser

DB_PATH = "L:/sqlite/data.db"  # Use your real path here

@app.route('/api/health')
def get_health_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM health_data ORDER BY timestamp DESC LIMIT 1")
    row = cursor.fetchone()

    if row:
        result = {
            "Heart Rate": row[1],
            "SpO2": row[2],
            "Stress_Level": int(row[3]),
            "Calories Burnt": row[4],
            "Steps": row[5],
            "Sleep": row[6],
            "BP": row[7],
            "Temperature": row[8],
            "Glucose": row[9],
            "ECG": "Normal" if str(row[10]) == "1" else "Irregular",
            "Fall_Detection": "Fall Detected!" if row[11] == "YES" else "Active"
        }
    else:
        result = {}

    conn.close()
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
