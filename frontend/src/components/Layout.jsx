import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  LayoutDashboard,
  Folder,
  LogOut,
  Sun,
  Moon,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ChatBot from "./ChatBot";
import GlobalSearch from "./GlobalSearch";
import "./Layout.scss";

const Layout = ({ children }) => {
  const { logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      {/* Sidebar Desktop / Bottom Nav Mobile */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <img src="/newlogo.png" alt="logo" className={isCollapsed ? 'logo-small' : ''} />
            {!isCollapsed && (
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                title={isDarkMode ? "Mode clair" : "Mode sombre"}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="icon">
              <LayoutDashboard size={20} />
            </span>
            <span className="text">Dashboard</span>
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="icon">
              <Folder size={20} />
            </span>
            <span className="text">Projets</span>
          </NavLink>
          <NavLink
            to="/commercial"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="icon">
              <Users size={20} />
            </span>
            <span className="text">Commercial</span>
          </NavLink>

          {/* Theme toggle for mobile */}
          <button
            onClick={toggleTheme}
            className="nav-link theme-toggle-mobile"
          >
            <span className="icon">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </span>
            <span className="text">{isDarkMode ? "Clair" : "Sombre"}</span>
          </button>

          <button onClick={handleLogout} className="nav-link logout-btn">
            <span className="icon">
              <LogOut size={20} />
            </span>
            <span className="text">Déconnexion</span>
          </button>
        </nav>

        {/* Toggle button for desktop */}
        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Agrandir la barre" : "Réduire la barre"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${isCollapsed ? 'expanded' : ''}`}>
        {/* Barre de recherche globale */}
        <div className="global-search-container">
          <GlobalSearch />
        </div>

        {children}
      </main>

      {/* Assistant IA */}
      <ChatBot />
    </div>
  );
};

export default Layout;
