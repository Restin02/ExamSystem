import React, { useState, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ClassroomSetup = ({ roomList, token, fetchData }) => {
    const [roomForm, setRoomForm] = useState({ 
        block: 'AB Block', 
        room_no: '', 
        capacity: '', 
        date: new Date().toISOString().split('T')[0],
        session: 'FN',
        exam_type: 'Regular' 
    });

    const [blocks, setBlocks] = useState(['AB Block', 'CLC Block']);
    const [newBlockInput, setNewBlockInput] = useState('');
    
    // Filters
    const [filterDate, setFilterDate] = useState('');
    const [filterBlock, setFilterBlock] = useState('');
    const [filterSession, setFilterSession] = useState('');
    const [filterType, setFilterType] = useState(''); 

    // --- LOGIC FOR STYLING ---
    const getExamTypeStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('internal')) return { color: '#4a5568', bg: '#f1f5f9', border: '#cbd5e1' };
        if (t.includes('supplementary')) return { color: '#991b1b', bg: '#fee2e2', border: '#fecaca' };
        return { color: '#166534', bg: '#dcfce7', border: '#bbf7d0' }; 
    };

    const formatDateParts = (dateStr) => {
        const date = new Date(dateStr);
        return {
            dayName: date.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase(),
            dateNum: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
    };

    // --- SORTING & FILTERING LOGIC ---
    const sortedAndFilteredRooms = useMemo(() => {
        return [...roomList]
            .filter(room => {
                return (!filterDate || room.date === filterDate) &&
                       (!filterBlock || room.block === filterBlock) &&
                       (!filterSession || room.session === filterSession) &&
                       (!filterType || room.exam_type === filterType);
            })
            .sort((a, b) => {
                // 1. Primary Sort: Date (Oldest to Newest)
                const dateDiff = new Date(a.date) - new Date(b.date);
                if (dateDiff !== 0) return dateDiff;

                // 2. Secondary Sort: Session (FN before AN)
                // Since 'F' > 'A', we reverse localeCompare
                return b.session.localeCompare(a.session);
            });
    }, [roomList, filterDate, filterBlock, filterSession, filterType]);

    // --- ACTIONS ---
    const handleAddBlock = () => {
        if (newBlockInput && !blocks.includes(newBlockInput)) {
            setBlocks([...blocks, newBlockInput]);
            setRoomForm({ ...roomForm, block: newBlockInput });
            setNewBlockInput('');
        }
    };

    const handleRoomInsert = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://127.0.0.1:8000/api/admin/insert-room/', roomForm, {
                headers: { 'Authorization': `Token ${token}` }
            });
            alert("Room saved successfully!");
            setRoomForm({ ...roomForm, room_no: '', capacity: '' }); 
            fetchData();
        } catch (err) { 
            alert("Error saving room. Please try again."); 
        }
    };

    const handleRemoveRoom = async (id) => {
        if (window.confirm("Are you sure?")) {
            try {
                await axios.delete(`http://127.0.0.1:8000/api/admin/delete-room/${id}/`, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                fetchData();
            } catch (err) { alert("Error deleting room."); }
        }
    };

    // --- PDF GENERATION ---
    const generatePDF = () => {
        const doc = new jsPDF('landscape');
        doc.setFontSize(18);
        doc.text("CLASSROOM ALLOCATION REPORT", 148, 15, { align: "center" });
        
        const tableColumn = ["Date", "Day", "Exam Type", "Session", "Block", "Room No", "Capacity"];
        const tableRows = sortedAndFilteredRooms.map(room => {
            const { dayName, dateNum } = formatDateParts(room.date);
            return [dateNum, dayName, room.exam_type, room.session, room.block, room.room_no, room.capacity];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72], halign: 'center' },
            styles: { fontSize: 9 }
        });

        doc.save(`Classroom_Setup_${new Date().toLocaleDateString()}.pdf`);
    };

    return (
        <div className="tab-section" style={{ padding: '30px', backgroundColor: '#f4f7f6' }}>
            <h3 style={{ color: '#1a202c', fontWeight: '800', fontSize: '1.5rem', textAlign: 'center', marginBottom: '30px' }}>
                🏫 Classroom & Exam Session Setup
            </h3>

            {/* --- INSERTION FORM --- */}
            <form className="admin-form" onSubmit={handleRoomInsert} style={{ 
                maxWidth: '1100px', margin: '0 auto 40px', backgroundColor: '#fff', 
                padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                border: '1px solid #edf2f7'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: '11px', fontWeight: '800' }}>DATE</label>
                        <input type="date" className="admin-input" value={roomForm.date} onChange={e => setRoomForm({...roomForm, date: e.target.value})} required />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '11px', fontWeight: '800' }}>EXAM TYPE</label>
                        <select className="admin-select" value={roomForm.exam_type} onChange={e => setRoomForm({...roomForm, exam_type: e.target.value})}>
                            <option value="Regular">Regular</option>
                            <option value="Internal Test 1">Internal Test 1</option>
                            <option value="Internal Test 2">Internal Test 2</option>
                            <option value="Supplementary">Supplementary</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '11px', fontWeight: '800' }}>SESSION</label>
                        <select className="admin-select" value={roomForm.session} onChange={e => setRoomForm({...roomForm, session: e.target.value})}>
                            <option value="FN">Forenoon (FN)</option>
                            <option value="AN">Afternoon (AN)</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '11px', fontWeight: '800' }}>BLOCK</label>
                        <select className="admin-select" value={roomForm.block} onChange={e => setRoomForm({...roomForm, block: e.target.value})}>
                            {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div style={{ paddingLeft: '10px', borderLeft: '2px solid #e2e8f0' }}>
                        <label className="form-label" style={{ fontSize: '11px', fontWeight: '800' }}>+ NEW BLOCK</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" className="admin-input" placeholder="Name" value={newBlockInput} onChange={e => setNewBlockInput(e.target.value)} />
                            <button type="button" onClick={handleAddBlock} className="btn-save" style={{ padding: '8px 12px', background: '#64748b' }}>Add</button>
                        </div>
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '11px', fontWeight: '800' }}>ROOM</label>
                        <input type="text" className="admin-input" placeholder="301" value={roomForm.room_no} onChange={e => setRoomForm({...roomForm, room_no: e.target.value})} required />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '11px', fontWeight: '800' }}>CAPACITY</label>
                        <input type="number" className="admin-input" placeholder="30" value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} required />
                    </div>
                    <button type="submit" className="btn-save" style={{ backgroundColor: '#2d3748', fontWeight: '700' }}>Save Room</button>
                </div>
            </form>

            {/* --- FILTER & DISPLAY SECTION --- */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ color: '#475569', fontWeight: '700' }}>Live Availability List</h4>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="filter-box" style={{ display: 'flex', gap: '8px', padding: '5px', flexWrap: 'wrap' }}>
                            <input type="date" className="admin-input" style={{ width: '130px' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                            <select className="admin-select" style={{ width: '110px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">All Types</option>
                                <option value="Regular">Regular</option>
                                <option value="Internal Test 1">Internal 1</option>
                                <option value="Internal Test 2">Internal 2</option>
                                <option value="Supplementary">Supplementary</option>
                            </select>
                            <button onClick={() => { setFilterDate(''); setFilterBlock(''); setFilterSession(''); setFilterType(''); }} className="btn-delete-outline" style={{ padding: '5px 12px' }}>Reset</button>
                        </div>
                        <button onClick={generatePDF} style={{ padding: '8px 15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Download PDF</button>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2d3748', color: 'white' }}>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Date & Day</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Exam Type</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Session</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Block</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Room</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Capacity</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredRooms.length > 0 ? sortedAndFilteredRooms.map((room) => {
                                const { dayName, dateNum } = formatDateParts(room.date);
                                const typeStyle = getExamTypeStyles(room.exam_type);
                                return (
                                    <tr key={room.id} style={{ 
                                        borderBottom: '1px solid #edf2f7',
                                        backgroundColor: room.session === 'FN' ? '#fff' : '#fcfcfc'
                                    }}>
                                        <td style={{ padding: '15px', borderLeft: room.session === 'FN' ? '4px solid #2b6cb0' : '4px solid #c05621' }}>
                                            <div style={{ fontWeight: '800', color: '#2b6cb0', fontSize: '13px' }}>{dayName}</div>
                                            <div style={{ fontSize: '11px', color: '#718096' }}>{dateNum}</div>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', 
                                                backgroundColor: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`
                                            }}>
                                                {room.exam_type || 'Regular'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', 
                                                backgroundColor: room.session === 'FN' ? '#ebf8ff' : '#fffaf0', 
                                                color: room.session === 'FN' ? '#2b6cb0' : '#c05621' 
                                            }}>
                                                {room.session}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', color: '#4a5568', fontWeight: '500' }}>{room.block}</td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontWeight: '700', color: '#1e293b' }}>
                                                {room.room_no}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <strong>{room.capacity}</strong> <small style={{ color: '#94a3b8' }}>Seats</small>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <button onClick={() => handleRemoveRoom(room.id)} className="btn-delete-outline" style={{ fontSize: '12px' }}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No schedules found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ClassroomSetup;