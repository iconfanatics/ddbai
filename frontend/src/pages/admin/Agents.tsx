import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  email: string;
  org: string;
  status: string;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [orgs, setOrgs] = useState<{id: string, name: string}[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [orgId, setOrgId] = useState('');

  // Edit states
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editActive, setEditActive] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchOrgs();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('http://localhost:3001/admin/agents', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch');
      setAgents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgs = async () => {
    try {
      const res = await fetch('http://localhost:3001/admin/organizations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch');
      setOrgs(data);
      if (data.length > 0) setOrgId(data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvite = async () => {
    if (!email || !orgId) return;
    try {
      const res = await fetch('http://localhost:3001/admin/agents/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ email, orgId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      alert(data.message);
      setShowModal(false);
      setEmail('');
      fetchAgents();
    } catch (e: any) {
      console.error(e);
      alert('Failed to invite agent: ' + e.message);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      const res = await fetch(`http://localhost:3001/admin/agents/${editId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ isActive: editActive })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setEditModal(false);
      fetchAgents();
    } catch (e) {
      console.error(e);
      alert('Failed to update agent status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      const res = await fetch(`http://localhost:3001/admin/agents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchAgents();
    } catch (e) {
      console.error(e);
      alert('Failed to delete agent');
    }
  };

  const openEdit = (agent: Agent) => {
    setEditId(agent.id);
    setEditActive(agent.status === 'Active');
    setEditModal(true);
  };

  return (
    <div className="p-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Agents</h1>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          Invite Agent
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : agents.map((agent) => (
              <tr key={agent.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.id.split('-')[0]}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.org}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${agent.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {agent.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button onClick={() => openEdit(agent)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                  <button onClick={() => handleDelete(agent.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Invite Agent</h2>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email"
              className="w-full border p-2 rounded mb-4" 
              placeholder="agent@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <select 
              className="w-full border p-2 rounded mb-4"
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
            >
              {orgs.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>

            <div className="flex justify-end space-x-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleInvite}>Send Invite</button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Change Status</h2>
            <label className="flex items-center space-x-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} />
              <span>Active (Can Login)</span>
            </label>
            <div className="flex justify-end space-x-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleUpdateStatus}>Update Status</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
