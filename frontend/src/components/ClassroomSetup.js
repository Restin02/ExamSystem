import React, { useState } from 'react';
import axios from 'axios';

const ClassroomSetup = ({ roomList, token, fetchData }) => {
    // 1. States for Form and Dynamic Blocks
    const [roomForm, setRoomForm] = useState({ 
        block: 'AB Block', 
        room_no: '', 
        capacity: '', 
        date: new Date().toISOString().split('T')[0] // Default to today
    });

    const [blocks, setBlocks] = useState(['AB Block', 'CLC Block']);
    const [newBlockInput, setNewBlockInput] = useState('');
    
    // 2. States for Filtering the display area
    const [filterDate, setFilterDate] = useState('');
    const [filterBlock, setFilterBlock] = useState('');

    const handleAddBlock = () => {
        if (newBlockInput && !blocks.includes(newBlockInput)) {
            setBlocks([...blocks, newBlockInput]);
            setRoomForm({ ...roomForm, block: newBlockInput });
            setNewBlockInput('');
        }
    };

    const handleRoomInsert = async (e) => {
        e.preventDefault();
        
        // We use the current state 'roomForm' directly in the POST request
        try {
            await axios.post('http://127.0.0.1:8000/api/admin/insert-room/', roomForm, {
                headers: { 'Authorization': `Token ${token}` }
            });
            alert("Room saved successfully!");
            
            // Clear only room number and capacity, keep block/date for faster entry
            setRoomForm({ ...roomForm, room_no: '', capacity: '' }); 
            fetchData();
        } catch (err) { 
            console.error(err);
            alert("Error saving room. Check if the backend Model has the 'date' field."); 
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

    // FILTER LOGIC
    const filteredRooms = roomList.filter(room => {
        const matchesDate = !filterDate || room.date === filterDate;
        const matchesBlock = !filterBlock || room.block === filterBlock;
        return matchesDate && matchesBlock;
    });

    return (
        <div className="tab-section">
            <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Classroom Setup</h3>

            {/* --- INSERTION FORM --- */}
            <form className="admin-form" onSubmit={handleRoomInsert} style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    
                    <div style={{ flex: '1', minWidth: '150px' }}>
                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Date</label>
                        <input type="date" style={{ width: '100%', padding: '8px' }} value={roomForm.date} onChange={e => setRoomForm({...roomForm, date: e.target.value})} required />
                    </div>

                    <div style={{ flex: '1', minWidth: '150px' }}>
                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Select Block</label>
                        <select style={{ width: '100%', padding: '8px' }} value={roomForm.block} onChange={e => setRoomForm({...roomForm, block: e.target.value})}>
                            {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>

                    <div style={{ borderLeft: '2px solid #dee2e6', paddingLeft: '15px' }}>
                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>+ New Block</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="Block Name" value={newBlockInput} onChange={e => setNewBlockInput(e.target.value)} style={{ width: '100px', padding: '8px' }} />
                            <button type="button" onClick={handleAddBlock} style={{ padding: '8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>Add</button>
                        </div>
                    </div>

                    <div style={{ flex: '1', minWidth: '100px' }}>
                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Room No</label>
                        <input type="text" style={{ width: '100%', padding: '8px' }} value={roomForm.room_no} onChange={e => setRoomForm({...roomForm, room_no: e.target.value})} required />
                    </div>

                    <div style={{ flex: '1', minWidth: '100px' }}>
                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Capacity</label>
                        <input type="number" style={{ width: '100%', padding: '8px' }} value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} required />
                    </div>

                    <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Save Room</button>
                </div>
            </form>

            <hr style={{ margin: '40px 0', opacity: '0.2' }} />

            {/* --- FILTER & DISPLAY SECTION --- */}
            <div className="display-section">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ margin: 0, color: '#2c3e50', fontSize: '1.2rem' }}>View All Rooms</h4>
        
        {/* --- MATCHED FILTER STYLE --- */}
        <div style={{ display: 'flex', gap: '15px', background: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #eef2f7', alignItems: 'flex-end' }}>
            
            <div style={{ minWidth: '150px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '5px', color: '#444' }}>Filter Date</label>
                <input 
                    type="date" 
                    style={{ width: '100%', padding: '8px', border: '1px solid #dfe6e9', borderRadius: '5px' }} 
                    value={filterDate} 
                    onChange={e => setFilterDate(e.target.value)} 
                />
            </div>

            <div style={{ minWidth: '150px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '5px', color: '#444' }}>Filter Block</label>
                <select 
                    style={{ width: '100%', padding: '8px', border: '1px solid #dfe6e9', borderRadius: '5px', background: 'white' }} 
                    value={filterBlock} 
                    onChange={e => setFilterBlock(e.target.value)}
                >
                    <option value="">All Blocks</option>
                    {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>

            <button 
                onClick={() => { setFilterDate(''); setFilterBlock(''); }} 
                style={{ 
                    padding: '9px 15px', 
                    background: '#6c757d', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                }}
            >
                Reset
            </button>
        </div>
    </div>

    {/* --- TABLE SECTION --- */}
    <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #eee' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 1 }}>
                <tr>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', color: '#555', fontSize: '14px' }}>Date</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', color: '#555', fontSize: '14px' }}>Block</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', color: '#555', fontSize: '14px' }}>Room</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', color: '#555', fontSize: '14px' }}>Capacity</th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#555', fontSize: '14px' }}>Action</th>
                </tr>
            </thead>
            <tbody>
                {filteredRooms.length > 0 ? filteredRooms.map((room) => (
                    <tr key={room.id} style={{ borderBottom: '1px solid #f1f1f1' }} className="table-row-hover">
                        <td style={{ padding: '12px 15px' }}>{room.date || '---'}</td>
                        <td style={{ padding: '12px 15px' }}>
                             <span style={{ background: '#e3f2fd', color: '#1976d2', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                {room.block}
                             </span>
                        </td>
                        <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#2c3e50' }}>{room.room_no}</td>
                        <td style={{ padding: '12px 15px' }}>{room.capacity} Seats</td>
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                            <button 
                                onClick={() => handleRemoveRoom(room.id)}
                                style={{ 
                                    background: '#fff5f5', 
                                    color: '#ff4d4d', 
                                    border: '1px solid #ff4d4d', 
                                    padding: '6px 12px', 
                                    borderRadius: '4px', 
                                    cursor: 'pointer',
                                    transition: '0.2s'
                                }}
                                onMouseOver={(e) => { e.target.style.background = '#ff4d4d'; e.target.style.color = 'white'; }}
                                onMouseOut={(e) => { e.target.style.background = '#fff5f5'; e.target.style.color = '#ff4d4d'; }}
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#95a5a6', fontStyle: 'italic' }}>
                            No rooms found matching your search.
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

export default ClassroomSetup;