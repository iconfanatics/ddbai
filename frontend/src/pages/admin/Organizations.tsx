import { useState, useEffect } from 'react';

interface Organization {
  id: string;
  name: string;
  isActive: boolean;
}

export default function Organizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editActive, setEditActive] = useState(false);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const res = await fetch('/api/admin/organizations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch');
      setOrgs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newOrgName) return;
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ name: newOrgName })
      });
      if (!res.ok) throw new Error('Failed to create');
      setNewOrgName('');
      setShowModal(false);
      fetchOrgs();
    } catch (e) {
      console.error(e);
      alert('Failed to create organization');
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${editId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ name: editName, isActive: editActive })
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditModal(false);
      fetchOrgs();
    } catch (e) {
      console.error(e);
      alert('Failed to update organization');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return;
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchOrgs();
    } catch (e) {
      console.error(e);
      alert('Failed to delete organization');
    }
  };

  const openEdit = (org: Organization) => {
    setEditId(org.id);
    setEditName(org.name);
    setEditActive(org.isActive);
    setEditModal(true);
  };

  return (
    <div className="p-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Organizations</h1>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          Add Organization
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : orgs.map((org) => (
              <tr key={org.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.id.split('-')[0]}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{org.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${org.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {org.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button onClick={() => openEdit(org)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                  <button onClick={() => handleDelete(org.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create Organization</h2>
            <input 
              className="w-full border p-2 rounded mb-4" 
              placeholder="Organization Name" 
              value={newOrgName} 
              onChange={e => setNewOrgName(e.target.value)} 
            />
            <div className="flex justify-end space-x-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleCreate}>Save</button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Edit Organization</h2>
            <input 
              className="w-full border p-2 rounded mb-4" 
              placeholder="Organization Name" 
              value={editName} 
              onChange={e => setEditName(e.target.value)} 
            />
            <label className="flex items-center space-x-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} />
              <span>Active</span>
            </label>
            <div className="flex justify-end space-x-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleUpdate}>Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
