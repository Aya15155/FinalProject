const express = require("express");
const app = express();
const session = require("express-session");
const mysql = require("mysql");
const path = require('path');

const db = mysql.createConnection({
    host: '/aya15155.github.io/FinalProject/',
    user: 'root',
    port: '3307',
    password: '',
    database: 'webfinal',
});

app.use(express.static(path.join(__dirname, '/public')));


app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-secret-key', 
    resave: false,
    saveUninitialized: true
}));

app.listen(5500, () => {
    console.log("server start on port 5500");
});





app.post('/html/login', (req, res) => {
    console.log(req.body);

    const { username, password } = req.body;

    if (username && password) {

        db.query('SELECT id, Password FROM student WHERE id = ? UNION ALL SELECT id, Password FROM professors WHERE id = ? UNION ALL SELECT id, Password FROM administration  WHERE id = ?', [username, username,username], (error, results) => {
            if (error) {
                console.log(error);
                return res.redirect('/html/login.html?error=An error occurred. Please try again later.');
            }

            if (results.length === 0) {
                return res.redirect('/html/login.html?error=User not found.');
            }

            const user = results[0]; 

      
            if (user.Password === password) {
                
                if (parseInt(username) < 2000 ) {
                    req.session.userId = username;
                    return res.redirect('/html/professor.html');
                } else if(parseInt(username) > 2000 && parseInt(username) < 3000){
                    req.session.userId = username;
                    return res.redirect('/html/student.html');
                    
                }
                else {
                    req.session.userId = username;
                    return res.redirect('/html/administration.html');
                }
                    
            } else {
                 return res.redirect('/html/login.html?error=Incorrect password. Please try again.');
            }
            
        });
    } else {
        return res.redirect('/html/login.html?error=Username and password are required');
    }
});

app.get('/upcoming_assignments', (req, res) => {
    const studentId = req.session.userId; 
    console.log(studentId);
    if (!studentId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.query('SELECT a.*, c.title AS course_title, sg.grade, a.total_grade FROM assignment a LEFT JOIN `student-grade` sg ON a.ID = sg.assiment_id INNER JOIN courses c ON a.cours_id = c.cours_id WHERE  sg.student_id = ?', [studentId], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: 'An error occurred while fetching upcoming assignments.' });
        }

        const assignments = results.map(assignment => {
            return {
                title: assignment.title,
                cours_id: assignment.cours_id,
                course_title: assignment.course_title,
                deadline: assignment.deadline,
                grade: assignment.grade !== null ? assignment.grade : 'Not graded',
                total_grade: assignment.total_grade
            };
        });

        res.json(assignments);
    });
});
app.get('/instructor/upcoming_assignments', (req, res) => {
    const instructor = req.session.userId; 
    console.log(instructor);
    if (!instructor) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.query('SELECT a.*, c.title AS course_title, sg.grade , a.total_grade FROM assignment a LEFT JOIN `student-grade` sg ON a.id = sg.assiment_id INNER JOIN courses c ON a.cours_id = c.cours_id WHERE  a.instructor_id = ?', [instructor], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: 'An error occurred while fetching upcoming assignments.' });
        }

        const assignments = results.map(assignment => {
            return {
                assiment_id:assignment.ID,
                title: assignment.title,
                cours_id: assignment.cours_id,
                course_title: assignment.course_title,
                deadline: assignment.deadline,
                grade: assignment.grade !== null ? assignment.grade : 'Not graded',
                total_grade: assignment.total_grade
            };
        });

        res.json(assignments);
    });
});



