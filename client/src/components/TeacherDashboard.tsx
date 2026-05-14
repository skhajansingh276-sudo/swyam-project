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
    theoryMarks?: number;
    internalMarks?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TeacherDashboard: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [marksState, setMarksState] = useState<Record<number, { theory: string, internal: string }>>({});
    const [saving, setSaving] = useState<number | null>(null);
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
            const data: Submission[] = response.data;
            setSubmissions(data);
            
            // Initialize local marks state from DB
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

    const calculateTotalAndPercentage = (theoryStr: string, internalStr: string) => {
        const theory = parseInt(theoryStr, 10) || 0;
        const internal = parseInt(internalStr, 10) || 0;
        const total = theory + internal;
        // Since max is 100, Percentage = Total
        return total;
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h2>Welcome, {teacherName}</h2>
                    <p>SWAYAM Student Management System</p>
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
                                <th>Proof</th>
                                <th>Theory</th>
                                <th>Internal</th>
                                <th>Total & %</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.length > 0 ? submissions.map((sub) => {
                                const currentMarks = marksState[sub.id] || { theory: '', internal: '' };
                                const total = calculateTotalAndPercentage(currentMarks.theory, currentMarks.internal);
                                
                                return (
                                <tr key={sub.id}>
                                    <td>{sub.name}</td>
                                    <td>{sub.rollNo}</td>
                                    <td>{sub.course}</td>
                                    <td>
                                        {sub.screenshot ? (
                                            <button 
                                                className="view-btn"
                                                onClick={() => setSelectedImage(`${API_URL}/uploads/${sub.screenshot}`)}
                                            >
                                                View
                                            </button>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td>
                                        <input 
                                            type="number" 
                                            className="marks-input"
                                            value={currentMarks.theory} 
                                            onChange={(e) => handleMarksChange(sub.id, 'theory', e.target.value)}
                                            placeholder="Th"
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="number" 
                                            className="marks-input"
                                            value={currentMarks.internal} 
                                            onChange={(e) => handleMarksChange(sub.id, 'internal', e.target.value)}
                                            placeholder="Int"
                                        />
                                    </td>
                                    <td>
                                        <strong>{total}</strong> <br/>
                                        <small className="percentage-badge">{total}%</small>
                                    </td>
                                    <td>
                                        <button 
                                            className="save-marks-btn"
                                            onClick={() => saveMarks(sub.id)}
                                            disabled={saving === sub.id}
                                        >
                                            {saving === sub.id ? 'Saving...' : 'Save'}
                                        </button>
                                    </td>
                                </tr>
                            )}) : (
                                <tr><td colSpan={8} style={{textAlign: 'center'}}>No submissions found.</td></tr>
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
