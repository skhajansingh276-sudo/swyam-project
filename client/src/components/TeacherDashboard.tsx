import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/TeacherDashboard.css';

interface Submission {
    id: number;
    name: string;
    rollNo: string;
    course: string;
    enrolled: string;
    screenshot: string | null;
    submittedAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TeacherDashboard: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
            const response = await axios.get(`${API_URL}/api/submissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmissions(response.data);
        } catch (error) {
            console.error('Error fetching submissions:', error);
            localStorage.removeItem('teacherToken');
            navigate('/teacher-login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('teacherToken');
        localStorage.removeItem('teacherName');
        navigate('/teacher-login');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h2>Welcome, {teacherName}</h2>
                    <p>SWAYAM Enrollment Submissions</p>
                </div>
                <div className="header-actions">
                    <button onClick={() => fetchSubmissions(localStorage.getItem('teacherToken')!)} className="refresh-btn">Refresh</button>
                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                </div>
            </header>

            {loading ? (
                <p>Loading records...</p>
            ) : (
                <div className="table-responsive">
                    <table className="submissions-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Course</th>
                                <th>Enrolled</th>
                                <th>Screenshot</th>
                                <th>Submitted At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.length > 0 ? submissions.map((sub) => (
                                <tr key={sub.id}>
                                    <td>{sub.name}</td>
                                    <td>{sub.rollNo}</td>
                                    <td>{sub.course}</td>
                                    <td className={sub.enrolled === 'Yes' ? 'status-yes' : 'status-no'}>
                                        {sub.enrolled}
                                    </td>
                                    <td>
                                        {sub.screenshot ? (
                                            <button 
                                                className="view-btn"
                                                onClick={() => setSelectedImage(`${API_URL}/uploads/${sub.screenshot}`)}
                                            >
                                                View Proof
                                            </button>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} style={{textAlign: 'center'}}>No submissions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedImage && (
                <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setSelectedImage(null)}>&times;</button>
                        <img src={selectedImage} alt="Proof of Enrollment" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
