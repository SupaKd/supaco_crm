import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import './Charts.scss';

// Couleurs cohérentes avec le thème
const COLORS = {
  devis: '#f59e0b',
  en_cours: '#3b82f6',
  termine: '#10b981',
  annule: '#ef4444'
};

// Graphique en camembert pour les statuts
export const StatusPieChart = ({ data }) => {
  const chartData = [
    { name: 'Devis', value: data.devis, color: COLORS.devis },
    { name: 'En cours', value: data.en_cours, color: COLORS.en_cours },
    { name: 'Terminés', value: data.termine, color: COLORS.termine },
    { name: 'Annulés', value: data.annule || 0, color: COLORS.annule }
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return <div className="chart-empty">Aucune donnée à afficher</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Graphique en barres pour les budgets par projet
export const BudgetBarChart = ({ projects }) => {
  const chartData = projects
    .filter(p => p.budget && p.budget > 0)
    .slice(0, 10)
    .map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      budget: parseFloat(p.budget),
      status: p.status
    }))
    .sort((a, b) => b.budget - a.budget);

  if (chartData.length === 0) {
    return <div className="chart-empty">Aucun budget défini sur les projets</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip formatter={(value) => `${value}€`} />
          <Bar dataKey="budget" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Graphique linéaire pour l'évolution des projets
export const ProjectsTimelineChart = ({ projects }) => {
  // Grouper les projets par mois
  const projectsByMonth = {};

  projects.forEach(project => {
    const date = new Date(project.created_at);
    const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

    if (!projectsByMonth[monthYear]) {
      projectsByMonth[monthYear] = {
        month: monthYear,
        total: 0,
        devis: 0,
        en_cours: 0,
        termine: 0
      };
    }

    projectsByMonth[monthYear].total++;
    projectsByMonth[monthYear][project.status]++;
  });

  const chartData = Object.values(projectsByMonth)
    .sort((a, b) => {
      const [monthA, yearA] = a.month.split('/');
      const [monthB, yearB] = b.month.split('/');
      return new Date(yearA, monthA - 1) - new Date(yearB, monthB - 1);
    })
    .slice(-6); // 6 derniers mois

  if (chartData.length === 0) {
    return <div className="chart-empty">Pas assez de données pour afficher l'évolution</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
          <Line type="monotone" dataKey="en_cours" stroke="#10b981" name="En cours" />
          <Line type="monotone" dataKey="termine" stroke="#6b7280" name="Terminés" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Statistiques avancées (KPIs)
export const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => {
  return (
    <div className="stat-card-advanced">
      <div className="stat-icon" style={{ backgroundColor: `${color}20` }}>
        <Icon size={24} color={color} />
      </div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <h2 className="stat-value">{value}</h2>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
        {trend && (
          <div className={`stat-trend ${trend.type}`}>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
};
