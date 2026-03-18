import React, { useState, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StaffDutyAllocation = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [availableStaff, setAvailableStaff] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Grade Styling & Weighting Logic
    const getGradeStyles = (grade) => {
        const g = grade?.toUpperCase() || '';
        if (g.includes('ASSISTANT') || g.includes('ASST')) {
            return { bg: '#ebf8ff', text: '#2b6cb0', border: '#bee3f8', rgb: [235, 248, 255], weight: 1 };
        } else if (g.includes('ASSOCIATE')) {
            return { bg: '#fff5f5', text: '#c53030', border: '#feb2b2', rgb: [255, 245, 245], weight: 2 };
        } else if (g.includes('PROFESSOR') || g.includes('HOD')) {
            return { bg: '#fed7d7', text: '#9b2c2c', border: '#feb2b2', rgb: [254, 215, 215], weight: 3 };
        }
        return { bg: '#edf2f7', text: '#4a5568', border: '#e2e8f0', rgb: [237, 242, 247], weight: 4 };
    };

    // 2. Exam Type Styling
    const getExamTypeStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('internal')) return { color: '#7b341e', bg: '#feebc8', border: '#fbd38d' };
        if (t.includes('supplementary')) return { color: '#991b1b', bg: '#fee2e2', border: '#fecaca' };
        return { color: '#166534', bg: '#dcfce7', border: '#bbf7d0' };
    };

    // 3. Balanced Sorting Logic
    const sortedStaff = useMemo(() => {
        return [...availableStaff].sort((a, b) => {
            if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
            const sessionOrder = { 'FN': 1, 'AN': 2 };
            const sessA = sessionOrder[a.session] || 3;
            const sessB = sessionOrder[b.session] || 3;
            if (sessA !== sessB) return sessA - sessB;
            const weightA = getGradeStyles(a.grade).weight;
            const weightB = getGradeStyles(b.grade).weight;
            if (weightA !== weightB) return weightA - weightB;
            return (b.balance_count || 0) - (a.balance_count || 0);
        });
    }, [availableStaff]);

    // 4. Calculate Unique Staff Count
    const totalUniqueStaff = useMemo(() => {
        const uniqueNames = new Set(availableStaff.map(s => s.name));
        return uniqueNames.size;
    }, [availableStaff]);

    const formatDateParts = (dateStr) => {
        if (!dateStr) return { dayName: '—', dateNum: '—' };
        const date = new Date(dateStr);
        return {
            dayName: date.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase(),
            dateNum: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
    };

    const fetchAllocatedStaff = async () => {
        if (!startDate || !endDate) return alert("Please select date range");
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://127.0.0.1:8000/api/admin/get-allocated-duties/`, {
                params: { start: startDate, end: endDate },
                headers: { 'Authorization': `Token ${token}` }
            });
            setAvailableStaff(res.data.allocated_staff || []);
        } catch (err) {
            alert("Error fetching records.");
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = () => {
        try {
            const doc = new jsPDF('landscape');
            doc.setFontSize(18);
            doc.text("FACULTY DUTY ALLOCATION REPORT", 148, 15, { align: "center" });
            doc.setFontSize(10);
            doc.text(`Range: ${startDate} to ${endDate} | Total Unique Staff: ${totalUniqueStaff}`, 148, 22, { align: "center" });

            const tableColumn = ["Date", "Day", "Exam Type", "Course", "Session", "Faculty Name", "Dept", "Grade", "Bal"];
            const tableRows = sortedStaff.map(item => {
                const { dayName, dateNum } = formatDateParts(item.date);
                return [
                    dateNum, dayName, item.exam_type, item.course_name, item.session, 
                    item.name, item.department, item.grade, item.balance_count
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
            doc.save(`Duty_Allocation_${startDate}_to_${endDate}.pdf`);
        } catch (error) {
            alert("Error generating PDF.");
        }
    };

    return (
        <div style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ color: '#1a202c', fontWeight: '800' }}>Faculty Duty Allocation Dashboard</h2>
                <p style={{ color: '#718096' }}>Allocation and distribution tracking</p>
            </div>

            {/* Range Selectors */}
            <div style={{ 
                maxWidth: '1100px', margin: '0 auto 40px', backgroundColor: '#fff', 
                padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'flex-end', border: '1px solid #eee'
            }}>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', color: '#4a5568' }}>START DATE</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', color: '#4a5568' }}>END DATE</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <button onClick={fetchAllocatedStaff} style={{ padding: '11px 25px', backgroundColor: '#2d3748', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                    {loading ? 'Fetching...' : 'Fetch Duties'}
                </button>
                {sortedStaff.length > 0 && (
                    <button onClick={generatePDF} style={{ padding: '11px 25px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Download PDF</button>
                )}
            </div>

            {/* Main Table */}
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Loading allocation data...</div>
                ) : sortedStaff.length > 0 ? (
                    <>
                        <div style={{ backgroundColor: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#2d3748', color: 'white' }}>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Date & Day</th>
                                        <th style={{ padding: '15px', textAlign: 'center' }}>Exam Type</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Assigned Course</th>
                                        <th style={{ padding: '15px', textAlign: 'center' }}>Session</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Faculty Name</th>
                                        <th style={{ padding: '15px', textAlign: 'center' }}>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStaff.map((item, index) => {
                                        const { dayName, dateNum } = formatDateParts(item.date);
                                        const typeStyle = getExamTypeStyles(item.exam_type);
                                        const gradeStyle = getGradeStyles(item.grade);

                                        return (
                                            <tr key={index} style={{ borderBottom: '1px solid #edf2f7' }}>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '13px' }}>{dayName}</div>
                                                    <div style={{ fontSize: '11px', color: '#718096' }}>{dateNum}</div>
                                                </td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: typeStyle.bg, color: typeStyle.color, textTransform: 'uppercase' }}>{item.exam_type}</span>
                                                </td>
                                                <td style={{ padding: '15px', fontWeight: '800', color: '#1a202c', fontSize: '13px' }}>{item.course_name}</td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: item.session === 'FN' ? '#ebf8ff' : '#fffaf0', color: item.session === 'FN' ? '#2b6cb0' : '#c05621' }}>{item.session}</span>
                                                </td>
                                                <td style={{ padding: '15px', fontWeight: '600', color: '#2d3748' }}>{item.name}</td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', backgroundColor: gradeStyle.bg, color: gradeStyle.text, border: `1px solid ${gradeStyle.border}` }}>{item.grade}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* --- NEW SUMMARY SECTION --- */}
                        <div style={{ 
                            marginTop: '30px', display: 'flex', gap: '20px', justifyContent: 'flex-start'
                        }}>
                            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Total Assignments</div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#2d3748' }}>{sortedStaff.length}</div>
                            </div>
                            
                            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Unique Staff Involved</div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#2b6cb0' }}>{totalUniqueStaff}</div>
                            </div>
                        </div>
                    </>
                ) : (
                    startDate && <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0', backgroundColor: '#fff', borderRadius: '12px' }}>No records found for the selected dates.</div>
                )}
            </div>
        </div>
    );
};

export default StaffDutyAllocation;