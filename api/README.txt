A very simple api that produces

/random
/search?q=who
/suggest?pid=b0074ngy

using a mysql backend (table descriptions below)

=Installation=

You'll need mysql, ruby and a few gems - DBI is the only tricky one

cd api
mkdir WEBrickLog

Download Webrick and edit 
server.rb to reference the servlets

ruby server.rb

then go to 

http://localhost:9090/random
..etc

=Database=

The data is mostly here:

http://dev.notu.be/2011/02/datasets/0.3/readme.txt

mysql> describe pids;
+--------------+-------------+------+-----+---------+----------------+
| Field        | Type        | Null | Key | Default | Extra          |
+--------------+-------------+------+-----+---------+----------------+
| id           | int(11)     | NO   | PRI | NULL    | auto_increment | 
| prog_num     | varchar(10) | YES  |     | NULL    |                | 
| mag_prefix   | char(1)     | YES  |     | NULL    |                | 
| crid         | varchar(72) | YES  |     | NULL    |                | 
| pid          | varchar(17) | YES  | MUL | NULL    |                | 
| description  | text        | YES  |     | NULL    |                | 
| dt_scheduled | datetime    | YES  |     | NULL    |                | 
| dt_actual    | datetime    | YES  |     | NULL    |                | 
| channel      | varchar(20) | YES  |     | NULL    |                | 
| core_title   | char(144)   | YES  |     | NULL    |                | 
| series_title | char(72)    | YES  |     | NULL    |                | 
+--------------+-------------+------+-----+---------+----------------+
11 rows in set (0.00 sec)


mysql> describe similarity;
+-----------+-------------+------+-----+---------+----------------+
| Field     | Type        | Null | Key | Default | Extra          |
+-----------+-------------+------+-----+---------+----------------+
| id        | int(11)     | NO   | PRI | NULL    | auto_increment | 
| prog_num1 | varchar(17) | YES  | MUL | NULL    |                | 
| prog_num2 | varchar(17) | YES  | MUL | NULL    |                | 
| tanimoto  | float       | YES  | MUL | NULL    |                | 
| num_terms | int(11)     | YES  |     | NULL    |                | 
| terms     | text        | YES  |     | NULL    |                | 
+-----------+-------------+------+-----+---------+----------------+
6 rows in set (0.00 sec)

(num_terms is just how many terms in common caused the weighting; terms is a list of those terms. You 
don't need those two)

mysql> describe series;
+-------------+-------------+------+-----+---------+----------------+
| Field       | Type        | Null | Key | Default | Extra          |
+-------------+-------------+------+-----+---------+----------------+
| id          | int(11)     | NO   | PRI | NULL    | auto_increment | 
| pid         | varchar(17) | YES  | MUL | NULL    |                | 
| series_crid | varchar(72) | YES  | MUL | NULL    |                | 
+-------------+-------------+------+-----+---------+----------------+

mysql> describe just_series;
+-------------+-------------+------+-----+---------+----------------+
| Field       | Type        | Null | Key | Default | Extra          |
+-------------+-------------+------+-----+---------+----------------+
| id          | int(11)     | NO   | PRI | NULL    | auto_increment | 
| series_crid | varchar(72) | YES  | MUL | NULL    |                | 
+-------------+-------------+------+-----+---------+----------------+
2 rows in set (0.00 sec)



