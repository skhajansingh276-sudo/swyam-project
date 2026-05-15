import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/TeacherDashboard.css';

interface Submission {
    id: number;
    name: string;
    rollNo: string;
    course: string;
    semester: string;
    enrolled: string;
    screenshot: string | null;
    submittedAt: string;
    theoryMarks?: number;
    internalMarks?: number;
    displayOrder?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TeacherDashboard: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [marksState, setMarksState] = useState<Record<number, { theory: string, internal: string }>>({});
    const [saving, setSaving] = useState<number | null>(null);
    const [pdfCourse, setPdfCourse] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState<string>('');
    
    const navigate = useNavigate();
    const teacherName = localStorage.getItem('teacherName');

    useEffect(() => {
        const token = localStorage.getItem('teacherToken');
        if (!token) {
            navigate('/teacher-login');
        } else {
            fetchSubmissions(token);
        }
    }, []);

    const fetchSubmissions = async (token: string) => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/submissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data: Submission[] = response.data;
            setSubmissions(data);
            
            const initMarks: Record<number, { theory: string, internal: string }> = {};
            data.forEach(sub => {
                initMarks[sub.id] = {
                    theory: sub.theoryMarks !== null && sub.theoryMarks !== undefined ? sub.theoryMarks.toString() : '',
                    internal: sub.internalMarks !== null && sub.internalMarks !== undefined ? sub.internalMarks.toString() : ''
                };
            });
            setMarksState(initMarks);
        } catch (error) {
            console.error('Error fetching submissions:', error);
            if ((error as any).response?.status === 401 || (error as any).response?.status === 403) {
                localStorage.removeItem('teacherToken');
                navigate('/teacher-login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('teacherToken');
        localStorage.removeItem('teacherName');
        navigate('/teacher-login');
    };

    const handleMarksChange = (id: number, type: 'theory' | 'internal', value: string) => {
        setMarksState(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [type]: value
            }
        }));
    };

    const saveMarks = async (id: number) => {
        const token = localStorage.getItem('teacherToken');
        setSaving(id);
        try {
            await axios.put(`${API_URL}/api/submissions/${id}/marks`, {
                theoryMarks: marksState[id].theory,
                internalMarks: marksState[id].internal
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Marks saved successfully!');
        } catch (error) {
            console.error('Error saving marks:', error);
            alert('Failed to save marks.');
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this student's data?")) return;
        
        const token = localStorage.getItem('teacherToken');
        try {
            await axios.delete(`${API_URL}/api/submissions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmissions(prev => prev.filter(sub => sub.id !== id));
            alert('Deleted successfully.');
        } catch (error) {
            console.error('Error deleting submission:', error);
            alert('Failed to delete.');
        }
    };

    const calculateTotalAndPercentage = (theoryStr: string, internalStr: string) => {
        const theory = parseInt(theoryStr, 10) || 0;
        const internal = parseInt(internalStr, 10) || 0;
        return theory + internal;
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("SWAYAM Student Management System", 14, 22);
        
        const studentsToExport = submissions.filter(sub => {
            if (pdfCourse === 'All') return true;
            return sub.course === pdfCourse;
        }).filter(sub => {
            const search = searchTerm.toLowerCase();
            return (
                sub.name.toLowerCase().includes(search) ||
                sub.rollNo.toLowerCase().includes(search)
            );
        });

        doc.setFontSize(12);
        doc.text(`Course: ${pdfCourse}`, 14, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

        const tableColumn = ["S.No", "Name", "Roll No", "Course", "Semester", "Status", "Theory", "Internal", "Total"];
        const tableRows: any[] = [];

        studentsToExport.forEach((sub, index) => {
            const currentMarks = marksState[sub.id] || { theory: '', internal: '' };
            const total = calculateTotalAndPercentage(currentMarks.theory, currentMarks.internal);
            
            const rowData = [
                index + 1,
                sub.name,
                sub.rollNo,
                sub.course,
                sub.semester,
                sub.enrolled,
                currentMarks.theory || '-',
                currentMarks.internal || '-',
                total
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });

        doc.save(`students_list_${pdfCourse}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const courses = ['MCA', 'MSC COMPUTER SCIENCE', 'MSC (DSML)'];

    const renderTable = (courseSubmissions: Submission[], title: string) => (
        <div className="course-section" key={title}>
            <h2 className="course-title">{title} ({courseSubmissions.length})</h2>
            <div className="table-container">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Student Details</th>
                            <th>Semester</th>
                            <th>Status</th>
                            <th>Proof</th>
                            <th>Theory</th>
                            <th>Internal</th>
                            <th>Total</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courseSubmissions.length > 0 ? courseSubmissions.map((sub) => {
                            const currentMarks = marksState[sub.id] || { theory: '', internal: '' };
                            const total = calculateTotalAndPercentage(currentMarks.theory, currentMarks.internal);
                            
                            return (
                            <tr key={sub.id}>
                                <td>
                                    <div className="student-info-cell">
                                        <div>
                                            <div className="student-name">{sub.name}</div>
                                            <div className="student-roll">{sub.rollNo}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span className="semester-tag">{sub.semester}</span></td>
                                <td>
                                    <span className={`badge ${sub.enrolled === 'Yes' ? 'badge-success' : 'badge-error'}`}>
                                        {sub.enrolled === 'Yes' ? 'Enrolled' : 'Pending'}
                                    </span>
                                </td>
                                <td>
                                    {sub.screenshot ? (
                                        <button 
                                            className="icon-btn view-btn"
                                            onClick={() => setSelectedImage(`${API_URL}/uploads/${sub.screenshot}`)}
                                            title="View Proof"
                                        >
                                            🖼️
                                        </button>
                                    ) : (
                                        <span className="text-muted">N/A</span>
                                    )}
                                </td>
                                <td>
                                    <input 
                                        type="number" 
                                        className="input marks-field"
                                        value={currentMarks.theory} 
                                        onChange={(e) => handleMarksChange(sub.id, 'theory', e.target.value)}
                                        placeholder="Th"
                                    />
                                </td>
                                <td>
                                    <input 
                                        type="number" 
                                        className="input marks-field"
                                        value={currentMarks.internal} 
                                        onChange={(e) => handleMarksChange(sub.id, 'internal', e.target.value)}
                                        placeholder="Int"
                                    />
                                </td>
                                <td>
                                    <div className="total-badge">
                                        {total}%
                                    </div>
                                </td>
                                <td>
                                    <div className="row-actions">
                                        <button 
                                            className="icon-btn save-btn"
                                            onClick={() => saveMarks(sub.id)}
                                            disabled={saving === sub.id}
                                            title="Save Marks"
                                        >
                                            {saving === sub.id ? '⏳' : '💾'}
                                        </button>
                                        <button 
                                            className="icon-btn delete-btn"
                                            onClick={() => handleDelete(sub.id)}
                                            title="Delete Record"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}) : (
                            <tr><td colSpan={8} className="empty-state">No students found in this course.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const filteredSubmissions = submissions.filter(sub => {
        const search = searchTerm.toLowerCase();
        return (
            sub.name.toLowerCase().includes(search) ||
            sub.rollNo.toLowerCase().includes(search) ||
            sub.course.toLowerCase().includes(search)
        );
    });

    // Calculate stats
    const totalStudents = submissions.length;
    const enrolledStudents = submissions.filter(s => s.enrolled === 'Yes').length;
    const avgMarks = submissions.length > 0 
        ? (submissions.reduce((acc, sub) => {
            const marks = marksState[sub.id] || { theory: '0', internal: '0' };
            return acc + calculateTotalAndPercentage(marks.theory, marks.internal);
        }, 0) / submissions.length).toFixed(1)
        : 0;

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-topbar">
                <div className="welcome-text">
                    <h1>Teacher Dashboard</h1>
                    <p>Welcome back, <strong>{teacherName}</strong></p>
                </div>
                <div className="topbar-actions">
                    <button onClick={() => fetchSubmissions(localStorage.getItem('teacherToken')!)} className="btn btn-bg refresh-btn">
                        <span>🔄</span> Refresh
                    </button>
                    <button onClick={handleLogout} className="btn logout-btn">
                        <span>🚪</span> Logout
                    </button>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                        <h3>{totalStudents}</h3>
                        <p>Total Students</p>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon success">✅</div>
                    <div className="stat-info">
                        <h3>{enrolledStudents}</h3>
                        <p>Enrolled Proofs</p>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon primary">📊</div>
                    <div className="stat-info">
                        <h3>{avgMarks}%</h3>
                        <p>Average Marks</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content card">
                <div className="content-toolbar">
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder="Search name or roll no..." 
                            className="input search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="toolbar-right">
                        <div className="pdf-tool">
                            <select 
                                className="input pdf-course-select"
                                value={pdfCourse} 
                                onChange={(e) => setPdfCourse(e.target.value)}
                            >
                                <option value="All">All Courses</option>
                                {courses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button onClick={generatePDF} className="btn btn-primary pdf-btn">
                                📄 Export PDF
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">Loading student records...</div>
                ) : (
                    <div className="course-groups">
                        {courses.map(course => {
                            const courseSubmissions = filteredSubmissions.filter(sub => sub.course === course);
                            return renderTable(courseSubmissions, course);
                        })}
                        
                        {filteredSubmissions.filter(sub => !courses.includes(sub.course)).length > 0 && 
                            renderTable(filteredSubmissions.filter(sub => !courses.includes(sub.course)), 'Other Courses')
                        }
                    </div>
                )}
            </div>

            {selectedImage && (
                <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
                    <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Proof of Enrollment</h3>
                            <button className="close-btn" onClick={() => setSelectedImage(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <img src={selectedImage} alt="Proof" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
