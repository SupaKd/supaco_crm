import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Folder, BarChart3, LogOut } from 'lucide-react';
import './Layout.scss';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar Desktop / Bottom Nav Mobile */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Project Manager</h2>
          <p className="user-name">{user?.name}</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="icon"><LayoutDashboard size={20} /></span>
            <span className="text">Dashboard</span>
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="icon"><Folder size={20} /></span>
            <span className="text">Projets</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="icon"><BarChart3 size={20} /></span>
            <span className="text">Statistiques</span>
          </NavLink>
          <button onClick={handleLogout} className="nav-link logout-btn">
            <span className="icon"><LogOut size={20} /></span>
            <span className="text">Déconnexion</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;