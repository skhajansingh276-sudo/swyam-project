import React, { useState } from 'react';
import axios from 'axios';
import '../styles/StudentForm.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StudentForm: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        rollNo: '',
        course: 'MCA',
        enrolled: 'No'
    });
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const data = new FormData();
        data.append('name', formData.name);
        data.append('rollNo', formData.rollNo);
        data.append('course', formData.course);
        data.append('enrolled', formData.enrolled);
        if (file) {
            data.append('screenshot', file);
        }

        try {
            await axios.post(`${API_URL}/api/submit`, data);
            setMessage('Success! Your details have been submitted.');
            setFormData({ name: '', rollNo: '', course: 'MCA', enrolled: 'No' });
            setFile(null);
        } catch (error) {
            console.error('Error submitting form:', error);
            setMessage('Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h2>SWAYAM Enrollment Form</h2>
            <form onSubmit={handleSubmit} className="student-form">
                <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Enter your full name" />
                </div>
                <div className="form-group">
                    <label>Roll Number</label>
                    <input type="text" name="rollNo" value={formData.rollNo} onChange={handleChange} required placeholder="Enter your roll number" />
                </div>
                <div className="form-group">
                    <label>Course</label>
                    <select name="course" value={formData.course} onChange={handleChange}>
                        <option value="MCA">MCA</option>
                        <option value="MSC COMPUTER SCIENCE">MSC COMPUTER SCIENCE</option>
                        <option value="MSC (DSML)">MSC (DSML)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Have you enrolled in SWAYAM?</label>
                    <select name="enrolled" value={formData.enrolled} onChange={handleChange}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Attach Screenshot (Proof of Enrollment)</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} required={formData.enrolled === 'Yes'} />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Details'}
                </button>
                {message && <p className={`message ${message.includes('Success') ? 'success' : 'error'}`}>{message}</p>}
            </form>
        </div>
    );
};

export default StudentForm;
