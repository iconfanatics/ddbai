import { Outlet, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Dashboard({ role }: { role: string }) {
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/profile', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.email) {
        setUserProfile(data);
      }
    })
    .catch(err => console.error(err));
  }, []);
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    `block px-4 py-2 rounded ${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}`;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-gray-800">
          VisaSync {role.charAt(0).toUpperCase() + role.slice(1)}
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavLink end to={`/${role}`} className={getNavLinkClass}>Dashboard</NavLink>
          {role === 'admin' && (
            <>
              <NavLink to="/admin/organizations" className={getNavLinkClass}>Organizations</NavLink>
              <NavLink to="/admin/agents" className={getNavLinkClass}>Agents</NavLink>
              <NavLink to="/admin/routes" className={getNavLinkClass}>Visa Routes</NavLink>
              <NavLink to="/admin/centers" className={getNavLinkClass}>Visa Centers</NavLink>
              <NavLink to="/admin/reports" className={getNavLinkClass}>Reports</NavLink>
            </>
          )}
          {role === 'agent' && (
            <>
                            <NavLink to="/agent/clients" className={getNavLinkClass}>Clients</NavLink>
              <NavLink to="/agent/slots" className={getNavLinkClass}>Slot Monitoring</NavLink>
              <NavLink to="/agent/bookings" className={getNavLinkClass}>Booking Queue</NavLink>
              <NavLink to="/agent/wallet" className={getNavLinkClass}>My Wallet</NavLink>
            </>
          )}
        </nav>
        
        {/* User Info & Logout Button */}
        <div className="p-4 border-t border-gray-800">
          {userProfile && (
            <div className="mb-3 px-2">
              <div className="text-sm font-semibold truncate" title={`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()}>
                {`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'User'}
              </div>
              <div className="text-xs text-gray-400 truncate" title={userProfile.email}>
                {userProfile.email}
              </div>
            </div>
          )}
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }} 
            className="w-full block px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-left font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

