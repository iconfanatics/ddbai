import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminOverview from './pages/admin/AdminOverview';
import Organizations from './pages/admin/Organizations';
import Agents from './pages/admin/Agents';
import RoutesConfig from './pages/admin/RoutesConfig';
import CentersConfig from './pages/admin/CentersConfig';
import ReportsDashboard from './pages/admin/ReportsDashboard';
import AgentDashboard from './pages/agent/AgentDashboard';
import Clients from './pages/agent/Clients';
import SlotMonitoring from './pages/agent/SlotMonitoring';
import BookingQueue from './pages/agent/BookingQueue';
import AgentWallet from './pages/agent/AgentWallet';
import CustomerPortal from './pages/customer/CustomerPortal';



const ProtectedRoute = ({ allowedRole }: { allowedRole: string }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRole && role !== allowedRole) {
    // If they are an agent trying to access admin, send to agent. Vice versa.
    return <Navigate to={`/${role}`} replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin" />}>
          <Route element={<Dashboard role="admin" />}>
          <Route index element={<AdminOverview />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="agents" element={<Agents />} />
          <Route path="routes" element={<RoutesConfig />} />
          <Route path="centers" element={<CentersConfig />} />
          <Route path="reports" element={<ReportsDashboard />} />
          </Route>
        </Route>

        {/* Agent Routes */}
        <Route path="/agent" element={<ProtectedRoute allowedRole="agent" />}>
          <Route element={<Dashboard role="agent" />}>
          <Route index element={<AgentDashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="slots" element={<SlotMonitoring />} />
          <Route path="bookings" element={<BookingQueue />} />
          <Route path="wallet" element={<AgentWallet />} />
          </Route>
        </Route>

        {/* Customer Routes */}
        <Route path="/customer/*" element={<CustomerPortal />} />

        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