app.get('/courses/:courseId/upcoming_assignments', (req, res) => {
    const courseId = req.params.courseId;
    const studentId = req.session.userId; 

    if (!studentId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    
    db.query('SELECT a.title, a.deadline, c.title AS course_title, IFNULL(sg.grade, "Not graded") AS `student_grade`, a.total_grade FROM assignment a INNER JOIN student_cours sc ON a.cours_id = sc.cours_id INNER JOIN courses c ON a.cours_id = c.cours_id LEFT JOIN `student-grade` sg ON a.ID = sg.assiment_id WHERE sc.student_id = ? AND a.deadline > CURDATE() AND a.cours_id = ?', [studentId, courseId], (error, results) => {
        if (error) {
            console.error('Error fetching upcoming assignments:', error);
            return res.status(500).json({ error: 'An error occurred while fetching upcoming assignments.' });
        }

        res.json(results); 
    });
});

app.get('/courses', (req, res) => {
    const studentId = req.session.userId; 
    
    if (!studentId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.query('SELECT cours_id FROM student_cours WHERE student_id = ?', [studentId], (error, results) => {
        if (error) {
            console.error('Error fetching enrolled courses:', error);
            return res.status(500).json({ error: 'An error occurred while fetching enrolled courses.' });
        }

        const courseIds = results.map(course => course.cours_id);

        if (courseIds.length === 0) {
            return res.json([]); 
        }

        db.query('SELECT * FROM courses WHERE cours_id IN (?)', [courseIds], (error, courseResults) => {
            if (error) {
                console.error('Error fetching course details:', error);
                return res.status(500).json({ error: 'An error occurred while fetching course details.' });
            }

            res.json(courseResults); 
        });
    });
});

app.get('/getcourses', (req, res) => {
    const instructorId = req.session.userId; 
    console.log(instructorId);
    if (!instructorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    db.query('SELECT sc.*,c.cours_id, c.title AS course_title, c.avatar FROM student_cours sc INNER JOIN courses c ON sc.cours_id = c.cours_id WHERE sc.instructor = ?', [instructorId], (error, courseResults) => {
        if (error) {
            console.error('Error fetching courses:', error);
            return res.status(500).json({ error: 'An error occurred while fetching courses.' });
        }

        res.json(courseResults); 
    });
});

app.get('/displayall', (req, res) => {
    db.query('SELECT * FROM courses', (error, courseResults) => {
        if (error) {
            console.error('Error fetching courses:', error);
            return res.status(500).json({ error: 'An error occurred while fetching courses.' });
        }

        console.log('Courses:', courseResults); 
        res.json(courseResults); 
    });
});
app.get('/displayallinstractors', (req, res) => {
    db.query('SELECT * FROM professors', (error, courseResults) => {
        if (error) {
            console.error('Error fetching courses:', error);
            return res.status(500).json({ error: 'An error occurred while fetching courses.' });
        }

        console.log('Courses:', courseResults); 
        res.json(courseResults); 
    });
});

app.get('/courses/materials', (req, res) => {
    const studentId = req.session.userId; 

    if (!studentId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    
    db.query('SELECT m.*, c.title AS course_title FROM assignment m INNER JOIN courses c ON m.cours_id = c.cours_id', (error, results) => {
        if (error) {
            console.error('Error fetching course materials:', error);
            return res.status(500).json({ error: 'An error occurred while fetching course materials.' });
        }

        res.json(results); 
    });
});




app.post('/addCourse', (req, res) => {
    const { cours_id, title, field, pre_required, avatar } = req.body;
    console.log("avatar: "+ avatar);
   
    const sql = 'INSERT INTO courses (cours_id, title, field, pre_required, avatar) VALUES (?, ?, ?, ?, ?)';
    const values = [cours_id, title, field, pre_required, avatar];
    

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error adding course to database:', err);
            res.status(500).send('Failed to add course');
            return;
        }
        console.log('Course added to database');
        res.status(200).send('Course added successfully');
    });
});


app.get('/allStudents', (req, res) => {
    
    db.query('SELECT * FROM student', (error, results) => {
        if (error) {
            console.error('Error fetching students:', error);
            return res.status(500).json({ error: 'An error occurred while fetching students.' });
        }

        res.json(results); 
    });
});
app.get('/allInstructors', (req, res) => {
    
    db.query('SELECT * FROM professors', (error, results) => {
        if (error) {
            console.error('Error fetching students:', error);
            return res.status(500).json({ error: 'An error occurred while fetching students.' });
        }

        res.json(results); 
    });
});
app.post('/addStudent', (req, res) => {
    const { name, email, phoneNumber, instructor, password } = req.body;
    const sql = 'INSERT INTO student (name, email, phonnumber, instructor, password) VALUES (?, ?, ?, ?, ?)';
    const values = [name, email, phoneNumber, instructor, password];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error adding student to database:', err);
            return res.json({ success: false, message: 'Failed to add student.' });
        }
        console.log('Student added to database');
        return res.json({ success: true, message: 'Student added successfully.' });
    });
});

app.post('/addinstructor', (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    const sql = 'INSERT INTO professors (name, email, phonnumber, password) VALUES (?, ?, ?, ?)';
    const values = [name, email, phoneNumber, password];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error adding instructor to database:', err);
            return res.json({ success: false, message: 'Failed to add instructor.' });
        }
        console.log('Instructor added to database');
        return res.json({ success: true, message: 'Instructor added successfully.' });
    });
});

