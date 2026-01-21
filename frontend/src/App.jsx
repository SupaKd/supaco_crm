import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import ProjectDetails from './pages/ProjectDetails';
import Analytics from './pages/Analytics';
import CalendarPage from './pages/CalendarPage';
import Commercial from './pages/Commercial';
import './styles/global.scss';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Routes publiques */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Routes protégées */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/projects" element={
              <PrivateRoute>
                <Layout>
                  <Projects />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/projects/new" element={
              <PrivateRoute>
                <Layout>
                  <NewProject />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/projects/:id" element={
              <PrivateRoute>
                <Layout>
                  <ProjectDetails />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/analytics" element={
              <PrivateRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/calendar" element={
              <PrivateRoute>
                <Layout>
                  <CalendarPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/commercial" element={
              <PrivateRoute>
                <Layout>
                  <Commercial />
                </Layout>
              </PrivateRoute>
            } />

            {/* Redirection par défaut */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
