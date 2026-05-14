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
    const [pdfCount, setPdfCount] = useState<string>('10');
    const [searchTerm, setSearchTerm] = useState<string>('');
    
    // Drag and drop state
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [isOrderChanged, setIsOrderChanged] = useState(false);

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
            setIsOrderChanged(false);
            
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

    const handleSort = () => {
        const _submissions = [...submissions];
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const draggedItemContent = _submissions.splice(dragItem.current, 1)[0];
            _submissions.splice(dragOverItem.current, 0, draggedItemContent);
            
            dragItem.current = null;
            dragOverItem.current = null;
            setSubmissions(_submissions);
            setIsOrderChanged(true);
        }
    };

    const saveSequence = async () => {
        const token = localStorage.getItem('teacherToken');
        const orderedIds = submissions.map(sub => sub.id);
        try {
            await axios.put(`${API_URL}/api/submissions/reorder`, { orderedIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsOrderChanged(false);
            alert('Sequence saved successfully!');
        } catch (error) {
            console.error('Error saving sequence:', error);
            alert('Failed to save sequence.');
        }
    };

    const filteredSubmissions = submissions.filter(sub => {
        const search = searchTerm.toLowerCase();
        return (
            sub.name.toLowerCase().includes(search) ||
            sub.rollNo.toLowerCase().includes(search) ||
            sub.course.toLowerCase().includes(search)
        );
    });

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("SWAYAM Student Management System", 14, 22);
        
        const count = parseInt(pdfCount, 10) || filteredSubmissions.length;
        const studentsToExport = filteredSubmissions.slice(0, count);

        const tableColumn = ["S.No", "Name", "Roll No", "Course", "Enrolled", "Theory", "Internal", "Total (%)"];
        const tableRows: any[] = [];

        studentsToExport.forEach((sub, index) => {
            const currentMarks = marksState[sub.id] || { theory: '', internal: '' };
            const total = calculateTotalAndPercentage(currentMarks.theory, currentMarks.internal);
            
            const rowData = [
                index + 1,
                sub.name,
                sub.rollNo,
                sub.course,
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
            startY: 30,
        });

        doc.save(`students_list_${new Date().toISOString().split('T')[0]}.pdf`);
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

            <div className="toolbar">
                <div className="search-container">
                    <input 
                        type="text" 
                        placeholder="Search by name, roll no, or course..." 
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="pdf-controls">
                    <label>Students for PDF:</label>
                    <input 
                        type="number" 
                        className="pdf-count-input"
                        value={pdfCount} 
                        onChange={(e) => setPdfCount(e.target.value)}
                        min="1"
                    />
                    <button onClick={generatePDF} className="pdf-btn">Download PDF</button>
                </div>
                {isOrderChanged && (
                    <button onClick={saveSequence} className="save-seq-btn">💾 Save Sequence</button>
                )}
            </div>

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
                            {filteredSubmissions.length > 0 ? filteredSubmissions.map((sub, index) => {
                                const currentMarks = marksState[sub.id] || { theory: '', internal: '' };
                                const total = calculateTotalAndPercentage(currentMarks.theory, currentMarks.internal);
                                
                                return (
                                <tr 
                                    key={sub.id}
                                    draggable
                                    onDragStart={() => (dragItem.current = index)}
                                    onDragEnter={() => (dragOverItem.current = index)}
                                    onDragEnd={handleSort}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="draggable-row"
                                    title="Drag to reorder"
                                >
                                    <td><strong>☰</strong> {sub.name}</td>
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
                                    <td className="actions-cell">
                                        <button 
                                            className="save-marks-btn"
                                            onClick={() => saveMarks(sub.id)}
                                            disabled={saving === sub.id}
                                        >
                                            {saving === sub.id ? 'Saving...' : 'Save'}
                                        </button>
                                        <button 
                                            className="delete-btn"
                                            onClick={() => handleDelete(sub.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            )}) : (
                                <tr><td colSpan={8} style={{textAlign: 'center'}}>No submissions match your search.</td></tr>
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
