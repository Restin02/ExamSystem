import React, { useState, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ClassroomSetup = ({ roomList = [], token, fetchData }) => {
    // 1. Header & Room Input State (Combined for single submission)
    const [roomInput, setRoomInput] = useState({
        date: new Date().toISOString().split('T')[0],
        session: 'FN',
        exam_type: 'Regular',
        block: 'AB Block',
        room_no: '',
        capacity: ''
    });

    // 2. Options
    const [blocks, setBlocks] = useState(['AB Block', 'CLC Block']);
    const [newBlockInput, setNewBlockInput] = useState('');
    
    // 3. Filters
    const [filterDate, setFilterDate] = useState('');
    const [filterType, setFilterType] = useState(''); 

    const getExamTypeStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('internal')) return { color: '#4a5568', bg: '#f1f5f9', border: '#cbd5e1' };
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

    const sortedAndFilteredRooms = useMemo(() => {
        if (!Array.isArray(roomList)) return [];

        return [...roomList]
            .filter(room => {
                const matchesDate = !filterDate || room.date === filterDate;
                const matchesType = !filterType || room.exam_type === filterType;
                return matchesDate && matchesType;
            })
            .sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : 0;
                const dateB = b.date ? new Date(b.date) : 0;
                if (dateA !== dateB) return dateA - dateB;

                const sessionA = a.session || '';
                const sessionB = b.session || '';
                return sessionB.localeCompare(sessionA);
            });
    }, [roomList, filterDate, filterType]);

    const handleAddBlock = () => {
        if (newBlockInput.trim() && !blocks.includes(newBlockInput.trim())) {
            const updatedBlocks = [...blocks, newBlockInput.trim()];
            setBlocks(updatedBlocks);
            setRoomInput({ ...roomInput, block: newBlockInput.trim() });
            setNewBlockInput('');
        }
    };

    // Corrected: Directly saves one classroom at a time
    const handleSingleSave = async (e) => {
        e.preventDefault();
        if (!roomInput.room_no || !roomInput.capacity) {
            alert("Please enter Room Number and Capacity");
            return;
        }
        
        try {
            const payload = {
                date: roomInput.date,
                session: roomInput.session,
                exam_type: roomInput.exam_type, 
                block: roomInput.block,
                room_no: roomInput.room_no,
                capacity: parseInt(roomInput.capacity, 10)
            };

            await axios.post('http://127.0.0.1:8000/api/admin/insert-room/', payload, {
                headers: { 'Authorization': `Token ${token}` }
            });

            alert(`Room ${roomInput.room_no} created successfully!`);
            // Reset only the room specific fields, keep date/session for next entry
            setRoomInput({ ...roomInput, room_no: '', capacity: '' });
            fetchData();
        } catch (err) {
            console.error("Save Error:", err);
            alert("Error: Could not create room. " + (err.response?.data?.error || ""));
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

    const generatePDF = () => {
        const doc = new jsPDF('landscape');
        doc.setFontSize(18);
        doc.text("CLASSROOM ALLOCATION REPORT", 148, 15, { align: "center" });
        const tableColumn = ["Date", "Day", "Exam Type", "Session", "Block", "Room No", "Capacity"];
        const tableRows = sortedAndFilteredRooms.map(room => {
            const { dayName, dateNum } = formatDateParts(room.date);
            return [dateNum, dayName, room.exam_type, room.session, room.block, room.room_no, room.capacity];
        });
        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 25, theme: 'grid' });
        doc.save(`Classroom_Setup_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="tab-section" style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
            <h3 style={{ color: '#1a202c', fontWeight: '800', textAlign: 'center', marginBottom: '30px' }}>
                🏫 Classroom & Session Setup
            </h3>

            {/* Input Section */}
            <div style={{ maxWidth: '1100px', margin: '0 auto 20px', backgroundColor: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid #edf2f7', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <form onSubmit={handleSingleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #f7fafc' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '5px' }}>EXAM DATE</label>
                            <input type="date" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={roomInput.date} onChange={e => setRoomInput({...roomInput, date: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '5px' }}>EXAM TYPE</label>
                            <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={roomInput.exam_type} onChange={e => setRoomInput({...roomInput, exam_type: e.target.value})}>
                                <option value="Regular">Regular</option>
                                <option value="Internal Test 1">Internal Test 1</option>
                                <option value="Internal Test 2">Internal Test 2</option>
                                <option value="Supplementary">Supplementary</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '5px' }}>SESSION</label>
                            <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={roomInput.session} onChange={e => setRoomInput({...roomInput, session: e.target.value})}>
                                <option value="FN">FN</option>
                                <option value="AN">AN</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800' }}>BLOCK</label>
                            <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} value={roomInput.block} onChange={e => setRoomInput({...roomInput, block: e.target.value})}>
                                {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800' }}>+ NEW BLOCK</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <input type="text" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} placeholder="Name" value={newBlockInput} onChange={e => setNewBlockInput(e.target.value)} />
                                <button type="button" onClick={handleAddBlock} style={{ padding: '8px', background: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800' }}>ROOM NO</label>
                            <input type="text" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} placeholder="301" value={roomInput.room_no} onChange={e => setRoomInput({...roomInput, room_no: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800' }}>CAPACITY</label>
                            <input type="number" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} placeholder="30" value={roomInput.capacity} onChange={e => setRoomInput({...roomInput, capacity: e.target.value})} />
                        </div>
                        <button type="submit" style={{ backgroundColor: '#2d3748', color: 'white', padding: '11px', borderRadius: '8px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
                            ✅ Create Room
                        </button>
                    </div>
                </form>
            </div>

            {/* List Table */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ color: '#475569', fontWeight: '700' }}>Live Schedule</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="date" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                        <select style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">All Types</option>
                            <option value="Regular">Regular</option>
                            <option value="Internal Test 1">Internal Test 1</option>
                            <option value="Internal Test 2">Internal Test 2</option>
                            <option value="Supplementary">Supplementary</option>
                        </select>
                        <button onClick={() => { setFilterDate(''); setFilterType(''); }} style={{ background: '#cbd5e1', border: 'none', padding: '0 15px', borderRadius: '6px', cursor: 'pointer' }}>Reset</button>
                        <button onClick={generatePDF} style={{ padding: '8px 15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Download PDF</button>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2d3748', color: 'white' }}>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Type</th>
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
                                    <tr key={room.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: '800', color: '#2b6cb0', fontSize: '13px' }}>{dayName}</div>
                                            <div style={{ fontSize: '11px', color: '#718096' }}>{dateNum}</div>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', backgroundColor: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}>
                                                {room.exam_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', backgroundColor: room.session === 'FN' ? '#ebf8ff' : '#fffaf0', color: room.session === 'FN' ? '#2b6cb0' : '#c05621' }}>
                                                {room.session}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px' }}>{room.block}</td>
                                        <td style={{ padding: '15px' }}><strong>{room.room_no}</strong></td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>{room.capacity}</td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <button onClick={() => handleRemoveRoom(room.id)} style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#a0aec0' }}>No records found matching filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ClassroomSetup;