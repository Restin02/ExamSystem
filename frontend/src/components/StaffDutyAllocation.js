import React, { useState, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StaffDutyAllocation = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [availableStaff, setAvailableStaff] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Logic for Grade Highlighting Colors (Existing)
    const getGradeStyles = (grade) => {
        const g = grade?.toUpperCase() || '';
        if (g.includes('PROFESSOR') || g.includes('HOD')) {
            return { bg: '#fed7d7', text: '#9b2c2c', border: '#feb2b2', rgb: [254, 215, 215] }; // Red
        } else if (g.includes('ASSISTANT') || g.includes('ASST')) {
            return { bg: '#ebf8ff', text: '#2b6cb0', border: '#bee3f8', rgb: [235, 248, 255] }; // Blue
        } else if (g.includes('LECTURER')) {
            return { bg: '#feebc8', text: '#7b341e', border: '#fbd38d', rgb: [254, 235, 200] }; // Orange
        }
        return { bg: '#edf2f7', text: '#4a5568', border: '#e2e8f0', rgb: [237, 242, 247] }; // Default
    };

    // Helper for Exam Type Styles
    const getExamTypeStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('internal')) return { color: '#4a5568', bg: '#f1f5f9' };
        if (t.includes('supplementary')) return { color: '#991b1b', bg: '#fee2e2' };
        return { color: '#166534', bg: '#dcfce7' }; // Regular
    };

    const sortedStaff = useMemo(() => {
        return [...availableStaff].sort((a, b) => {
            if (a.date !== b.date) {
                return new Date(a.date) - new Date(b.date);
            }
            const sessionOrder = { 'FN': 1, 'AN': 2 };
            return sessionOrder[a.session] - sessionOrder[b.session];
        });
    }, [availableStaff]);

    const formatDateParts = (dateStr) => {
        const date = new Date(dateStr);
        return {
            dayName: date.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase(),
            dateNum: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
    };

    const fetchAllocatedStaff = async () => {
        if (!startDate || !endDate) {
            alert("Please select dates");
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://127.0.0.1:8000/api/admin/get-allocated-duties/`, {
                params: { start: startDate, end: endDate },
                headers: { 'Authorization': `Token ${token}` }
            });
            setAvailableStaff(res.data.allocated_staff || []);
        } catch (err) {
            alert("Error fetching session availability.");
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF('landscape');
        doc.setFontSize(18);
        doc.text("FACULTY DUTY ALLOCATION REPORT", 148, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Period: ${startDate} to ${endDate}`, 148, 22, { align: "center" });

        // Added "Exam Type" to columns
        const tableColumn = ["Date", "Day", "Type", "Session", "Faculty Name", "Dept", "Branch", "Grade"];
        const tableRows = sortedStaff.map(item => {
            const { dayName, dateNum } = formatDateParts(item.date);
            return [dateNum, dayName, item.exam_type || 'Regular', item.session, item.name, item.department || '—', item.branch || '—', item.grade || '—'];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72], halign: 'center', fontSize: 10 },
            styles: { fontSize: 9, cellPadding: 3 },
            didDrawCell: (data) => {
                // Color the Grade column (Now index 7 because we added Type)
                if (data.section === 'body' && data.column.index === 7) {
                    const gradeText = data.cell.raw;
                    const style = getGradeStyles(gradeText);
                    doc.setFillColor(...style.rgb);
                    doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    doc.setTextColor(style.text);
                    doc.text(data.cell.text, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2);
                    return false; 
                }
            },
            columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 7: { halign: 'center', fontStyle: 'bold' } }
        });

        doc.save(`Duty_Allocation_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <div style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: '"Inter", sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#1a202c', fontWeight: '800' }}>Faculty Availability Dashboard</h1>
                <p style={{ color: '#718096' }}>Comprehensive Exam Duty Analysis</p>
            </div>

            <div style={{ 
                maxWidth: '1000px', margin: '0 auto 40px', backgroundColor: '#fff', 
                padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'flex-end', border: '1px solid #edf2f7'
            }}>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '8px' }}>FROM</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '8px' }}>TO</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                </div>
                <button onClick={fetchAllocatedStaff} style={{ padding: '10px 20px', backgroundColor: '#2d3748', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Run Analysis</button>
                {sortedStaff.length > 0 && (
                    <button onClick={generatePDF} style={{ padding: '10px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Download PDF</button>
                )}
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', fontWeight: '600' }}>Loading Staff Data...</p>
                ) : sortedStaff.length > 0 ? (
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#2d3748', color: 'white' }}>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Date & Day</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>Exam Type</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>Session</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Faculty Member</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Dept</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Branch</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStaff.map((item, index) => {
                                    const { dayName, dateNum } = formatDateParts(item.date);
                                    const gradeStyle = getGradeStyles(item.grade);
                                    const typeStyle = getExamTypeStyles(item.exam_type);
                                    return (
                                        <tr key={index} style={{ borderBottom: '1px solid #edf2f7' }}>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ fontWeight: '800', color: '#2b6cb0', fontSize: '13px' }}>{dayName}</div>
                                                <div style={{ fontSize: '11px', color: '#718096' }}>{dateNum}</div>
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', 
                                                    backgroundColor: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.color}44`
                                                }}>
                                                    {item.exam_type || 'Regular'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', backgroundColor: item.session === 'FN' ? '#ebf8ff' : '#fffaf0', color: item.session === 'FN' ? '#2b6cb0' : '#c05621' }}>{item.session}</span>
                                            </td>
                                            <td style={{ padding: '15px', fontWeight: '600', color: '#1a202c' }}>{item.name}</td>
                                            <td style={{ padding: '15px', fontSize: '13px', color: '#4a5568' }}>{item.department || '—'}</td>
                                            <td style={{ padding: '15px', fontSize: '13px', color: '#4a5568' }}>{item.branch || '—'}</td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                <span style={{ 
                                                    fontSize: '10px', fontWeight: '800', padding: '4px 12px', borderRadius: '6px',
                                                    backgroundColor: gradeStyle.bg, color: gradeStyle.text, border: `1px solid ${gradeStyle.border}`,
                                                    textTransform: 'uppercase', letterSpacing: '0.5px'
                                                }}>
                                                    {item.grade || '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    startDate && <p style={{ textAlign: 'center', color: '#a0aec0' }}>No records found.</p>
                )}
            </div>
        </div>
    );
};

export default StaffDutyAllocation;