app.post('/calculate_gpa', (req, res) => {
    const studentId = req.session.userId; 
    if (!studentId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    
    db.query('SELECT grade FROM `student-grade` WHERE student_id = ? AND grade IS NOT NULL', [studentId], (error, results) => {
        if (error) {
            console.error('Error fetching grades:', error);
            return res.status(500).json({ error: 'An error occurred while fetching grades.' });
        }

       
        let totalGrade = 0;
        let gradeCount = 0;
        results.forEach(result => {
            totalGrade += result.grade;
            gradeCount++;
        });
        const gpa = totalGrade / gradeCount;
        
        
        db.query('UPDATE student SET total_gba = ? WHERE id = ?', [gpa, studentId], (error, result) => {
            if (error) {
                console.error('Error updating GPA:', error);
                return res.status(500).json({ error: 'An error occurred while updating GPA.' });
            }

            res.json({ success: true, message: 'GPA updated successfully.', gpa: gpa });
        });
    });
});

app.get('/student_info', (req, res) => {
    const studentId = req.session.userId; 

    if (!studentId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    
    db.query('SELECT * FROM student WHERE id = ?', [studentId], (error, results) => {
        if (error) {
            console.error('Error fetching student information:', error);
            return res.status(500).json({ error: 'An error occurred while fetching student information.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const studentInfo = results[0];
       
        delete studentInfo.password;

        res.json(studentInfo);
    });
});
app.get('/professor_info', (req, res) => {
    const instructorId = req.session.userId; 

    if (!instructorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    
    db.query('SELECT * FROM professors WHERE ID = ?', [instructorId], (error, results) => {
        if (error) {
            console.error('Error fetching student information:', error);
            return res.status(500).json({ error: 'An error occurred while fetching professors information.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const instructorinfo = results[0];
        
        delete instructorinfo.password;

        res.json(instructorinfo);
    });
});
app.post('/change-password', (req, res) => {
    const studentId = req.session.userId;
    const { currentPassword,newPassword,confirmPassword } = req.body;
    console.log(req.body);
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }
    if(newPassword!=confirmPassword){
        
            return res.status(500).json({ success: false, message: 'password does not mach' });
    }
    
    
    db.query('SELECT * FROM student WHERE id = ? AND password = ?', [studentId, currentPassword], (error, results) => {
        if (error) {
            console.error('Error changing password:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while changing password.' });
        }
        
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid current password.' });
        }
        
        
        db.query('UPDATE student SET password = ? WHERE id = ?', [newPassword, studentId], (error, result) => {
            if (error) {
                console.error('Error changing password:', error);
                return res.status(500).json({ success: false, message: 'An error occurred while changing password.' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(500).json({ success: false, message: 'Failed to update password.' });
            }

            res.json({ success: true, message: 'Password changed successfully.' });
        });
    });
});
app.post('/prof/change-password', (req, res) => {
    const instructorId = req.session.userId;
    const { currentPassword,newPassword,confirmPassword } = req.body;
    console.log(req.body);
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }
    if(newPassword!=confirmPassword){
        
            return res.status(500).json({ success: false, message: 'password does not mach' });
    }
    
    
    db.query('SELECT * FROM professors WHERE ID = ? AND Password = ?', [instructorId, currentPassword], (error, results) => {
        if (error) {
            console.error('Error changing password:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while changing password.' });
        }
        
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid current password.' });
        }
        
        
        db.query('UPDATE professors SET Password = ? WHERE ID = ?', [newPassword, instructorId], (error, result) => {
            if (error) {
                console.error('Error changing password:', error);
                return res.status(500).json({ success: false, message: 'An error occurred while changing password.' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(500).json({ success: false, message: 'Failed to update password.' });
            }

            res.json({ success: true, message: 'Password changed successfully.' });
        });
    });
});

app.get('/course_details/:courseId', (req, res) => {
    const courseId = req.params.courseId;


    
    db.query('SELECT * FROM professors WHERE id IN (SELECT instructor FROM student_cours WHERE cours_id = ?)', [courseId], (error, instructorsResults) => {
        if (error) {
            console.error('Error fetching instructors:', error);
            return res.status(500).json({ error: 'An error occurred while fetching instructors.' });
        }

        
        db.query('SELECT * FROM student WHERE id IN (SELECT student_id FROM student_cours WHERE cours_id = ?)', [courseId], (error, studentsResults) => {
            if (error) {
                console.error('Error fetching students:', error);
                return res.status(500).json({ error: 'An error occurred while fetching students.' });
            }

            
            db.query('SELECT * FROM assignment WHERE cours_id = ?', [courseId], (error, assignmentsResults) => {
                if (error) {
                    console.error('Error fetching assignments:', error);
                    return res.status(500).json({ error: 'An error occurred while fetching assignments.' });
                }

                
                const courseDetails = {
                    instructors: instructorsResults,
                    students: studentsResults,
                    assignments: assignmentsResults
                };

                
                res.json(courseDetails);
            });
        });
    });
});
app.get('/instructor/course_details/:courseId', (req, res) => {
    const instructorId = req.session.userId; 
    const courseId = req.params.courseId;

    if (!instructorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    
    db.query('SELECT * FROM professors WHERE id = ?', [instructorId], (error, instructorsResults) => {
        if (error) {
            console.error('Error fetching instructor details:', error);
            return res.status(500).json({ error: 'An error occurred while fetching instructor details.' });
        }

        
        const instructor = instructorsResults[0];
        if (!instructor) {
            return res.status(404).json({ error: 'Instructor not found or not associated with the course.' });
        }

       
            db.query('SELECT * FROM student WHERE id IN (SELECT student_id FROM student_cours WHERE cours_id = ?)', [courseId], (error, studentsResults) => {
                if (error) {
                    console.error('Error fetching students:', error);
                    return res.status(500).json({ error: 'An error occurred while fetching students.' });
                }
    
                
                db.query('SELECT * FROM assignment WHERE cours_id = ?', [courseId], (error, assignmentsResults) => {
                    if (error) {
                        console.error('Error fetching assignments:', error);
                        return res.status(500).json({ error: 'An error occurred while fetching assignments.' });
                    }
    
                    
                    const courseDetails = {
                        
                        students: studentsResults,
                        assignments: assignmentsResults
                    };
    
                   
                    res.json(courseDetails);
                });
            });
        });
   
});


app.post('/addStudentToCourse/:courseId/:studentId/:instructorId', (req, res) => {
    const courseId = req.params.courseId;
    const { studentId, instructorId } = req.params;

    if (!studentId || !courseId || !instructorId) {
        return res.status(400).json({ error: 'Missing studentId, courseId, or instructorId' });
    }

    db.query('INSERT INTO student_cours (student_id, cours_id, instructor) VALUES (?, ?, ?)', [studentId, courseId, instructorId], (error, results) => {
        if (error) {
            console.error('Error adding student to course:', error);
            return res.status(500).json({ error: 'An error occurred while adding student to course.' });
        }

        
        res.status(200).json({ success: true });
    });
});



app.post('/addAssignment/:courseId', (req, res) => {
    const courseId = req.params.courseId;
    const { title, deadline,total_grade } = req.body;
    const instructorId = req.session.userId;;
    console.log(req.body);
    
    db.query('INSERT INTO assignment (title, deadline, cours_id ,instructor_id,	total_grade) VALUES (?, ?, ? ,?,?)', [title, deadline, courseId , instructorId , total_grade], (error, result) => {
        if (error) {
            console.error('Error adding assignment:', error);
            return res.status(500).json({ error: 'An error occurred while adding the assignment.' });
        }

        const assignmentId = result.insertId;

        
        db.query('SELECT student_id FROM student_cours WHERE cours_id = ?', [courseId], (error, results) => {
            if (error) {
                console.error('Error fetching enrolled students:', error);
                return res.status(500).json({ error: 'An error occurred while fetching enrolled students.' });
            }

           
            results.forEach(student => {
                const studentId = student.student_id;
                
                db.query('INSERT INTO `student-grade` (student_id, assigment_id, title, deadline, grade) VALUES (?, ?, ?, ?, ?)', [studentId, assignmentId, title, deadline, 'Not graded'], (error) => {
                    if (error) {
                        console.error('Error adding grade for student:', error);
                       
                    }
                });
            });

            res.json({ message: 'Assignment added successfully' });
        });
    });
});
app.get('/courses/:courseId/upcoming_assignments', (req, res) => {
    const courseId = req.params.courseId;

    
    db.query('SELECT * FROM student_grades WHERE courseId = ?', [courseId], (error, results) => {
        if (error) {
            console.error('Error fetching student grades:', error);
            return res.status(500).json({ error: 'An error occurred while fetching student grades.' });
        }

        res.json(results);
    });
});

app.get('/api/assignment_details', (req, res) => {
    const assignmentId = req.query.assignmentId;
    const courseId = req.query.courseId;

    if (!assignmentId || !courseId) {
        return res.status(400).json({ error: 'Both assignmentId and courseId are required.' });
    }

   
    db.query('SELECT * FROM `student-grade` WHERE assiment_id = ? AND cours_id = ?', [assignmentId, courseId], (error, results) => {
        if (error) {
            console.error('Error fetching student marks:', error);
            return res.status(500).json({ error: 'An error occurred while fetching student marks.' });
        }

        res.json(results);
    });
});


