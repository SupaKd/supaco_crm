import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  LayoutDashboard,
  Folder,
  LogOut,
  Sun,
  Moon,
  Users,
} from "lucide-react";
import "./Layout.scss";

const Layout = ({ children }) => {
  const { logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      {/* Sidebar Desktop / Bottom Nav Mobile */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <img src="/newlogo.png" alt="logo" />
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={isDarkMode ? "Mode clair" : "Mode sombre"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
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
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
