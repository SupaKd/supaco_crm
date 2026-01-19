import { useState, useEffect } from 'react';
import { projectsAPI } from '../services/api';
import Loader from '../components/Loader';
import { StatusPieChart, BudgetBarChart, ProjectsTimelineChart, StatCard } from '../components/Charts';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';
import './Analytics.scss';

const Analytics = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Erreur chargement projets:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const stats = {
      total: projects.length,
      devis: projects.filter(p => p.status === 'devis').length,
      en_cours: projects.filter(p => p.status === 'en_cours').length,
      termine: projects.filter(p => p.status === 'termine').length,
      annule: projects.filter(p => p.status === 'annule').length
    };

    const totalBudget = projects
      .filter(p => p.budget)
      .reduce((sum, p) => sum + parseFloat(p.budget), 0);

    const averageBudget = totalBudget / projects.filter(p => p.budget).length || 0;

    const projectsWithDeadline = projects.filter(p => p.deadline);
    const upcomingDeadlines = projectsWithDeadline.filter(p => {
      const deadline = new Date(p.deadline);
      const now = new Date();
      const diff = deadline - now;
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 jours
    }).length;

    const clients = [...new Set(projects.map(p => p.client_name))].length;

    const avgProjectDuration = () => {
      const completed = projects.filter(p => p.status === 'termine');
      if (completed.length === 0) return 0;

      const durations = completed.map(p => {
        const start = new Date(p.created_at);
        const end = new Date(p.updated_at);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // jours
      });

      return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    };

    const completionRate = stats.total > 0
      ? Math.round((stats.termine / stats.total) * 100)
      : 0;

    return {
      ...stats,
      totalBudget,
      averageBudget,
      upcomingDeadlines,
      clients,
      avgDuration: avgProjectDuration(),
      completionRate
    };
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  const stats = calculateStats();

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Statistiques & Rapports</h1>
          <p>Vue d'ensemble de vos projets et performances</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <StatCard
          title="Total Projets"
          value={stats.total}
          subtitle={`${stats.en_cours} en cours`}
          icon={BarChart3}
          color="#3b82f6"
        />
        <StatCard
          title="Budget Total"
          value={`${stats.totalBudget.toFixed(0)}€`}
          subtitle={`Moyenne: ${stats.averageBudget.toFixed(0)}€`}
          icon={DollarSign}
          color="#10b981"
        />
        <StatCard
          title="Taux de Complétion"
          value={`${stats.completionRate}%`}
          subtitle={`${stats.termine} projets terminés`}
          icon={CheckCircle}
          color="#8b5cf6"
        />
        <StatCard
          title="Clients Uniques"
          value={stats.clients}
          subtitle="Clients actifs"
          icon={Users}
          color="#f59e0b"
        />
        <StatCard
          title="Deadlines à Venir"
          value={stats.upcomingDeadlines}
          subtitle="Dans les 30 prochains jours"
          icon={Calendar}
          color="#ef4444"
        />
        <StatCard
          title="Durée Moyenne"
          value={`${stats.avgDuration}j`}
          subtitle="Temps projet moyen"
          icon={Clock}
          color="#06b6d4"
        />
      </div>

      {/* Graphiques */}
      <div className="charts-section">
        <div className="chart-card">
          <h2>Répartition par Statut</h2>
          <StatusPieChart data={stats} />
        </div>

        <div className="chart-card full-width">
          <h2>Évolution des Projets</h2>
          <ProjectsTimelineChart projects={projects} />
        </div>

        <div className="chart-card full-width">
          <h2>Top 10 Budgets</h2>
          <BudgetBarChart projects={projects} />
        </div>
      </div>

      {/* Insights */}
      <div className="insights-section">
        <h2>Analyses</h2>
        <div className="insights-grid">
          {stats.en_cours > stats.termine && (
            <div className="insight info">
              <TrendingUp size={20} />
              <div>
                <h4>Projets en cours dominants</h4>
                <p>
                  Vous avez {stats.en_cours} projets en cours contre {stats.termine} terminés.
                  Concentrez-vous sur l'achèvement des projets existants.
                </p>
              </div>
            </div>
          )}

          {stats.upcomingDeadlines > 0 && (
            <div className="insight warning">
              <Calendar size={20} />
              <div>
                <h4>Deadlines approchantes</h4>
                <p>
                  {stats.upcomingDeadlines} projet(s) ont une deadline dans les 30 prochains jours.
                  Planifiez votre temps en conséquence.
                </p>
              </div>
            </div>
          )}

          {stats.devis > 5 && (
            <div className="insight success">
              <CheckCircle size={20} />
              <div>
                <h4>Opportunités en attente</h4>
                <p>
                  Vous avez {stats.devis} devis en cours.
                  C'est le moment de relancer vos clients potentiels!
                </p>
              </div>
            </div>
          )}

          {stats.completionRate > 70 && (
            <div className="insight success">
              <TrendingUp size={20} />
              <div>
                <h4>Excellent taux de complétion!</h4>
                <p>
                  {stats.completionRate}% de vos projets sont terminés.
                  Vous maintenez un excellent rythme de livraison!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
