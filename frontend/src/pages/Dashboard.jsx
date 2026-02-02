import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { projectsAPI, tasksAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import Loader from "../components/Loader";
import QuickNotes from "../components/QuickNotes";
import {
  BarChart3,
  Calendar,
  Plus,
  Folder,
  AlertTriangle,
  Clock,
  ArrowRight,
  Instagram,
  Globe,
  CheckCircle2,
  Circle,
} from "lucide-react";
import "./Dashboard.scss";

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    devis: 0,
    en_cours: 0,
    termine: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer tous les projets (limite haute pour le dashboard)
      const response = await projectsAPI.getAll({ limit: 1000 });
      const projectsData = response.data.data || [];
      setProjects(projectsData);
      calculateStats(projectsData);

      // Récupérer toutes les tâches de tous les projets
      const allTasks = [];
      for (const project of projectsData) {
        try {
          const tasksResponse = await tasksAPI.getByProject(project.id);
          const projectTasks = tasksResponse.data.map((task) => ({
            ...task,
            project_name: project.name,
            project_id: project.id,
          }));
          allTasks.push(...projectTasks);
        } catch (error) {
          console.error(
            `Erreur chargement tâches du projet ${project.id}:`,
            error
          );
        }
      }
      setTasks(allTasks);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projectsData) => {
    const stats = {
      total: projectsData.length,
      devis: projectsData.filter((p) => p.status === "devis").length,
      en_cours: projectsData.filter((p) => p.status === "en_cours").length,
      termine: projectsData.filter((p) => p.status === "termine").length,
    };
    setStats(stats);
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="dashboard">
      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="dashboard-main">
          {/* Actions rapides */}
          <div className="quick-actions">
            <h3>Actions rapides</h3>
            <div className="actions-grid">
              <Link to="/projects/new" className="action-card">
                <div
                  className="action-icon"
                  style={{ backgroundColor: "#dbeafe" }}
                >
                  <Plus size={22} color="#3b82f6" />
                </div>
                <span>Nouveau projet</span>
              </Link>
              <Link to="/projects" className="action-card">
                <div
                  className="action-icon"
                  style={{ backgroundColor: "#fef3c7" }}
                >
                  <Folder size={22} color="#f59e0b" />
                </div>
                <span>Mes projets</span>
              </Link>
              <Link to="/calendar" className="action-card">
                <div
                  className="action-icon"
                  style={{ backgroundColor: "#d1fae5" }}
                >
                  <Calendar size={22} color="#10b981" />
                </div>
                <span>Calendrier</span>
              </Link>
              <Link to="/analytics" className="action-card">
                <div
                  className="action-icon"
                  style={{ backgroundColor: "#ede9fe" }}
                >
                  <BarChart3 size={22} color="#8b5cf6" />
                </div>
                <span>Statistiques</span>
              </Link>
            </div>
          </div>

          {/* Deadlines à venir */}
          <div className="today-deadlines">
            <h3>
              <Clock size={18} />
              Deadlines à venir
            </h3>
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const nextWeek = new Date(today);
              nextWeek.setDate(nextWeek.getDate() + 7);

              const upcomingDeadlines = projects
                .filter((p) => {
                  if (!p.deadline || p.status === "termine") return false;
                  const deadline = new Date(p.deadline);
                  deadline.setHours(0, 0, 0, 0);
                  return deadline >= today && deadline <= nextWeek;
                })
                .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

              const overdueProjects = projects.filter((p) => {
                if (!p.deadline || p.status === "termine") return false;
                const deadline = new Date(p.deadline);
                deadline.setHours(0, 0, 0, 0);
                return deadline < today;
              });

              if (
                upcomingDeadlines.length === 0 &&
                overdueProjects.length === 0
              ) {
                return (
                  <p className="no-deadlines">
                    Aucune deadline dans les 7 prochains jours
                  </p>
                );
              }

              const formatDeadline = (dateStr) => {
                const deadline = new Date(dateStr);
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                deadline.setHours(0, 0, 0, 0);
                const diff = Math.ceil(
                  (deadline - todayDate) / (1000 * 60 * 60 * 24)
                );

                if (diff < 0) return `${Math.abs(diff)}j de retard`;
                if (diff === 0) return "Aujourd'hui";
                if (diff === 1) return "Demain";
                return `Dans ${diff}j`;
              };

              return (
                <div className="deadlines-list">
                  {overdueProjects.map((project) => (
                    <Link
                      to={`/projects/${project.id}`}
                      key={project.id}
                      className="deadline-item overdue"
                    >
                      <div className="deadline-icon">
                        <AlertTriangle size={16} />
                      </div>
                      <div className="deadline-info">
                        <span className="deadline-name">{project.name}</span>
                        <span className="deadline-client">
                          {project.client_name}
                        </span>
                      </div>
                      <span className="deadline-date overdue">
                        {formatDeadline(project.deadline)}
                      </span>
                    </Link>
                  ))}
                  {upcomingDeadlines.slice(0, 5).map((project) => (
                    <Link
                      to={`/projects/${project.id}`}
                      key={project.id}
                      className="deadline-item"
                    >
                      <div className="deadline-icon">
                        <Calendar size={16} />
                      </div>
                      <div className="deadline-info">
                        <span className="deadline-name">{project.name}</span>
                        <span className="deadline-client">
                          {project.client_name}
                        </span>
                      </div>
                      <span className="deadline-date">
                        {formatDeadline(project.deadline)}
                      </span>
                    </Link>
                  ))}
                  {(upcomingDeadlines.length > 5 ||
                    overdueProjects.length > 0) && (
                    <Link to="/calendar" className="view-all-deadlines">
                      Voir tout le calendrier <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Tâches en cours */}
          <div className="tasks-widget">
            <h3>
              <CheckCircle2 size={18} />
              Tâches en cours
            </h3>
            {(() => {
              const pendingTasks = tasks.filter((t) => t.status !== "termine");

              if (pendingTasks.length === 0) {
                return <p className="no-tasks">Aucune tâche en cours</p>;
              }

              return (
                <div className="tasks-list">
                  {pendingTasks.slice(0, 10).map((task) => (
                    <Link
                      to={`/projects/${task.project_id}`}
                      key={task.id}
                      className="task-item"
                    >
                      <div className="task-checkbox">
                        <Circle size={16} />
                      </div>
                      <div className="task-info">
                        <span className="task-title">{task.title}</span>
                        <span className="task-project">
                          {task.project_name}
                        </span>
                      </div>
                      {task.priority && (
                        <span
                          className={`task-priority priority-${task.priority}`}
                        >
                          {task.priority === "haute"
                            ? "Haute"
                            : task.priority === "moyenne"
                            ? "Moyenne"
                            : "Basse"}
                        </span>
                      )}
                    </Link>
                  ))}
                  {pendingTasks.length > 10 && (
                    <div className="view-all-tasks">
                      +{pendingTasks.length - 10} autre
                      {pendingTasks.length - 10 > 1 ? "s" : ""} tâche
                      {pendingTasks.length - 10 > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="dashboard-sidebar">
          {/* Statistiques du mois */}
          <div className="stats-widget">
            <h3>Statistiques du mois</h3>
            <div className="stats-overview">
              <div className="stat-item">
                <div className="stat-circle devis">
                  <span>{stats.devis}</span>
                </div>
                <div className="stat-details">
                  <span className="stat-label">Devis en attente</span>
                  <span className="stat-percentage">
                    {stats.total > 0
                      ? Math.round((stats.devis / stats.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-circle en-cours">
                  <span>{stats.en_cours}</span>
                </div>
                <div className="stat-details">
                  <span className="stat-label">En cours</span>
                  <span className="stat-percentage">
                    {stats.total > 0
                      ? Math.round((stats.en_cours / stats.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-circle termine">
                  <span>{stats.termine}</span>
                </div>
                <div className="stat-details">
                  <span className="stat-label">Terminés</span>
                  <span className="stat-percentage">
                    {stats.total > 0
                      ? Math.round((stats.termine / stats.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-label">
                <span>Taux de complétion</span>
                <span className="progress-value">
                  {stats.total > 0
                    ? Math.round((stats.termine / stats.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      stats.total > 0 ? (stats.termine / stats.total) * 100 : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Notes rapides */}
          <QuickNotes />

          {/* Liens sociaux professionnels */}
          <div className="professional-links">
            <h3>Restons connectés</h3>
            <div className="links-container">
              <a
                href="https://instagram.com/supa_c0"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link instagram"
              >
                <div className="link-icon">
                  <Instagram size={20} />
                </div>
                <div className="link-content">
                  <span className="link-title">Instagram</span>
                  <span className="link-subtitle">@supa_c0</span>
                </div>
              </a>
              <a
                href="https://supaco-digital.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link website"
              >
                <div className="link-icon">
                  <Globe size={20} />
                </div>
                <div className="link-content">
                  <span className="link-title">Site Web</span>
                  <span className="link-subtitle">supaco-digital.com</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
