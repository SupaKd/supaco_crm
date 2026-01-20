import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, Folder, BarChart3, Calendar, LogOut, Sun, Moon } from 'lucide-react';
import './Layout.scss';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
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
          <div className="sidebar-header-top">
            <h2>Project Manager</h2>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
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
          <NavLink to="/calendar" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="icon"><Calendar size={20} /></span>
            <span className="text">Calendrier</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="icon"><BarChart3 size={20} /></span>
            <span className="text">Statistiques</span>
          </NavLink>

          {/* Theme toggle for mobile */}
          <button onClick={toggleTheme} className="nav-link theme-toggle-mobile">
            <span className="icon">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</span>
            <span className="text">{isDarkMode ? 'Clair' : 'Sombre'}</span>
          </button>

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
