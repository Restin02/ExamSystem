import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StaffClassroomAllocation = ({ token }) => {
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const today = new Date().toISOString().split('T')[0];
    const [filter, setFilter] = useState({ startDate: today, endDate: today });

    // --- SHARED STYLING LOGIC ---
    const getGradeStyles = (grade) => {
        const g = grade?.toUpperCase() || '';
        if (g.includes('ASSISTANT')) return { bg: '#ebf8ff', text: '#2b6cb0', border: '#bee3f8', rgb: [235, 248, 255] };
        if (g.includes('ASSOCIATE')) return { bg: '#fff5f5', text: '#c53030', border: '#feb2b2', rgb: [255, 245, 245] };
        if (g.includes('PROFESSOR') || g.includes('HOD')) return { bg: '#fed7d7', text: '#9b2c2c', border: '#feb2b2', rgb: [254, 215, 215] };
        return { bg: '#edf2f7', text: '#4a5568', border: '#e2e8f0', rgb: [237, 242, 247] };
    };

    const getExamTypeStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('internal')) return { color: '#7b341e', bg: '#feebc8', border: '#fbd38d' };
        if (t.includes('supplementary')) return { color: '#991b1b', bg: '#fee2e2', border: '#fecaca' };
        return { color: '#166534', bg: '#dcfce7', border: '#bbf7d0' };
    };

    const formatDateParts = (dateStr) => {
        if (!dateStr) return { dayName: '—', dateNum: '—' };
        const date = new Date(dateStr);
        return {
            dayName: date.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase(),
            dateNum: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
    };

    const fetchAllocations = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/admin/get-duty-assignments/', {
                headers: { 'Authorization': `Token ${token}` },
                params: { start: filter.startDate, end: filter.endDate }
            });
            setAllocations(res.data);
        } catch (err) {
            console.error("Error fetching assignments:", err);
        } finally {
            setLoading(false);
        }
    }, [token, filter.startDate, filter.endDate]);

    useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

    // --- PDF GENERATION ---
    const generatePDF = () => {
        const doc = new jsPDF('landscape');
        doc.setFontSize(18);
        doc.text("STAFF CLASSROOM ALLOCATION REPORT", 148, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Period: ${filter.startDate} to ${filter.endDate}`, 148, 22, { align: "center" });

        const tableColumn = ["Date", "Day", "Session", "Exam Type", "Room", "Faculty Name", "Dept", "Grade"];
        const tableRows = allocations.map(item => {
            const { dayName, dateNum } = formatDateParts(item.exam_date);
            return [
                dateNum, dayName, item.exam_session, item.exam_type, 
                `${item.block_name} - ${item.room_name}`, item.staff_name, item.department, item.grade
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72], halign: 'center' },
            styles: { fontSize: 8 },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 7) {
                    const style = getGradeStyles(data.cell.raw);
                    doc.setFillColor(...style.rgb);
                    doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    doc.setTextColor(style.text);
                    doc.text(data.cell.text, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2);
                    return false; 
                }
            }
        });
        doc.save(`Classroom_Allocations_${filter.startDate}.pdf`);
    };

    return (
        <div style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ color: '#1a202c', fontWeight: '800' }}>Staff Exam Duty Allocation Report</h2>
                <p style={{ color: '#718096' }}>Automatic results based on FIFO logic.</p>
            </div>

            <div style={{ 
                maxWidth: '1100px', margin: '0 auto 40px', backgroundColor: '#fff', 
                padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'flex-end', border: '1px solid #eee'
            }}>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>FROM DATE</label>
                    <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>TO DATE</label>
                    <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <button onClick={fetchAllocations} style={{ padding: '11px 25px', backgroundColor: '#2d3748', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                    {loading ? 'Loading...' : 'Refresh Report'}
                </button>
                {allocations.length > 0 && (
                    <button onClick={generatePDF} style={{ padding: '11px 25px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Download PDF</button>
                )}
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2d3748', color: 'white' }}>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Date & Day</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Session</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Exam Type</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Classroom</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Faculty Name</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.length > 0 ? (
                                allocations.map((item, index) => {
                                    const { dayName, dateNum } = formatDateParts(item.exam_date);
                                    const typeStyle = getExamTypeStyles(item.exam_type);
                                    const gradeStyle = getGradeStyles(item.grade);
                                    return (
                                        <tr key={index} style={{ borderBottom: '1px solid #edf2f7' }}>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '13px' }}>{dayName}</div>
                                                <div style={{ fontSize: '11px', color: '#718096' }}>{dateNum}</div>
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: item.exam_session === 'FN' ? '#ebf8ff' : '#fffaf0', color: item.exam_session === 'FN' ? '#2b6cb0' : '#c05621' }}>{item.exam_session}</span>
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: typeStyle.bg, color: typeStyle.color }}>{item.exam_type}</span>
                                            </td>
                                            <td style={{ padding: '15px', fontWeight: '800', color: '#1a202c' }}>{item.block_name} - {item.room_name}</td>
                                            <td style={{ padding: '15px', fontWeight: '600' }}>{item.staff_name}</td>
                                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                                <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', backgroundColor: gradeStyle.bg, color: gradeStyle.text, border: `1px solid ${gradeStyle.border}` }}>{item.grade}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '50px', textAlign: 'center', color: '#a0aec0' }}>
                                        {loading ? "Searching allocations..." : "No duty allocations found for these dates."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


export default StaffClassroomAllocation;