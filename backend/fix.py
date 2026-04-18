import sqlite3
con = sqlite3.connect('db.sqlite3')
cur = con.cursor()
cur.execute("DELETE FROM exam_schedules WHERE exam_id=1")
con.commit()
con.close()
